import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateYoutubeChannelDto {
  @ApiProperty({ example: '@laptopguru', description: 'YouTube channel handle or URL' })
  @IsString()
  @IsNotEmpty()
  handle: string;
}
