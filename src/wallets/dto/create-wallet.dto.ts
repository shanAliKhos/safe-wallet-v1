import { IsString, IsOptional, IsUrl, MinLength, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateWalletDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  label: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  purpose?: string;

  @IsString()
  @IsOptional()
  @Transform(({ value }) => value?.trim())
  trackingId?: string;

  @IsUrl()
  @IsOptional()
  callbackUrl?: string;
}

