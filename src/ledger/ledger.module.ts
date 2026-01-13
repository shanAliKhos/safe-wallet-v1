import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LedgerService } from './ledger.service';
import { LedgerEntry, LedgerEntrySchema } from './schemas/ledger-entry.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: LedgerEntry.name, schema: LedgerEntrySchema },
    ]),
  ],
  providers: [LedgerService],
  exports: [LedgerService],
})
export class LedgerModule {}

