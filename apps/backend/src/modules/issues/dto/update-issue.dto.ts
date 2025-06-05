import { IsString, IsEnum, IsOptional, IsArray, IsDateString } from 'class-validator';
import { IssueType, Priority, IssueStatus } from '@prisma/client';

export class UpdateIssueDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(IssueType)
  @IsOptional()
  type?: IssueType;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsEnum(IssueStatus)
  @IsOptional()
  status?: IssueStatus;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];

  @IsDateString()
  @IsOptional()
  closedAt?: string;
}
