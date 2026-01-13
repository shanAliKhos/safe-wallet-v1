import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, Interval, Timeout } from '@nestjs/schedule';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  // Run every day at midnight
  // @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  // handleCron() {
  //   this.logger.debug('Called every day at midnight');
  // }

  // Run every 10 seconds (example)
  // @Interval(10000)
  // handleInterval() {
  //   this.logger.debug('Called every 10 seconds');
  // }

  // Run once after 5 seconds
  // @Timeout(5000)
  // handleTimeout() {
  //   this.logger.debug('Called once after 5 seconds');
  // }
}

