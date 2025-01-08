import { ProductTemplateDto } from './product_template_dto';

export class OrderItemTemplateDto {
  id: string;
  order_id: string;
  quantity: number;
  price: number;
  product: ProductTemplateDto;
}
