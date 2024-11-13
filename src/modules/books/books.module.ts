import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';
import { CategoriesModule } from '../category/category.module';

@Module({
  imports: [PrismaModule, CategoriesModule],
  providers: [BooksService],
  controllers: [BooksController],
  exports: [BooksService],
})
export class BooksModule {}
