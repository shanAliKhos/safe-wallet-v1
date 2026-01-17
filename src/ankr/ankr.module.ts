import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnkrService } from './ankr.service';
import { AnkrBaseService } from './services/ankr-base.service';
import { AnkrQueryService } from './services/ankr-query.service';
import { AnkrTokenService } from './services/ankr-token.service';
import { AnkrNftService } from './services/ankr-nft.service';

/**
 * Ankr Module
 * 
 * Provides access to all Ankr Advanced API services:
 * - AnkrService: Main unified service (maintains backward compatibility)
 * - AnkrQueryService: Blockchain queries (stats, blocks, logs, transactions)
 * - AnkrTokenService: Token operations (balance, price, holders, transfers)
 * - AnkrNftService: NFT operations (ownership, metadata, transfers)
 * - AnkrBaseService: Base HTTP client for custom implementations
 * 
 * All services are exported and can be injected into any module.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    AnkrBaseService,
    AnkrQueryService,
    AnkrTokenService,
    AnkrNftService,
    AnkrService,
  ],
  exports: [
    AnkrBaseService,
    AnkrQueryService,
    AnkrTokenService,
    AnkrNftService,
    AnkrService,
  ],
})
export class AnkrModule {}

