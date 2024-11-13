import { IsString } from 'class-validator';

export class SearchBookDto {
  @IsString()
  title?: string;
  @IsString()
  author?: string;
  @IsString()
  category?: string;
  @IsString()
  status?: string;
}
