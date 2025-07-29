import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);
  
  getHello(): string {
    return 'Hello World!';
  }

  @Cron('*/14 * * * *')
  logStatus() {
    this.logger.log('A API está funcionando');
  }
}
