import { Gender, Role } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUserProfileByAdmin {
  @IsNotEmpty()
  @IsString()
  id: string;
  @IsOptional()
  @IsString()
  @Min(8)
  password: string;
  @IsString()
  @IsNotEmpty()
  fullName: string;
  @IsEnum(Role)
  @IsNotEmpty()
  role: Role;
  @IsString()
  @IsNotEmpty()
  phone: string;
  @IsNotEmpty()
  @IsEnum(Gender)
  gender: Gender;
  @IsNotEmpty()
  @IsString()
  birthday: string;
}
