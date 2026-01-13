import {
  IsEthereumAddress,
  IsOptional,
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  Matches,
  ArrayNotEmpty,
  IsIn,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class RecipientDto {
  @IsNotEmpty()
  @IsEthereumAddress({ message: 'recipient must be a valid Ethereum address.' })
  @Transform(({ value }) => value?.trim())
  recipient!: string;

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
}

export class MultiSendDto {
  @IsArray()
  @ArrayNotEmpty({ message: 'recipients array cannot be empty.' })
  @ValidateNested({ each: true })
  @Type(() => RecipientDto)
  recipients!: RecipientDto[];

  @IsNotEmpty()
  @IsString()
  @IsIn(['bsc', 'eth'], { message: 'chain must be either "bsc" or "eth".' })
  chain!: 'bsc' | 'eth';
}

