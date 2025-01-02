import { Module } from '@nestjs/common';
import { CartController } from './cart.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CartsService } from './cart.service';
import { OrdersModule } from '../order/order.module';
import { OrderService } from '../order/order.service';
import { ChatbotModule } from '../chatbot/chatbot.module';

@Module({
  providers: [CartsService, OrderService],
  controllers: [CartController],
  imports: [PrismaModule, OrdersModule, ChatbotModule],
  exports: [CartsService],
})
export class CartsModule {}
