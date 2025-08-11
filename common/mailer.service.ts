import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type MailMode = 'console' | 'ethereal' | 'smtp';

interface SendResult {
  messageId: string | null;
  previewUrl?: string | null;
}

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter | null = null;
  private readonly logger = new Logger(MailerService.name);
  private readonly mode: MailMode;
  private readonly ready: Promise<void>;

  constructor() {
    this.mode = ((process.env.MAIL_MODE ?? 'console') as MailMode);
    this.ready = this.bootstrap();
  }

  private async bootstrap(): Promise<void> {
    try {
      if (this.mode === 'console') {
        this.logger.log('Mailer em modo CONSOLE – e-mails não serão enviados (apenas log).');
        return;
      }

      if (this.mode === 'ethereal') {
        const account = await nodemailer.createTestAccount();

        this.transporter = nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
          logger: process.env.NODE_ENV !== 'production',
          debug: process.env.NODE_ENV !== 'production',
        });

        this.logger.log(`Ethereal pronto. User: ${account.user} | Acompanhe o preview no link impresso após o envio.`);
        return;
      }

      this.transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST!,
        port: Number(process.env.SMTP_PORT || 587),
        secure: process.env.SMTP_SECURE === 'true',
        auth: process.env.SMTP_USER
          ? { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! }
          : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        logger: process.env.NODE_ENV !== 'production',
        debug: process.env.NODE_ENV !== 'production',
      });

      this.logger.log('Transport SMTP real inicializado.');
    } catch (err) {
      this.logger.error('Falha ao inicializar Mailer', err as any);
    }
  }

  async sendEmailVerification(to: string, token: string): Promise<SendResult> {
    await this.ready;

    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const verifyUrl = `${apiUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(to)}`;

    if (this.mode === 'console') {
      this.logger.warn(`(DEV) Email verification URL: ${verifyUrl}`);
      return { messageId: null, previewUrl: verifyUrl };
    }

    if (!this.transporter) {
      this.logger.error('Transporter não inicializado — e-mail não enviado.');
      this.logger.warn(`(DEV) Email verification URL: ${verifyUrl}`);
      return { messageId: null, previewUrl: verifyUrl };
    }

    try {
      const info = await this.transporter.sendMail({
        from: process.env.MAIL_FROM || 'Wordle of Dreams <no-reply@local.test>',
        to,
        subject: 'Verifique seu e-mail',
        html: `
          <p>Confirme seu e-mail clicando no link abaixo:</p>
          <p><a href="${verifyUrl}" target="_blank">Verificar e-mail</a></p>
          <p>Link expira em 24 horas.</p>
        `,
      });

      const previewRaw = nodemailer.getTestMessageUrl(info);
      const previewUrl = previewRaw ? String(previewRaw) : null;

      if (previewUrl) {
        this.logger.warn(`Preview (Ethereal): ${previewUrl}`);
      }

      return { messageId: info.messageId || null, previewUrl };
    } catch (err) {
      this.logger.error('Falha ao enviar e-mail', err as any);
      this.logger.warn(`(DEV) Email verification URL: ${verifyUrl}`);
      return { messageId: null, previewUrl: verifyUrl };
    }
  }
}
