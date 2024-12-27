import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createStatisticDto } from './dto/createStatistic.dto';
import { v4 as uuidv4 } from 'uuid';
import { Cron } from '@nestjs/schedule';
import { StatisticPageOptionsDto } from './dto/getStatistics.dto';
import Decimal from 'decimal.js';

@Injectable()
export class StatisticService {
  constructor(private readonly prismaService: PrismaService) {}

  async createDailyStatistic(createStatisticDto: createStatisticDto) {
    try {
      const { day, month, year } = createStatisticDto;
      const start = new Date(year, month - 1, day);
      const end = new Date(year, month - 1, day + 1);
      const totalOrder = await this.prismaService.orders.count({
        where: {
          updated_at: {
            gte: start,
            lt: end,
          },
          status: 'SUCCESS',
        },
      });
      if (totalOrder == 0) {
        const newStatistic = await this.prismaService.statistic.create({
          data: {
            id: uuidv4(),
            day: day,
            month: month,
            year: year,
            total_order: totalOrder,
            total_revenue: 0,
          },
        });
        return newStatistic;
      }
      const totalRevenue = await this.prismaService.orders.groupBy({
        by: ['status'],
        _sum: { total_price: true },
        where: {
          updated_at: {
            gte: start,
            lt: end,
          },
          status: 'SUCCESS',
        },
      });
      const newStatistic = await this.prismaService.statistic.create({
        data: {
          id: uuidv4(),
          day: day,
          month: month,
          year: year,
          total_order: totalOrder,
          total_revenue: totalRevenue[0]._sum.total_price,
        },
      });
      return newStatistic;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  @Cron('0 59 23 * * *')
  async scheduleDailyStatistics() {
    try {
      const today = new Date();
      const todayStart = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate(),
      );
      const todayEnd = new Date(
        today.getFullYear(),
        today.getMonth(),
        today.getDate() + 1,
      );
      const totalOrder = await this.prismaService.orders.count({
        where: {
          updated_at: {
            gte: todayStart,
            lt: todayEnd,
          },
          status: 'SUCCESS',
        },
      });
      if (totalOrder == 0) {
        const newStatistic = await this.prismaService.statistic.create({
          data: {
            id: uuidv4(),
            day: today.getDate(),
            month: today.getMonth() + 1,
            year: today.getFullYear(),
            total_order: totalOrder,
            total_revenue: 0,
          },
        });
        return newStatistic;
      }
      const totalRevenue = await this.prismaService.orders.groupBy({
        by: ['status'],
        _sum: { total_price: true },
        where: {
          updated_at: {
            gte: todayStart,
            lt: todayEnd,
          },
          status: 'SUCCESS',
        },
      });
      const newStatistic = await this.prismaService.statistic.create({
        data: {
          id: uuidv4(),
          day: today.getDate(),
          month: today.getMonth() + 1,
          year: today.getFullYear(),
          total_order: totalOrder,
          total_revenue: totalRevenue[0]._sum.total_price,
        },
      });
      return newStatistic;
    } catch (error) {
      throw new Error(error.message);
    }
  }
  async getStatistics(query: StatisticPageOptionsDto) {
    const { take, sortBy1, sortBy2, sortBy3, order, skip } = query;
    const statistics = await this.prismaService.statistic.findMany({
      where: {
        day: query.day === 0 ? undefined : query.day,
        month: query.month === 0 ? undefined : query.month,
        year: query.year === 0 ? undefined : query.year,
      },
      skip: skip,
      take: take,
      orderBy: [
        { [sortBy1]: order },
        { [sortBy2]: order },
        { [sortBy3]: order },
      ],
    });
    const itemCount = await this.prismaService.statistic.count();
    return { statistics, itemCount };
  }
  async getBestSellerProduct() {
    const bestSellerProduct = await this.prismaService.products.findMany({
      orderBy: [{ sold_quantity: 'desc' }],
      take: 5,
      where: {
        status: 'ACTIVE',
        sold_quantity: { gte: 1 },
      },
      include: {
        Category: true,
      },
    });
    return bestSellerProduct;
  }
  async getSoldProduct(query: StatisticPageOptionsDto) {
    const { start, end } = query;

    const orders = await this.prismaService.orders.findMany({
      where: {
        updated_at: {
          gte: start,
          lt: end,
        },
        status: 'SUCCESS',
      },
      include: {
        OrderItems: {
          include: {
            product: true,
          },
        },
      },
    });

    const orderItems = orders.map((item) => item.OrderItems);
    const orderItemFlatMap = orderItems.flatMap((orderItem) => orderItem);
    const result = orderItemFlatMap.reduce((acc, current) => {
      const existingProduct = acc.find(
        (item) => item.product_id === current.product_id,
      );

      if (existingProduct) {
        existingProduct.quantity += current.quantity;
      } else {
        acc.push({
          ...current,
          quantity: current.quantity,
        });
      }

      return acc;
    }, []);

    result.sort((a, b) => b.quantity - a.quantity);

    return result;
  }

  async getTotalCustomerBought() {
    const result = await this.prismaService.users.count({
      where: {
        Orders: {
          some: {
            status: 'SUCCESS',
          },
        },
      },
    });
    return result;
  }

  async createStatistic(total_price: Decimal) {
    try {
      const today = new Date();
      const day = today.getDate();
      const month = today.getMonth() + 1;
      const year = today.getFullYear();

      const statistic = await this.prismaService.statistic.findFirst({
        where: {
          day: day,
          month: month,
          year: year,
        },
      });

      if (!statistic) {
        await this.prismaService.statistic.create({
          data: {
            id: uuidv4(),
            day: day,
            month: month,
            year: year,
            total_order: 1,
            total_revenue: total_price,
          },
        });
      } else {
        await this.prismaService.statistic.update({
          where: {
            id: statistic.id,
          },
          data: {
            total_order: statistic.total_order + 1,
            total_revenue: statistic.total_revenue.plus(total_price),
          },
        });
      }
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
