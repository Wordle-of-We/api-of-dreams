import { Module } from '@nestjs/common';
import { AccessLogsService } from './access-logs.service';
import { AccessLogsController } from './access-logs.controller';

@Module({
  controllers: [AccessLogsController],
  providers: [AccessLogsService],
})
export class AccessLogsModule {}
