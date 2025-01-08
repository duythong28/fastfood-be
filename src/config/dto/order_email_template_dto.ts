import { PaymentMethod } from '@prisma/client';
import { OrderItemTemplateDto } from './order_item_template.dto';

export class OrderEmailTemplateDto {
  id: string;
  total_price: number;
  full_name: string;
  phone_number: string;
  address: string;
  created_at: Date;
  payment_method: PaymentMethod;
  OrderItems: OrderItemTemplateDto[];
}
