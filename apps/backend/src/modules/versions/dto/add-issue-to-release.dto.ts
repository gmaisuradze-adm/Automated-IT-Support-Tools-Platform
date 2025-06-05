import { IsString, IsNotEmpty } from 'class-validator';

export class AddIssueToReleaseDto {
  @IsString()
  @IsNotEmpty()
  issueId: string;
}
