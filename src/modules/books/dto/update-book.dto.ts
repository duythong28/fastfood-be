import { PartialType } from '@nestjs/swagger';
import { CreateBookDto } from './create-book.dto';
import { IsArray, IsOptional } from 'class-validator';

export class UpdateBookDto extends PartialType(CreateBookDto) {
  @IsArray()
  @IsOptional()
  image_url?: string[];
}
