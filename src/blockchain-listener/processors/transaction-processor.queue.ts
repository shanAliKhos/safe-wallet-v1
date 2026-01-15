import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TransactionProcessorService } from '../services/transaction-processor.service';

@Processor('transaction-processing')
export class TransactionProcessorQueue extends WorkerHost {
  private readonly logger = new Logger(TransactionProcessorQueue.name);

  constructor(private transactionProcessor: TransactionProcessorService) {
    super();
  }

  async process(job: Job) {
    this.logger.debug(`Processing transaction job: ${job.id}`);
    
    try {
      await this.transactionProcessor.processTransaction(job.data);
      this.logger.debug(`Successfully processed transaction job: ${job.id}`);
    } catch (error) {
      this.logger.error(`Error processing transaction job ${job.id}:`, error);
      throw error; // Will trigger retry
    }
  }
}

