import { IsString, IsNotEmpty } from 'class-validator';

export class AssignIssueDto {
  @IsString()
  @IsNotEmpty()
  assigneeId: string;
}
