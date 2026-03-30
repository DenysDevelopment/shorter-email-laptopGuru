import { IsOptional, IsString, IsBoolean, IsEmail, IsUrl, IsIn } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmailDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail({}, { message: 'Invalid email format' })
  customerEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  customerPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({}, { message: 'Invalid product URL' })
  productUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  archived?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  processed?: boolean;

  @ApiPropertyOptional({ enum: ['lead', 'other'] })
  @IsOptional()
  @IsIn(['lead', 'other'])
  category?: string;
}
