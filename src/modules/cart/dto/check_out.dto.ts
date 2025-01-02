import { IsNotEmpty, IsString } from 'class-validator';

export class CheckOutDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;
  @IsString()
  @IsNotEmpty()
  shippingAddress: string;
  @IsString()
  @IsNotEmpty()
  phone: string;
}
