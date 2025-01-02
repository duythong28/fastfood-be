import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './order.controller';
import { OrderService } from './order.service';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { StatisticModule } from '../statistic/statistic.module';

@Module({
  imports: [PrismaModule, ChatbotModule, StatisticModule],
  providers: [OrderService],
  controllers: [OrdersController],
  exports: [OrderService],
})
export class OrdersModule {}
