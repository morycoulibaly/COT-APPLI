import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { GoogleProfile } from './strategies/google.strategy';
import { EmailService } from './email.service';

const SALT_ROUNDS = 10;
const CODE_TTL_MINUTES = 15;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly emailService: EmailService,
  ) {}

  // Inscription classique : le compte est créé mais reste non-vérifié (emailVerified: false)
  // tant que l'utilisateur n'a pas saisi le code reçu par email. Aucun token n'est délivré ici.
  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    await this.assertPasswordNotPwned(dto.password);

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
      },
    });

    await this.generateAndSendCode(user.id, user.email);

    return { email: user.email };
  }

  // Vérifie le mot de passe contre la base "Have I Been Pwned" via le modèle
  // k-anonymity : seuls les 5 premiers caractères du hash SHA-1 sont envoyés,
  // jamais le mot de passe ni son empreinte complète. Si l'API tierce est
  // indisponible, on n'empêche pas l'inscription (indisponibilité tierce
  // ≠ mot de passe compromis).
  private async assertPasswordNotPwned(password: string) {
    try {
      const sha1 = createHash('sha1').update(password).digest('hex').toUpperCase();
      const prefix = sha1.slice(0, 5);
      const suffix = sha1.slice(5);

      const res = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
      if (!res.ok) return;

      const text = await res.text();
      const isPwned = text.split('\n').some((line) => line.split(':')[0].trim() === suffix);

      if (isPwned) {
        throw new BadRequestException(
          'Ce mot de passe est apparu dans une fuite de données connue. Veuillez en choisir un autre.',
        );
      }
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      // Erreur réseau vers l'API tierce : on laisse l'inscription se poursuivre.
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      // !user.passwordHash couvre le cas d'un compte créé uniquement via Google
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    if (!user.emailVerified) {
      // Code structuré (pas juste un message) pour que le frontend puisse détecter
      // ce cas précis et rediriger vers l'écran de vérification plutôt que d'afficher
      // une simple erreur générique.
      throw new UnauthorizedException({
        message: 'Veuillez vérifier votre email avant de vous connecter.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    return this.buildAuthResponse(user.id, user.email, user.fullName);
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.verificationCode || !user.verificationCodeExpiresAt) {
      throw new BadRequestException('Aucune vérification en attente pour cet email.');
    }

    if (user.verificationCodeExpiresAt < new Date()) {
      throw new BadRequestException('Ce code a expiré. Demandez-en un nouveau.');
    }

    if (user.verificationCode !== dto.code) {
      throw new BadRequestException('Code incorrect.');
    }

    const verifiedUser = await this.prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true, verificationCode: null, verificationCodeExpiresAt: null },
    });

    return this.buildAuthResponse(verifiedUser.id, verifiedUser.email, verifiedUser.fullName);
  }

  async resendCode(dto: ResendCodeDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    // On ne révèle pas si l'email existe ou non (évite l'énumération de comptes) :
    // la réponse est identique dans tous les cas.
    if (user && !user.emailVerified) {
      await this.generateAndSendCode(user.id, user.email);
    }
    return { message: 'Si un compte existe, un code a été envoyé.' };
  }

  private async generateAndSendCode(userId: string, email: string) {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

    await this.prisma.user.update({
      where: { id: userId },
      data: { verificationCode: code, verificationCodeExpiresAt: expiresAt },
    });

    try {
      await this.emailService.sendVerificationCode(email, code);
    } catch (err) {
      // On ne fait PAS échouer l'inscription pour un souci ponctuel d'envoi :
      // le code est déjà enregistré en base, l'utilisateur peut toujours cliquer
      // sur "renvoyer le code" depuis l'écran de vérification. Mieux vaut ça
      // qu'une 500 après un long chargement, sans qu'il sache ce qui s'est passé.
      this.logger.error("Échec d'envoi du code de vérification", err);
    }
  }

  // Connexion/inscription via Google. Règle métier :
  // - googleId déjà connu -> connexion directe
  // - email inconnu -> création d'un nouveau compte (sans mot de passe local, déjà vérifié
  //   puisque Google a déjà validé la propriété de cet email)
  // - email connu MAIS via un compte mot de passe (pas encore lié à Google) -> on refuse
  //   et on demande à l'utilisateur de se connecter avec son mot de passe.
  async loginWithGoogle(googleProfile: GoogleProfile) {
    const byGoogleId = await this.prisma.user.findUnique({
      where: { googleId: googleProfile.googleId },
    });
    if (byGoogleId) return byGoogleId;

    const byEmail = await this.prisma.user.findUnique({ where: { email: googleProfile.email } });
    if (byEmail) {
      throw new ConflictException(
        'Un compte existe déjà avec cette adresse email. Veuillez vous connecter avec votre mot de passe.',
      );
    }

    return this.prisma.user.create({
      data: {
        email: googleProfile.email,
        fullName: googleProfile.fullName,
        googleId: googleProfile.googleId,
        emailVerified: true,
      },
    });
  }

  signExchangeCode(userId: string) {
    return this.jwtService.sign({ sub: userId, purpose: 'google-exchange' }, { expiresIn: '60s' });
  }

  async exchangeGoogleCode(code: string) {
    let payload: { sub: string; purpose: string };
    try {
      payload = this.jwtService.verify(code);
    } catch {
      throw new UnauthorizedException('Ce lien de connexion a expiré, veuillez réessayer.');
    }
    if (payload.purpose !== 'google-exchange') {
      throw new UnauthorizedException('Code invalide.');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) throw new UnauthorizedException();

    return this.buildAuthResponse(user.id, user.email, user.fullName);
  }

  async getUserById(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, fullName: user.fullName };
  }

  private buildAuthResponse(userId: string, email: string, fullName: string) {
    const accessToken = this.jwtService.sign({ sub: userId, email });
    return {
      accessToken,
      user: { id: userId, email, fullName },
    };
  }
}