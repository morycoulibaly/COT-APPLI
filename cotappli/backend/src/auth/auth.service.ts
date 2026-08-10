import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { GoogleProfile } from './strategies/google.strategy';

const SALT_ROUNDS = 10;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet email');
    }

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        fullName: dto.fullName,
      },
    });

    return this.buildAuthResponse(user.id, user.email, user.fullName);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (!user || !user.passwordHash) {
      // !user.passwordHash couvre le cas d'un compte créé uniquement via Google
      // (message volontairement identique à "email inconnu" pour ne pas révéler
      // quels emails existent en base)
      throw new UnauthorizedException('Identifiants invalides');
    }

    const passwordMatches = await bcrypt.compare(dto.password, user.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Identifiants invalides');
    }

    return this.buildAuthResponse(user.id, user.email, user.fullName);
  }

  // Connexion/inscription via Google. Règle métier :
  // - googleId déjà connu -> connexion directe
  // - email inconnu -> création d'un nouveau compte (sans mot de passe local)
  // - email connu MAIS via un compte mot de passe (pas encore lié à Google) -> on refuse
  //   et on demande à l'utilisateur de se connecter avec son mot de passe. Une liaison
  //   explicite ("Lier mon compte Google" depuis les paramètres du profil) pourra être
  //   ajoutée plus tard pour gérer ce cas volontairement, plutôt qu'automatiquement.
  // Retourne l'utilisateur (pas de token ici) : c'est le contrôleur qui décide comment
  // le transmettre au frontend (via un code d'échange, voir signExchangeCode ci-dessous).
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
      },
    });
  }

  // Code d'échange à usage unique et très court (60s), destiné à transiter dans l'URL
  // de redirection. Contrairement au vrai accessToken, il n'accorde aucun accès à l'API :
  // il ne sert qu'à être échangé une fois contre le vrai token via exchangeGoogleCode().
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