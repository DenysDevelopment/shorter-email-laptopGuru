import { IsOptional, IsEnum, IsString, MaxLength } from 'class-validator';
import { ConversationStatus, ConversationPriority } from '../../../../generated/prisma';

export class UpdateConversationDto {
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @IsOptional()
  @IsEnum(ConversationPriority)
  priority?: ConversationPriority;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  subject?: string;
}
