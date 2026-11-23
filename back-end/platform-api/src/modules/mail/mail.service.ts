import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';
import type { AppConfig, MailConfig } from '@src/config/configuration';
import {
  otpEmail,
  passwordResetEmail,
  type MailContent,
} from './mail.templates';

/**
 * Outgoing mail over SMTP.
 *
 * Local development uses Mailpit (`mailpit:1025`), which captures every
 * message and shows it at <http://localhost:8025>. Staging and production
 * point the same variables at a real relay.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly config: MailConfig;
  private transporter?: Transporter;

  constructor(config: ConfigService<AppConfig, true>) {
    this.config = config.get('mail', { infer: true });
  }

  /** Sends a rendered message. Throws when SMTP rejects it. */
  async send(to: string, content: MailContent): Promise<void> {
    const transport = this.getTransporter();
    await transport.sendMail({
      from: this.config.from,
      to,
      subject: content.subject,
      text: content.text,
      html: content.html,
    });
    this.logger.log(`Mail sent to ${to}: ${content.subject}`);
  }

  async sendOtp(to: string, code: string): Promise<void> {
    await this.send(to, otpEmail(code, 5));
  }

  async sendPasswordReset(to: string, link: string): Promise<void> {
    await this.send(
      to,
      passwordResetEmail(link, this.config.passwordResetExpiryMinutes),
    );
  }

  private getTransporter(): Transporter {
    if (this.transporter) {
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      secure: this.config.secure,
      auth:
        this.config.user && this.config.password
          ? { user: this.config.user, pass: this.config.password }
          : undefined,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 20_000,
    });

    return this.transporter;
  }
}
