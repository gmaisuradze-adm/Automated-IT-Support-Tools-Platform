import { IsOptional, IsString, IsNumber, IsBoolean } from 'class-validator';

export class SystemSettingsDto {
  @IsOptional()
  @IsString()
  siteName?: string;

  @IsOptional()
  @IsString()
  siteUrl?: string;

  @IsOptional()
  @IsString()
  adminEmail?: string;

  @IsOptional()
  @IsString()
  smtpHost?: string;

  @IsOptional()
  @IsNumber()
  smtpPort?: number;

  @IsOptional()
  @IsString()
  smtpUser?: string;

  @IsOptional()
  @IsString()
  smtpPassword?: string;

  @IsOptional()
  @IsBoolean()
  smtpSecure?: boolean;

  @IsOptional()
  @IsBoolean()
  maintenanceMode?: boolean;

  @IsOptional()
  @IsString()
  maintenanceMessage?: string;

  @IsOptional()
  @IsNumber()
  sessionTimeout?: number;

  @IsOptional()
  @IsNumber()
  maxLoginAttempts?: number;

  @IsOptional()
  @IsNumber()
  lockoutDuration?: number;

  @IsOptional()
  @IsBoolean()
  enableRegistration?: boolean;

  @IsOptional()
  @IsBoolean()
  enableNotifications?: boolean;

  @IsOptional()
  @IsString()
  defaultUserRole?: string;

  @IsOptional()
  @IsString()
  backupRetentionDays?: string;

  @IsOptional()
  @IsBoolean()
  enableAuditLogging?: boolean;
}
