import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './order.controller';
import { OrderService } from './order.service';
import { ChatbotModule } from '../chatbot/chatbot.module';
import { StatisticModule } from '../statistic/statistic.module';
import { ConfigModule } from '@nestjs/config';
import { GeminiModule } from '../gen_ai/gemini.module';
import { EmailModule } from '../email/email.module';

@Module({
  imports: [
    PrismaModule,
    ChatbotModule,
    StatisticModule,
    ConfigModule,
    GeminiModule,
    EmailModule,
  ],
  providers: [OrderService],
  controllers: [OrdersController],
  exports: [OrderService],
})
export class OrdersModule {}
