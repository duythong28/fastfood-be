import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TUserSession } from 'src/common/decorators/user-session.decorator';
import {
  OrderStatus,
  PaymentMethod,
  ReviewState,
  ReviewType,
} from '@prisma/client';
import { OrderPageOptionsDto } from './dto/find_all_order.dto';
import { CreateOrderDto } from './dto/create_order.dto';
import { CreateReviewDto } from './dto/create_review.dto';
import { ORDER_STATUS } from 'src/constants/enum';
import { UpdateOrderStatusDto } from './dto/update_order_status.dto';
import { CreatePaymentUrlDto } from './dto/create_order_payment_url.dto';
import * as axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Request, Response } from 'express';
import { GeminiService } from '../gen_ai/gemini.service';
import HttpStatusCode from 'src/constants/http_status_code';
import { EmailService } from '../email/email.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly geminiService: GeminiService,
    private readonly emailService: EmailService,
  ) {}
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
    const user = await this.prisma.users.findUnique({
      where: { id: session.id },
    });
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
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.cartItems.deleteMany({
            where: {
              id: { in: cartItemIds },
            },
          });
          let order = undefined;
          if (dto.paymentMethod === PaymentMethod.CASH) {
            const orderTemp = await tx.orders.create({
              data: {
                user_id: session.id,
                full_name: dto.fullName,
                phone_number: dto.phoneNumber,
                address: dto.address,
                payment_method: dto.paymentMethod,
                status: ORDER_STATUS.PROCESSING as OrderStatus,
              },
            });
            const orderItems = dto.items.map((item) => {
              const { price, finalPrice } = productPriceMap.get(item.productId);
              const totalPrice = Number(finalPrice) * item.quantity;
              return {
                order_id: orderTemp.id,
                product_id: item.productId,
                quantity: item.quantity,
                price,
                total_price: totalPrice,
              };
            });
            await tx.orderItems.createMany({ data: orderItems });
            const totalPrice = orderItems.reduce(
              (acc, item) => acc + item.total_price,
              0,
            );
            const updatedOrder = await tx.orders.update({
              where: { id: orderTemp.id },
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
            order = await tx.orders.findFirst({
              where: { id: orderTemp.id },
              include: {
                OrderItems: {
                  include: {
                    product: true,
                  },
                },
              },
            });
            await this.emailService.sendOrderProcessing({
              user: user,
              order: {
                ...order,
                total_price: Number(order.total_price),
                OrderItems: order.OrderItems.map((item) => ({
                  ...item,
                  price: Number(item.price),
                  product: item.product,
                })),
              },
            });
            return updatedOrder;
          } else {
            const orderTemp = await tx.orders.create({
              data: {
                user: { connect: { id: session.id } },
                full_name: dto.fullName,
                phone_number: dto.phoneNumber,
                payment_method: dto.paymentMethod,
                address: dto.address,
              },
            });
            order = orderTemp;
          }
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
        },
        {
          timeout: 20000,
        },
      );
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
          const order = await tx.orders.findUnique({
            where: { id: updatedOrder.id },
            include: {
              OrderItems: {
                include: {
                  product: true,
                },
              },
            },
          });
          const user = await tx.users.findUnique({
            where: { id: order.user_id },
          });
          await this.emailService.sendOrderRejected({
            user,
            order: {
              ...order,
              total_price: Number(order.total_price),
              OrderItems: order.OrderItems.map((item) => ({
                ...item,
                price: Number(item.price),
                product: item.product,
              })),
            },
          });
          return updatedOrder;
        });
      } catch (error) {
        console.log(error);
        throw new BadRequestException('Failed to update order status');
      }
    }

    if (dto.status === ORDER_STATUS.SUCCESS) {
      const orderItems = await this.prisma.orderItems.findMany({
        where: { order_id: id },
      });

      for (const orderItem of orderItems) {
        const product = await this.prisma.products.findUnique({
          where: { id: orderItem.product_id },
          select: { sold_quantity: true },
        });

        await this.prisma.products.update({
          where: { id: orderItem.product_id },
          data: { sold_quantity: product.sold_quantity + orderItem.quantity },
        });
      }
      const order = await this.prisma.orders.findUnique({
        where: { id: id },
        include: {
          OrderItems: {
            include: {
              product: true,
            },
          },
        },
      });
      const user = await this.prisma.users.findUnique({
        where: { id: order.user_id },
      });
      await this.emailService.sendOrderSuccess({
        user,
        order: {
          ...order,
          total_price: Number(order.total_price),
          OrderItems: order.OrderItems.map((item) => ({
            ...item,
            price: Number(item.price),
            product: item.product,
          })),
        },
      });
    } else if (dto.status === ORDER_STATUS.DELIVERED) {
      const order = await this.prisma.orders.findUnique({
        where: { id: id },
        include: {
          OrderItems: {
            include: {
              product: true,
            },
          },
        },
      });
      const user = await this.prisma.users.findUnique({
        where: { id: order.user_id },
      });
      await this.emailService.sendOrderDelivering({
        user,
        order: {
          ...order,
          total_price: Number(order.total_price),
          OrderItems: order.OrderItems.map((item) => ({
            ...item,
            price: Number(item.price),
            product: item.product,
          })),
        },
      });
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
    const type = await this.geminiService.analyseComment(
      dto.title + ' ' + dto.description,
    );
    if (type.trim() === ReviewType.TOXIC) {
      throw new HttpException(
        'Your comment is toxic, please try again',
        HttpStatusCode.BAD_REQUEST,
      );
    }
    const is_hidden = type.trim() === ReviewType.NEGATIVE;
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
            type: type.trim() as ReviewType,
            is_hidden: is_hidden,
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
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.orders.update({
          where: { id },
          data: { status: ORDER_STATUS.CANCELLED as OrderStatus },
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
  async createOrderPaymentUrlWithMomo(dto: CreatePaymentUrlDto) {
    try {
      const order = await this.prisma.orders.findUniqueOrThrow({
        where: { id: dto.orderId },
      });
      const partnerCodeMomo = this.config.get<string>('partner_code_momo');
      const accessKeyMomo = this.config.get<string>('access_key_momo');
      const secretKeyMomo = this.config.get<string>('secret_key_momo');
      const orderInfo = `Thanh toán đơn hàng ${order.id}`;
      const redirectUrl = this.config.get<string>('redirect_url_payment');
      const ipnUrl = this.config.get<string>('ipn_url_momo');
      const requestId = partnerCodeMomo + new Date().getTime();
      const orderId = dto.orderId;
      const amount = Number(order.total_price);
      const requestType = 'captureWallet';
      const extraData = 'FastFood';

      const rawSignature =
        'accessKey=' +
        accessKeyMomo +
        '&amount=' +
        amount +
        '&extraData=' +
        extraData +
        '&ipnUrl=' +
        ipnUrl +
        '&orderId=' +
        orderId +
        '&orderInfo=' +
        orderInfo +
        '&partnerCode=' +
        partnerCodeMomo +
        '&redirectUrl=' +
        redirectUrl +
        '&requestId=' +
        requestId +
        '&requestType=' +
        requestType;
      const signature = crypto
        .createHmac('sha256', secretKeyMomo)
        .update(rawSignature)
        .digest('hex');
      const requestBody = JSON.stringify({
        partnerCode: partnerCodeMomo,
        accessKey: accessKeyMomo,
        requestId: requestId,
        amount: amount,
        orderId: orderId,
        orderInfo: orderInfo,
        redirectUrl: redirectUrl,
        ipnUrl: ipnUrl,
        extraData: extraData,
        requestType: requestType,
        signature: signature,
        lang: 'en',
      });
      const options = {
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestBody, 'utf8'),
        },
        method: 'POST',
        url: 'https://test-payment.momo.vn/v2/gateway/api/create',
        data: requestBody,
      };
      const response = await axios.default(options);
      await this.prisma.orders.update({
        where: {
          id: dto.orderId,
        },
        data: {
          payment_url: response.data.payUrl,
        },
      });
      return response.data;
    } catch (error) {
      throw new InternalServerErrorException(error.message);
    }
  }
  async callbackWithMomo(req: Request, res: Response) {
    try {
      // check signature sẽ implement sau, tạm thời bỏ qua bước này
      const { orderId, resultCode } = req.body;
      //update order status and send email, sms
      if (resultCode === 0) {
        await this.prisma.orders.update({
          where: { id: orderId as string },
          data: {
            status: ORDER_STATUS.PROCESSING as OrderStatus,
          },
        });
        const order = await this.prisma.orders.findUnique({
          where: { id: orderId as string },
          include: {
            OrderItems: {
              include: {
                product: true,
              },
            },
          },
        });
        const user = await this.prisma.users.findUnique({
          where: { id: order.user_id },
        });

        await this.emailService.sendOrderProcessing({
          user,
          order: {
            ...order,
            total_price: Number(order.total_price),
            OrderItems: order.OrderItems.map((item) => ({
              ...item,
              price: Number(item.price),
              product: item.product,
            })),
          },
        });

        return res.status(204).json({
          resultCode: 0,
          message: 'Success',
        });
      } else {
        return res.status(204).json({
          resultCode: 10,
          message: 'Failed',
        });
      }
    } catch (error) {
      console.log('Error:', error);
      const response = {
        resultCode: 10,
        message: 'Error',
      };
      return res.status(204).json(response);
    }
  }
}
