import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailerService {
  private transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST!,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! },
  });

  async sendEmailVerification(to: string, token: string) {
    const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
    await this.transporter.sendMail({
      from: process.env.MAIL_FROM || 'no-reply@seuapp.com',
      to,
      subject: 'Verifique seu e-mail',
      html: `
        <p>Confirme seu e-mail clicando no link abaixo:</p>
        <p><a href="${verifyUrl}" target="_blank">Verificar e-mail</a></p>
        <p>Link expira em 24 horas.</p>
      `,
    });
  }
}
