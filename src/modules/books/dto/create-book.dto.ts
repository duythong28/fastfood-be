import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class CreateBookDto {
  @ApiProperty({
    description: 'The title of a book',
    type: String,
    required: true,
    example: 'The Great Gatsby',
  })
  @IsString({ message: 'Title is string' })
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @ApiProperty({
    description: 'The author id of a book',
    required: true,
    example: 'Haruki Murakami',
  })
  @IsNotEmpty({ message: 'author is required' })
  author: string;

  @ApiProperty({
    description: 'The category id of a book',
    required: true,
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  @IsNotEmpty({ message: 'categoryId is required' })
  categoryId: string;

  @ApiProperty({
    description: 'The entry price of a book',
    required: true,
    example: '100000',
  })
  @IsString()
  @IsNotEmpty({ message: 'entryPrice is required' })
  entryPrice: string;

  @ApiProperty({
    description: 'The sale price of a book',
    required: true,
    example: '200000',
  })
  @IsString()
  @IsNotEmpty({ message: 'price is required' })
  price: string;

  @ApiProperty({
    description: 'The number of books in stock',
    required: true,
    example: 10,
  })
  @IsString()
  @IsNotEmpty({ message: 'stockQuantity is required' })
  stockQuantity: string;

  @ApiProperty({
    description: 'The description of a book',
    required: true,
    example: 'This is a great book',
  })
  @IsString()
  @IsNotEmpty({ message: 'description is required' })
  description: string;
}
