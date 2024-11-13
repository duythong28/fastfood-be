import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TUserSession } from 'src/common/decorators/user-session.decorator';
import { OrderStatus } from '@prisma/client';
import { OrderPageOptionsDto } from './dto/find_all_order.dto';
import { CreateOrderDto } from './dto/create_order.dto';
import { CreateReviewDto } from './dto/create_review.dto';
import { ORDER_STATUS } from 'src/constants/enum';
import { UpdateOrderStatusDto } from './dto/update_order_status.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}
  async createOrder(session: TUserSession, dto: CreateOrderDto) {
    const bookIds = dto.items.map((item) => item.bookId);
    const books = await this.prisma.books.findMany({
      where: { id: { in: bookIds } },
    });
    const cart = await this.prisma.carts.findFirstOrThrow({
      where: { user_id: session.id },
    });
    const cartItems = await this.prisma.cartItems.findMany({
      where: { cart_id: cart.id, book_id: { in: bookIds } },
    });
    const cartItemIds = cartItems.map((item) => item.id);
    if (books.length !== bookIds.length) {
      throw new NotFoundException('Some books are not found');
    }
    const bookPriceMap = new Map(
      books.map((book) => [
        book.id,
        { price: book.price, finalPrice: book.final_price ?? book.price },
      ]),
    );
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.cartItems.deleteMany({
          where: {
            id: { in: cartItemIds },
          },
        });
        const order = await tx.orders.create({
          data: {
            user_id: session.id,
            full_name: dto.fullName,
            phone_number: dto.phoneNumber,
            address: dto.address,
          },
        });
        const orderItems = dto.items.map((item) => {
          const { price, finalPrice } = bookPriceMap.get(item.bookId);
          const totalPrice = Number(finalPrice) * item.quantity;
          return {
            order_id: order.id,
            book_id: item.bookId,
            quantity: item.quantity,
            price,
            total_price: totalPrice,
          };
        });
        await tx.orderItems.createMany({ data: orderItems });
        await Promise.all(
          orderItems.map((item) =>
            tx.books.update({
              where: { id: item.book_id },
              data: {
                stock_quantity: { decrement: item.quantity },
                sold_quantity: { increment: item.quantity },
              },
            }),
          ),
        );
        const totalPrice = orderItems.reduce(
          (acc, item) => acc + item.total_price,
          0,
        );
        const updatedOrder = await tx.orders.update({
          where: { id: order.id },
          data: {
            total_price: totalPrice,
          },
          include: {
            OrderItems: {
              include: {
                book: true,
              },
            },
          },
        });
        return updatedOrder;
      });
    } catch (error) {
      console.log('Error:', error);
      throw new Error('Failed to create order');
    }
  }
  async getListOrders(query: OrderPageOptionsDto) {
    const { take, order, sortBy } = query;
    const orders = await this.prisma.orders.findMany({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.search && {
          id: { contains: query.search, mode: 'insensitive' },
        }),
      },
      skip: query.skip,
      take: take,
      orderBy: { [sortBy]: order },
      include: {
        OrderItems: {
          include: {
            book: true,
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            full_name: true,
          },
        },
      },
    });
    const itemCount = await this.prisma.orders.count({
      where: {
        ...(query.status && { status: query.status }),
        ...(query.search && {
          id: { contains: query.search, mode: 'insensitive' },
        }),
      },
    });
    return { orders, itemCount };
  }
  async getOrderProductsByUser(id: string, session: TUserSession) {
    const order = await this.prisma.orders.findUnique({
      where: { user_id: session.id, id: id },
      include: {
        OrderItems: {
          include: {
            book: true,
          },
        },
      },
    });
    return order;
  }
  async getListOrdersByUser(query: OrderPageOptionsDto, session: TUserSession) {
    const { take, order, sortBy } = query;
    const orders = await this.prisma.orders.findMany({
      where: {
        user_id: session.id,
        ...(query.status && { status: query.status }),
        ...(query.search && {
          id: { contains: query.search, mode: 'insensitive' },
        }),
      },
      skip: query.skip,
      take: take,
      orderBy: { [sortBy]: order },
      include: {
        OrderItems: {
          include: {
            book: true,
          },
        },
      },
    });
    const itemCount = await this.prisma.orders.count({
      where: {
        user_id: session.id,
        ...(query.status && { status: query.status }),
        ...(query.search && {
          id: { contains: query.search, mode: 'insensitive' },
        }),
      },
    });
    return { orders, itemCount };
  }
  async updateOrderStatus(id: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.orders.findUnique({
      where: { id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (
      order.status === ORDER_STATUS.CANCELLED ||
      order.status === ORDER_STATUS.REJECT
    ) {
      throw new BadRequestException('Order already cancelled or rejected');
    }
    if (dto.status === ORDER_STATUS.REJECT) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          const updatedOrder = await tx.orders.update({
            where: { id },
            data: { status: dto.status },
          });
          return updatedOrder;
        });
      } catch (error) {
        console.log(error);
        throw new BadRequestException('Failed to update order status');
      }
    }
    return await this.prisma.orders.update({
      where: { id },
      data: { status: dto.status },
    });
  }
  async createReview(
    session: TUserSession,
    dto: CreateReviewDto,
    id: string,
    orderDetailId: string,
    bookId: string,
  ) {
    const order = await this.prisma.orders.findUnique({
      where: { user_id: session.id, id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const orderDetail = await this.prisma.orderItems.findUnique({
      where: { id: orderDetailId },
    });
    if (!orderDetail) {
      throw new NotFoundException('Order detail not found');
    }
    const book = await this.prisma.books.findUnique({
      where: { id: bookId },
    });
    if (!book) {
      throw new NotFoundException('Book not found');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const newTotalReviews = book.total_reviews + 1;
        const newAvgStars =
          (Number(book.avg_stars) * book.total_reviews + dto.star) /
          newTotalReviews;
        await tx.books.update({
          where: { id: book.id },
          data: {
            total_reviews: newTotalReviews,
            avg_stars: newAvgStars,
          },
        });
        const review = await tx.reviews.create({
          data: {
            user_id: session.id,
            book_id: book.id,
            rating: dto.star,
            description: dto.description,
            title: dto.title,
            order_id: id,
          },
          include: {
            book: true,
          },
        });
        return review;
      });
    } catch (error) {
      console.log('Error:', error);
      throw new BadRequestException({
        message: 'Failed to add rating review',
      });
    }
  }
  async cancelOrder(id: string, session: TUserSession) {
    const order = await this.prisma.orders.findUnique({
      where: { id: id, user_id: session.id },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.status === ORDER_STATUS.CANCELLED) {
      throw new BadRequestException('Order already cancelled');
    }
    const orderDetails = await this.prisma.orderItems.findMany({
      where: { order_id: id },
    });
    const bookIds = orderDetails.map((item) => {
      return { id: item.book_id, quantity: item.quantity };
    });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.orders.update({
          where: { id },
          data: { status: ORDER_STATUS.CANCELLED as OrderStatus },
        });
        bookIds.forEach(async (item) => {
          await tx.books.update({
            where: { id: item.id },
            data: {
              stock_quantity: { increment: item.quantity },
            },
          });
        });
        return await tx.orders.findUnique({
          where: { id },
        });
      });
    } catch (error) {
      console.log('Error:', error);
      throw new BadRequestException('Failed to cancel order');
    }
  }
  async getOrderDetailsByAdmin(id: string) {
    const order = await this.prisma.orders.findUnique({
      where: {
        id: id,
      },
      include: {
        OrderItems: {
          include: {
            book: true,
          },
        },
        user: true,
      },
    });
    if (!order) {
      throw new BadRequestException('Order not found');
    }
    return order;
  }
  async getOrderHistory(session: TUserSession, dto: OrderPageOptionsDto) {
    const orders = await this.prisma.orders.findMany({
      where: { user_id: session.id, ...(dto.status && { status: dto.status }) },
      include: {
        OrderItems: {
          include: {
            book: true,
          },
        },
      },
      take: dto.take,
      skip: dto.skip,
      orderBy: { [dto.sortBy]: dto.order },
    });
    const itemCount = await this.prisma.orders.count({
      where: { user_id: session.id, ...(dto.status && { status: dto.status }) },
    });
    return { orders, itemCount };
  }
}
