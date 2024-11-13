import { IsNotEmpty, IsNumber } from 'class-validator';

export class PriceFilterDto {
  @IsNumber()
  @IsNotEmpty()
  minPrice: number;
  @IsNumber()
  @IsNotEmpty()
  maxPrice: number;
}
