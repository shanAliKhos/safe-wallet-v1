import { Injectable, Logger } from '@nestjs/common';

interface RateLimitConfig {
  requestsPerSecond: number;
  requestsPerMinute: number;
  maxConcurrent: number;
}

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  
  private readonly configs: Map<string, RateLimitConfig> = new Map([
    ['bsc', { requestsPerSecond: 5, requestsPerMinute: 200, maxConcurrent: 3 }],
    ['eth', { requestsPerSecond: 5, requestsPerMinute: 200, maxConcurrent: 3 }],
    ['polygon', { requestsPerSecond: 10, requestsPerMinute: 300, maxConcurrent: 5 }],
    ['avalanche', { requestsPerSecond: 5, requestsPerMinute: 200, maxConcurrent: 3 }],
    ['arbitrum', { requestsPerSecond: 5, requestsPerMinute: 200, maxConcurrent: 3 }],
    ['optimism', { requestsPerSecond: 5, requestsPerMinute: 200, maxConcurrent: 3 }],
    ['default', { requestsPerSecond: 5, requestsPerMinute: 100, maxConcurrent: 3 }],
  ]);
  
  private readonly timestamps: Map<string, number[]> = new Map();
  private readonly activeCalls: Map<string, number> = new Map();
  
  async waitForSlot(chainCode: string): Promise<void> {
    const config = this.configs.get(chainCode) || this.configs.get('default')!;
    
    // Wait for available concurrent slot
    while ((this.activeCalls.get(chainCode) || 0) >= config.maxConcurrent) {
      await this.sleep(100);
    }
    
    // Wait for rate limit
    while (!this.canMakeRequest(chainCode, config)) {
      await this.sleep(100);
    }
    
    // Record request
    this.recordRequest(chainCode);
  }
  
  private canMakeRequest(chainCode: string, config: RateLimitConfig): boolean {
    const now = Date.now();
    const timestamps = this.timestamps.get(chainCode) || [];
    
    // Remove old timestamps
    const recent = timestamps.filter(ts => now - ts < 60000);
    this.timestamps.set(chainCode, recent);
    
    // Check per-second limit
    const lastSecond = recent.filter(ts => now - ts < 1000);
    if (lastSecond.length >= config.requestsPerSecond) {
      return false;
    }
    
    // Check per-minute limit
    if (recent.length >= config.requestsPerMinute) {
      return false;
    }
    
    return true;
  }
  
  private recordRequest(chainCode: string): void {
    const timestamps = this.timestamps.get(chainCode) || [];
    timestamps.push(Date.now());
    this.timestamps.set(chainCode, timestamps);
    
    const active = this.activeCalls.get(chainCode) || 0;
    this.activeCalls.set(chainCode, active + 1);
  }
  
  releaseSlot(chainCode: string): void {
    const active = this.activeCalls.get(chainCode) || 0;
    this.activeCalls.set(chainCode, Math.max(0, active - 1));
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
