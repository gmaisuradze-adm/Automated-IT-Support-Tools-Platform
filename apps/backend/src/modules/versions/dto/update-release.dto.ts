import { IsString, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class UpdateReleaseDto {
  @IsString()
  @IsOptional()
  version?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  releaseDate?: string;

  @IsBoolean()
  @IsOptional()
  isPrerelease?: boolean;

  @IsString()
  @IsOptional()
  changelog?: string;
}
