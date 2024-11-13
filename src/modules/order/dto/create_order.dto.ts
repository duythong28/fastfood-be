import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsNumber,
  IsPhoneNumber,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  bookId: string;

  @IsNumber()
  @IsNotEmpty()
  @IsPositive()
  @Min(1)
  quantity: number;
}

export class CreateOrderDto {
  @IsArray()
  @IsNotEmpty({ message: 'items must not be empty' })
  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsString({ message: 'full name is not valid' })
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsPhoneNumber('VN', { message: 'Phone number is not valid' })
  @IsNotEmpty()
  phoneNumber: string;

  @IsNotEmpty({ message: 'Address must not be empty ' })
  @IsString()
  address: string;
}
