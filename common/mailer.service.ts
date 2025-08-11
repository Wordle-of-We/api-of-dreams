import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

type MailMode = 'console' | 'ethereal' | 'smtp' | 'resend';

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
    const raw = (process.env.MAIL_MODE ?? 'console').toLowerCase();
    this.mode = (['console', 'ethereal', 'smtp', 'resend'].includes(raw)
      ? (raw as MailMode)
      : 'console');

    this.ready = this.bootstrap();
  }

  private getFromAddress() {
    return process.env.MAIL_FROM || 'Wordle of Dreams <no-reply@local.test>';
  }

  private async bootstrap(): Promise<void> {
    try {
      if (this.mode === 'console') {
        this.logger.log('Mailer em modo CONSOLE – e-mails não serão enviados (apenas log).');
        return;
      }

      if (this.mode === 'resend') {
        if (!process.env.RESEND_API_KEY) {
          this.logger.error('MAIL_MODE=resend, mas RESEND_API_KEY não foi definido.');
        } else {
          this.logger.log('Mailer em modo RESEND – usando a API do Resend para envio de e-mails.');
        }
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

        this.logger.log(
          `Ethereal pronto. User: ${account.user} | Preview será impresso no log após envio.`
        );
        return;
      }

      const host = process.env.SMTP_HOST;
      const port = Number(process.env.SMTP_PORT || 587);
      const secure = process.env.SMTP_SECURE === 'true';
      const user = process.env.SMTP_USER;
      const pass = process.env.SMTP_PASS;

      if (!host) {
        this.logger.error('MAIL_MODE=smtp, mas SMTP_HOST não foi definido.');
      }

      this.transporter = nodemailer.createTransport({
        host: host!,
        port,
        secure,
        auth: user ? { user, pass: pass! } : undefined,
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 20000,
        logger: process.env.NODE_ENV !== 'production',
        debug: process.env.NODE_ENV !== 'production',
      });

      try {
        await this.transporter.verify();
        this.logger.log('Transport SMTP real inicializado e verificado.');
      } catch (verr) {
        this.logger.warn('SMTP inicializado, mas verify() falhou (pode ser temporário): ' + (verr as any)?.message);
      }
    } catch (err) {
      this.logger.error('Falha ao inicializar Mailer', err as any);
    }
  }

  private async sendWithResend(to: string, subject: string, html: string) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('RESEND_API_KEY não configurado.');
    }

    const from = this.getFromAddress();
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    });

    if (!resp.ok) {
      const body = await resp.text();
      throw new Error(`[Resend] ${resp.status} ${resp.statusText}: ${body}`);
    }
    return resp.json();
  }

  async sendEmailVerification(to: string, token: string): Promise<SendResult> {
    await this.ready;

    const apiUrl = process.env.API_URL || 'http://localhost:3000';
    const verifyUrl = `${apiUrl}/auth/verify-email?token=${token}&email=${encodeURIComponent(to)}`;
    const subject = 'Verifique seu e-mail';
    const html = `
      <p>Confirme seu e-mail clicando no link abaixo:</p>
      <p><a href="${verifyUrl}" target="_blank" rel="noopener noreferrer">Verificar e-mail</a></p>
      <p>Link expira em 24 horas.</p>
    `;

    if (this.mode === 'console') {
      this.logger.warn(`(DEV) Email verification URL: ${verifyUrl}`);
      return { messageId: null, previewUrl: verifyUrl };
    }

    if (this.mode === 'resend') {
      try {
        const r = await this.sendWithResend(to, subject, html);
        this.logger.log(`[Mailer] Resend OK: ${JSON.stringify(r)}`);
        return { messageId: r?.id ?? null };
      } catch (err) {
        this.logger.error('Falha ao enviar e-mail via Resend', err as any);
        this.logger.warn(`(DEV) Email verification URL: ${verifyUrl}`);
        return { messageId: null, previewUrl: verifyUrl };
      }
    }

    if (!this.transporter) {
      this.logger.error('Transporter não inicializado — e-mail não enviado.');
      this.logger.warn(`(DEV) Email verification URL: ${verifyUrl}`);
      return { messageId: null, previewUrl: verifyUrl };
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.getFromAddress(),
        to,
        subject,
        html,
      });

      const previewRaw = nodemailer.getTestMessageUrl(info);
      const previewUrl = previewRaw ? String(previewRaw) : null;

      if (previewUrl) {
        this.logger.warn(`Preview (Ethereal): ${previewUrl}`);
      }

      return { messageId: info.messageId || null, previewUrl };
    } catch (err) {
      this.logger.error('Falha ao enviar e-mail (SMTP/Ethereal)', err as any);
      this.logger.warn(`(DEV) Email verification URL: ${verifyUrl}`);
      return { messageId: null, previewUrl: verifyUrl };
    }
  }
}
