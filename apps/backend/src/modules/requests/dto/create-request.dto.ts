import { IsString, IsEnum, IsOptional, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

enum RequestType {
  EQUIPMENT_REQUEST = 'EQUIPMENT_REQUEST',
  MAINTENANCE_REQUEST = 'MAINTENANCE_REQUEST',
  SOFTWARE_REQUEST = 'SOFTWARE_REQUEST',
  ACCESS_REQUEST = 'ACCESS_REQUEST',
  OTHER = 'OTHER',
}

enum Priority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

class RequestAssetDto {
  @IsString()
  assetId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateRequestDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(RequestType)
  type: RequestType;

  @IsEnum(Priority)
  priority: Priority;

  @IsOptional()
  @IsString()
  department?: string;

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RequestAssetDto)
  assets?: RequestAssetDto[];
}
