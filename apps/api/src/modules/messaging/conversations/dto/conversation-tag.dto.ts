import { IsNotEmpty, IsString } from 'class-validator';

export class ConversationTagDto {
  @IsNotEmpty()
  @IsString()
  tagId: string;
}
