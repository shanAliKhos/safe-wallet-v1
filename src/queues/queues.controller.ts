import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { QueuesService } from './queues.service';
import { EmailJobDto } from './dto/email-job.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('queues')
export class QueuesController {
  constructor(private readonly queuesService: QueuesService) {}

  @UseGuards(JwtAuthGuard)
  @Post('email')
  async addEmailJob(@Body() emailJobDto: EmailJobDto) {
    const job = await this.queuesService.addEmailJob(emailJobDto);
    return {
      message: 'Email job added to queue',
      jobId: job.id,
    };
  }
}

