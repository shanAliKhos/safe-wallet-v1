import {
  IsEthereumAddress,
  IsOptional,
  IsString,
  Matches,
  IsNotEmpty,
  IsIn,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class SendDto {
  @IsNotEmpty()
  @IsEthereumAddress({ message: 'toAddress must be a valid Ethereum address.' })
  @Transform(({ value }) => value?.trim())
  toAddress!: string;

  @IsNotEmpty()
  @IsString()
  @Matches(/^(?!0*(?:\.0+)?$)\d+(\.\d+)?$/, {
    message: 'amount must be a positive decimal string.',
  })
  amount!: string;

  @IsOptional()
  @IsEthereumAddress({ message: 'tokenAddress must be a valid Ethereum address.' })
  @Transform(({ value }) => value?.trim())
  tokenAddress?: string;

  @IsNotEmpty()
  @IsString()
  @IsIn(['bsc', 'eth'], { message: 'chain must be either "bsc" or "eth".' })
  chain!: 'bsc' | 'eth';
}

