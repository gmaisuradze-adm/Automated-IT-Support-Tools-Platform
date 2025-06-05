import { IsString, IsOptional } from 'class-validator';

export class AssignRequestDto {
  @IsString()
  assigneeId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
