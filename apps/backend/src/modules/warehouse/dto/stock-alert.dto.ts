import { IsString, IsNumber, IsOptional } from 'class-validator';

export class StockAlertDto {
  @IsString()
  inventoryItemId: string;

  @IsString()
  message: string;

  @IsNumber()
  currentStock: number;

  @IsNumber()
  minLevel: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
