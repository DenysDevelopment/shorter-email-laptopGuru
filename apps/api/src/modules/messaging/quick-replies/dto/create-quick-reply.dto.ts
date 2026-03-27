import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateQuickReplyDto {
  @ApiProperty({ description: 'Shortcut command (must start with /)', example: '/greet' })
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  @Matches(/^\//, { message: 'Shortcut must start with /' })
  shortcut: string;

  @ApiProperty({ description: 'Quick reply title', minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  title: string;

  @ApiProperty({ description: 'Quick reply body text', minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  body: string;
}
