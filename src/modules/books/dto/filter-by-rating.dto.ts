import { IsNotEmpty, IsNumber } from 'class-validator';

export class RatingFilterDto {
  @IsNumber()
  @IsNotEmpty()
  minRating: number;
  @IsNumber()
  @IsNotEmpty()
  maxRating: number;
}
