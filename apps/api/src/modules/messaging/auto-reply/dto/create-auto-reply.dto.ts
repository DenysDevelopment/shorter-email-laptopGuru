import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsInt,
  MinLength,
  MaxLength,
} from 'class-validator';
import { AutoReplyTrigger } from '../../../../generated/prisma';

export class CreateAutoReplyDto {
  @IsOptional()
  @IsString()
  channelId?: string;

  @IsEnum(AutoReplyTrigger)
  trigger: AutoReplyTrigger;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  responseBody: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;
}

export class UpdateAutoReplyDto {
  @IsOptional()
  @IsString()
  channelId?: string;

  @IsOptional()
  @IsEnum(AutoReplyTrigger)
  trigger?: AutoReplyTrigger;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  keyword?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  responseBody?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsInt()
  priority?: number;
}
