import { IsString, IsOptional, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateQuickReplyDto {
  @ApiPropertyOptional({ description: 'Shortcut command (must start with /)', example: '/greet' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^\//, { message: 'Shortcut must start with /' })
  shortcut?: string;

  @ApiPropertyOptional({ description: 'Quick reply title', minLength: 1, maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title?: string;

  @ApiPropertyOptional({ description: 'Quick reply body text', minLength: 1 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body?: string;
}
