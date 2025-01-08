import { IsArray, IsOptional, IsString } from 'class-validator';

export class UpdateProductDto {
  @IsString({ message: 'Title is string' })
  @IsOptional({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsOptional({ message: 'categoryId is required' })
  categoryId: string;

  @IsString()
  @IsOptional()
  price: string;

  @IsString()
  description: string;
  @IsArray()
  @IsOptional()
  image_url?: string[];
}
