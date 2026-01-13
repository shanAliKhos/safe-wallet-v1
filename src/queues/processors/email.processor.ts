import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  private readonly logger = new Logger(EmailProcessor.name);

  async process(job: Job<{ to: string; subject: string; body: string }>) {
    this.logger.log(`Processing email job ${job.id} to ${job.data.to}`);
    
    // Simulate email sending
    this.logger.log(`Sending email to ${job.data.to} with subject: ${job.data.subject}`);
    
    // In a real application, you would integrate with an email service here
    // e.g., SendGrid, AWS SES, Nodemailer, etc.
    
    return { success: true, jobId: job.id };
  }
}

