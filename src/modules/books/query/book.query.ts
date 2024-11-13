import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { BOOKSTATUS } from 'src/constants/enum';
import { PageOptionsDto } from 'src/utils/page_option.dto';

export class BookQuery extends PageOptionsDto {
  @ApiProperty({
    description: 'Book title',
    required: false,
  })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Book author name',
    required: false,
  })
  @IsOptional()
  @IsString()
  author?: string;

  @ApiProperty({
    description: 'Book category name',
    required: false,
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    description: 'Book status',
    enum: BOOKSTATUS,
    required: false,
  })
  @IsOptional()
  @IsEnum(BOOKSTATUS)
  status?: BOOKSTATUS;

  @IsOptional()
  @IsNumber()
  min_star?: number;

  @IsOptional()
  @IsNumber()
  max_star?: number;

  @IsOptional()
  @IsNumber()
  min_price?: number;

  @IsOptional()
  @IsNumber()
  max_price?: number;

  @IsOptional()
  @IsString()
  search?: string;

  constructor(bookQuery: Partial<BookQuery> = {}) {
    super();
    Object.assign(this, bookQuery);
  }
}
