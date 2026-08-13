import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly config: ConfigService) {}

  // Utilise l'API HTTP de Brevo (port 443) plutôt que du SMTP classique (port 465/587) :
  // Render et la plupart des hébergeurs cloud bloquent ou throttle les ports SMTP sortants,
  // ce qui provoquait un timeout de ~60s puis une 500 avec Gmail SMTP. L'API HTTP contourne
  // entièrement ce problème.
  async sendVerificationCode(to: string, code: string) {
    const apiKey = this.config.get<string>('BREVO_API_KEY');
    const fromEmail = this.config.get<string>('EMAIL_FROM_ADDRESS');
    const fromName = this.config.get<string>('EMAIL_FROM_NAME') ?? "COT'APPLI";

    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey ?? '',
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: fromName, email: fromEmail },
        to: [{ email: to }],
        subject: `${code} — Votre code de vérification COT'APPLI`,
        htmlContent: `
          <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
            <h1 style="color: #0D3733; font-size: 20px;">Vérifiez votre email</h1>
            <p style="color: #12211F; font-size: 15px; line-height: 1.6;">
              Voici votre code de vérification pour activer votre compte COT'APPLI :
            </p>
            <div style="background: #EAF3F1; border-radius: 10px; padding: 18px; text-align: center; margin: 20px 0;">
              <span style="font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #124A44;">${code}</span>
            </div>
            <p style="color: #12211F99; font-size: 13px;">
              Ce code expire dans 15 minutes. Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.
            </p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      this.logger.error(`Échec d'envoi Brevo (${res.status}): ${body}`);
      throw new Error("L'envoi de l'email de vérification a échoué.");
    }
  }
}