import { IsString, IsArray, IsOptional } from 'class-validator';

export class UpdateRoleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  permissionIds: string[];
}
