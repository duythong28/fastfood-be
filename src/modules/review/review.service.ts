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
        ...(dto.search && { book: { title: { contains: dto.search } } }),
        ...(dto.rating && { rating: { in: dto.rating } }),
        ...(dto.date && { created_at: { equals: new Date(dto.date) } }),
        ...(dto.state && { state: dto.state }),
      },
      include: {
        book: true,
        user: true,
        order: true,
      },
      skip: dto.skip,
      take: dto.take,
    });
    const itemCount = await this.prisma.reviews.count({
      where: {
        ...(dto.search && { book: { title: { contains: dto.search } } }),
        ...(dto.rating && { rating: { in: dto.rating } }),
        ...(dto.date && { created_at: { equals: new Date(dto.date) } }),
        ...(dto.state && { state: dto.state }),
      },
      skip: dto.skip,
      take: dto.take,
    });
    return { reviews, itemCount };
  }
  async getReviewDetails(id: number) {
    const reviewDetail = await this.prisma.reviews.findUnique({
      where: {
        id: id,
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
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.reviews.update({
          where: {
            id: id,
          },
          data: {
            state: ReviewState.ANSWERED,
          },
        });
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
}
