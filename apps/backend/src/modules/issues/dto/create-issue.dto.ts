import { IsString, IsNotEmpty, IsEnum, IsOptional, IsArray } from 'class-validator';
import { IssueType, Priority } from '@prisma/client';

export class CreateIssueDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsEnum(IssueType)
  type: IssueType;

  @IsEnum(Priority)
  @IsOptional()
  priority?: Priority;

  @IsString()
  @IsOptional()
  assigneeId?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  labels?: string[];
}
