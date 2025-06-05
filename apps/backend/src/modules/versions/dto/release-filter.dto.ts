import { IsOptional, IsString, IsBoolean, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ReleaseFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isPrerelease?: boolean;

  @IsOptional()
  @IsDateString()
  releasedAfter?: string;

  @IsOptional()
  @IsDateString()
  releasedBefore?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;

  @IsOptional()
  @IsString()
  sortBy?: string = 'releaseDate';

  @IsOptional()
  @IsString()
  sortOrder?: 'asc' | 'desc' = 'desc';
}
