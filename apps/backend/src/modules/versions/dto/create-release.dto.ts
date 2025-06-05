import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsDateString } from 'class-validator';

export class CreateReleaseDto {
  @IsString()
  @IsNotEmpty()
  version: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  releaseDate: string;

  @IsBoolean()
  @IsOptional()
  isPrerelease?: boolean = false;

  @IsString()
  @IsOptional()
  changelog?: string;
}
