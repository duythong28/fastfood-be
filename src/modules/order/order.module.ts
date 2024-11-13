import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdersController } from './order.controller';
import { OrderService } from './order.service';

@Module({
  providers: [OrderService],
  controllers: [OrdersController],
  imports: [PrismaModule],
  exports: [OrderService],
})
export class OrdersModule {}
