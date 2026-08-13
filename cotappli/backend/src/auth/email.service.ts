import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly transporter: nodemailer.Transporter;
  private readonly from: string;

  constructor(private readonly config: ConfigService) {
    // SMTP Gmail : nécessite un "mot de passe d'application" (pas le mot de passe
    // Gmail habituel), généré depuis myaccount.google.com/apppasswords après
    // activation de la validation en 2 étapes.
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: this.config.get<string>('GMAIL_USER'),
        pass: this.config.get<string>('GMAIL_APP_PASSWORD'),
      },
    });
    this.from = this.config.get<string>('EMAIL_FROM') ?? this.config.get<string>('GMAIL_USER') ?? '';
  }

  async sendVerificationCode(to: string, code: string) {
    await this.transporter.sendMail({
      from: this.from,
      to,
      subject: `${code} — Votre code de vérification COT'APPLI`,
      html: `
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
    });
  }
}