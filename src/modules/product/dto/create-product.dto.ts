import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateProductDto {
  @ApiProperty({
    description: 'The title of a product',
    type: String,
    required: true,
    example: 'The Great Gatsby',
  })
  @IsString({ message: 'Title is string' })
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiProperty({
    description: 'The author id of a product',
    required: true,
    example: 'Haruki Murakami',
  })
  @IsNotEmpty({ message: 'author is required' })
  author: string;

  @ApiProperty({
    description: 'The category id of a product',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId: string;
  
  @ApiProperty({
    description: 'The sale price of a product',
    required: true,
    example: '200000',
  })
  @IsString()
  @IsNotEmpty({ message: 'price is required' })
  price: string;

  @ApiProperty({
    description: 'The description of a product',
    required: true,
    example: 'This is a great product',
  })
  @IsString()
  @IsNotEmpty({ message: 'description is required' })
  description: string;
}
