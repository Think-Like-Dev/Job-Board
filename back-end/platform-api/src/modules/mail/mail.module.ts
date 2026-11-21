import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

/**
 * SMTP delivery. Depends on nothing else, so any feature module can import it
 * (auth now, invitations next).
 */
@Module({
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
