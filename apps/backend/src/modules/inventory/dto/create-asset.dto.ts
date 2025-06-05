import { IsString, IsOptional, IsNumber, IsDateString, IsEnum } from 'class-validator';
import { AssetStatus } from '@prisma/client';

export class CreateAssetDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  assetTag?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  categoryId: string;

  @IsString()
  locationId: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsNumber()
  purchasePrice?: number;

  @IsOptional()
  @IsDateString()
  warrantyExpiryDate?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
