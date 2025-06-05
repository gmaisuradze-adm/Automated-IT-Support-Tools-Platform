import { IsString } from 'class-validator';

export class AssetAssignmentDto {
  @IsString()
  assignedToId: string;
}
