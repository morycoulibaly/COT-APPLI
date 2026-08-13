import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ExchangeCodeDto } from './dto/exchange-code.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ResendCodeDto } from './dto/resend-code.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser, CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { GoogleProfile } from './strategies/google.strategy';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Post('verify-email')
  verifyEmail(@Body() dto: VerifyEmailDto) {
    return this.authService.verifyEmail(dto);
  }

  @Post('resend-code')
  resendCode(@Body() dto: ResendCodeDto) {
    return this.authService.resendCode(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  me(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getUserById(user.userId);
  }

  // Déclenche la redirection vers l'écran de consentement Google.
  // Le corps de la méthode reste vide : c'est le AuthGuard('google') qui gère la redirection.
  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleAuth() {}

  // Google redirige ici après consentement. req.user contient le profil
  // renvoyé par GoogleStrategy.validate(). On ne place JAMAIS le vrai token JWT
  // dans l'URL de redirection (il finirait dans les logs serveur, l'historique
  // du navigateur, et potentiellement l'en-tête Referer). On génère à la place
  // un code d'échange à usage unique, valable 60 secondes seulement.
  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: { user: GoogleProfile }, @Res() res: Response) {
    const frontendUrl = this.config.get<string>('FRONTEND_URL') ?? 'http://localhost:3000';
    try {
      const user = await this.authService.loginWithGoogle(req.user);
      const code = this.authService.signExchangeCode(user.id);
      res.redirect(`${frontendUrl}/auth/callback?code=${code}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Connexion Google impossible';
      res.redirect(`${frontendUrl}/auth/callback?error=${encodeURIComponent(message)}`);
    }
  }

  // Appelé par le frontend juste après la redirection : échange le code temporaire
  // contre le vrai token, transmis cette fois dans le corps de la réponse (pas l'URL).
  @Post('google/exchange')
  exchangeGoogleCode(@Body() dto: ExchangeCodeDto) {
    return this.authService.exchangeGoogleCode(dto.code);
  }
}