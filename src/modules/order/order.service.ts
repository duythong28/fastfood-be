import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TUserSession } from 'src/common/decorators/user-session.decorator';
import { OrderStatus, ReviewState } from '@prisma/client';
import { OrderPageOptionsDto } from './dto/find_all_order.dto';
import { CreateOrderDto } from './dto/create_order.dto';
import { CreateReviewDto } from './dto/create_review.dto';
import { ORDER_STATUS } from 'src/constants/enum';
import { UpdateOrderStatusDto } from './dto/update_order_status.dto';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}
  async createOrder(session: TUserSession, dto: CreateOrderDto) {
    const productIds = dto.items.map((item) => item.productId);
    const products = await this.prisma.products.findMany({
      where: { id: { in: productIds } },
    });
    const cart = await this.prisma.carts.findFirstOrThrow({
      where: { user_id: session.id },
    });
    const cartItems = await this.prisma.cartItems.findMany({
      where: { cart_id: cart.id, product_id: { in: productIds } },
    });
    const cartItemIds = cartItems.map((item) => item.id);
    if (products.length !== productIds.length) {
      throw new NotFoundException('Some products are not found');
    }
    const productPriceMap = new Map(
      products.map((product) => [
        product.id,
        {
          price: product.price,
          finalPrice: product.final_price ?? product.price,
        },
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
          const { price, finalPrice } = productPriceMap.get(item.productId);
          const totalPrice = Number(finalPrice) * item.quantity;
          return {
            order_id: order.id,
            product_id: item.productId,
            quantity: item.quantity,
            price,
            total_price: totalPrice,
          };
        });
        await tx.orderItems.createMany({ data: orderItems });
        await Promise.all(
          orderItems.map((item) =>
            tx.products.update({
              where: { id: item.product_id },
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
                product: true,
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
            product: true,
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
            product: true,
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
            product: true,
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
    productId: string,
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
    const product = await this.prisma.products.findUnique({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Book not found');
    }
    try {
      return await this.prisma.$transaction(async (tx) => {
        const newTotalReviews = product.total_reviews + 1;
        const newAvgStars =
          (Number(product.avg_stars) * product.total_reviews + dto.star) /
          newTotalReviews;
        const review = await tx.reviews.create({
          data: {
            user_id: session.id,
            product_id: product.id,
            rating: dto.star,
            description: dto.description,
            title: dto.title,
            order_item_id: orderDetailId,
          },
          include: {
            product: true,
          },
        });
        await tx.products.update({
          where: { id: product.id },
          data: {
            total_reviews: newTotalReviews,
            avg_stars: newAvgStars,
          },
        });
        await tx.orderItems.update({
          where: { id: orderDetailId },
          data: { review_status: ReviewState.REVIEWED, review_id: review.id },
        });
        const orderItems = await tx.orderItems.findMany({
          where: { order_id: id },
        });
        let flag = true;
        for (const item of orderItems) {
          if (item.review_status !== ReviewState.REVIEWED) {
            flag = false;
            break;
          }
        }
        if (flag) {
          await tx.orders.update({
            where: { id },
            data: { review_state: ReviewState.REVIEWED },
          });
        }
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
      return { id: item.product_id, quantity: item.quantity };
    });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.orders.update({
          where: { id },
          data: { status: ORDER_STATUS.CANCELLED as OrderStatus },
        });
        bookIds.forEach(async (item) => {
          await tx.products.update({
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
            product: true,
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
            product: true,
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
