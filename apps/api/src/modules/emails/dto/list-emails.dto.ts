import { IsOptional, IsString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto';

export class ListEmailsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['all', 'new', 'processed', 'archived'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'new', 'processed', 'archived'])
  filter?: string = 'all';

  @ApiPropertyOptional({ enum: ['lead', 'other'] })
  @IsOptional()
  @IsIn(['lead', 'other'])
  category?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
