import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class CreateInventoryItemDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  sku?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  categoryId: string;

  @IsString()
  locationId: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsNumber()
  @Min(0)
  currentStock: number;

  @IsNumber()
  @Min(0)
  minStockLevel: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStockLevel?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  unitPrice?: number;

  @IsOptional()
  @IsString()
  unit?: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
