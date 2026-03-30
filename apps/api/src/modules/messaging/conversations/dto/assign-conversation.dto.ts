import { IsNotEmpty, IsString } from 'class-validator';

export class AssignConversationDto {
  @IsNotEmpty()
  @IsString()
  assigneeId: string;
}
