import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GetReviewsDto } from './dto/find_all_review.dto';
import { AdminReplyReviewDto } from './dto/reply_review.dto';
import { ReviewState } from 'src/constants/enum';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}
  async getAllReviews(dto: GetReviewsDto) {
    const reviews = await this.prisma.reviews.findMany({
      where: {
        ...(dto.search && { product: { title: { contains: dto.search } } }),
        ...(dto.rating && { rating: { in: dto.rating } }),
        ...(dto.date && { created_at: { equals: new Date(dto.date) } }),
        ...(dto.state && { state: dto.state }),
      },
      include: {
        product: true,
        user: true,
        OrderItem: true,
        ReplyReviews: true,
      },
      skip: dto.skip,
      take: dto.take,
    });
    const itemCount = await this.prisma.reviews.count({
      where: {
        ...(dto.search && { product: { title: { contains: dto.search } } }),
        ...(dto.rating && { rating: { in: dto.rating } }),
        ...(dto.date && { created_at: { equals: new Date(dto.date) } }),
        ...(dto.state && { state: dto.state }),
      },
    });
    return { reviews, itemCount };
  }
  async getReviewDetails(id: number) {
    const reviewDetail = await this.prisma.reviews.findUnique({
      where: {
        id: id,
      },
      include: {
        product: true,
        user: true,
        OrderItem: true,
        ReplyReviews: true,
      },
    });
    return reviewDetail;
  }
  async createAdminReply(id: number, dto: AdminReplyReviewDto) {
    const review = await this.prisma.reviews.findUnique({
      where: {
        id: id,
      },
    });
    if (!review) {
      throw new BadRequestException('Review not found');
    }
    const existingReply = await this.prisma.replyReviews.findFirst({
      where: {
        review_id: id,
      },
    });
    if (existingReply) {
      throw new BadRequestException('Reply already exists');
    }
    const orderItem = await this.prisma.orderItems.findUnique({
      where: {
        id: review.order_item_id,
      },
    });
    const order = await this.prisma.orders.findUnique({
      where: {
        id: orderItem.order_id,
      },
    });
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.orderItems.update({
          where: {
            id: review.order_item_id,
          },
          data: {
            review_status: ReviewState.REPLIED,
          },
        });
        await tx.reviews.update({
          where: {
            id: id,
          },
          data: {
            state: ReviewState.REPLIED,
          },
        });
        const orderItems = await tx.orderItems.findMany({
          where: {
            order_id: order.id,
          },
        });
        const isAllReviewReplied = orderItems.every(
          (item) => item.review_status === ReviewState.REPLIED,
        );
        if (isAllReviewReplied) {
          await tx.orders.update({
            where: {
              id: order.id,
            },
            data: {
              review_state: ReviewState.REPLIED,
            },
          });
          await tx.reviews.update({
            where: {
              id: id,
            },
            data: {
              state: ReviewState.REPLIED,
            },
          });
        }
        return await tx.replyReviews.create({
          data: {
            review_id: id,
            reply: dto.reply,
          },
        });
      });
    } catch (error) {
      console.log(error);
      throw new BadRequestException('Failed to create admin reply');
    }
  }
  async getReviewsByProductId(productId: string, query: GetReviewsDto) {
    const reviews = await this.prisma.reviews.findMany({
      where: {
        product_id: productId,
        ...(query.search && { product: { title: { contains: query.search } } }),
        ...(query.rating && { rating: { in: query.rating } }),
        ...(query.date && { created_at: { equals: new Date(query.date) } }),
        ...(query.state && { state: query.state }),
      },
      include: {
        product: true,
        ReplyReviews: true,
        user: true,
        OrderItem: true,
      },
      skip: query.skip,
      take: query.take,
    });
    const itemCount = await this.prisma.reviews.count({
      where: {
        product_id: productId,
        ...(query.search && { product: { title: { contains: query.search } } }),
        ...(query.rating && { rating: { in: query.rating } }),
        ...(query.date && { created_at: { equals: new Date(query.date) } }),
        ...(query.state && { state: query.state }),
      },
    });
    return { reviews, itemCount };
  }
  async getReviewsByOrderId(orderId: string, query: GetReviewsDto) {
    const orderItems = await this.prisma.orderItems.findMany({
      where: {
        order_id: orderId,
      },
    });
    const reviews = await this.prisma.reviews.findMany({
      where: {
        order_item_id: {
          in: orderItems.map((item) => item.id),
        },
        ...(query.search && { product: { title: { contains: query.search } } }),
        ...(query.rating && { rating: { in: query.rating } }),
        ...(query.date && { created_at: { equals: new Date(query.date) } }),
        ...(query.state && { state: query.state }),
      },
      include: {
        product: true,
        ReplyReviews: true,
      },
      skip: query.skip,
      take: query.take,
    });
    const itemCount = await this.prisma.reviews.count({
      where: {
        order_item_id: {
          in: orderItems.map((item) => item.id),
        },
        ...(query.search && { product: { title: { contains: query.search } } }),
        ...(query.rating && { rating: { in: query.rating } }),
        ...(query.date && { created_at: { equals: new Date(query.date) } }),
        ...(query.state && { state: query.state }),
      },
    });
    return { reviews, itemCount };
  }
}
