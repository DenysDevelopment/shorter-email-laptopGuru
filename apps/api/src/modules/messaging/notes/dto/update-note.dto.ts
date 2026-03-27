import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateNoteDto {
  @ApiProperty({ description: 'Updated note body text', minLength: 1 })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  body: string;
}
