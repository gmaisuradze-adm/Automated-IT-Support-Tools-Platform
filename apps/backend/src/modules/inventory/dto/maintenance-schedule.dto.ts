import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { MaintenanceType, MaintenanceStatus } from '@prisma/client';

export class MaintenanceScheduleDto {
  @IsString()
  assetId: string;

  @IsEnum(MaintenanceType)
  type: MaintenanceType;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  scheduledDate: string;

  @IsOptional()
  @IsString()
  assignedToId?: string;

  @IsOptional()
  @IsEnum(MaintenanceStatus)
  status?: MaintenanceStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
