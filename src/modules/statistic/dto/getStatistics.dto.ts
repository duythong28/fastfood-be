import { IsString, IsNumber, IsDate } from 'class-validator';
import { PageOptionsDto } from 'src/utils/page_option.dto';

export class StatisticPageOptionsDto extends PageOptionsDto {
  @IsString()
  readonly sortBy1?: string = 'year';
  @IsString()
  readonly sortBy2?: string = 'month';
  @IsString()
  readonly sortBy3?: string = 'day';
  @IsNumber()
  day?: number = 0;
  @IsNumber()
  month?: number = 0;
  @IsNumber()
  year?: number = 0;
  @IsDate()
  start?: Date = new Date();
  @IsDate()
  end?: Date = new Date();
}
