import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ReplyReviews, Reviews } from '@prisma/client';
import { StandardResponse } from 'src/utils/response.dto';
import { DOCUMENTATION } from 'src/constants/documentation';
import { END_POINTS } from 'src/constants/end_points';
import { ReviewsService } from './review.service';
import { PageResponseDto } from 'src/utils/page_response.dto';
import { PageResponseMetaDto } from 'src/utils/page_response_meta.dto';
import { GetReviewsDto } from './dto/find_all_review.dto';
import { AdminReplyReviewDto } from './dto/reply_review.dto';
import HttpStatusCode from 'src/constants/http_status_code';

const {
  REVIEW: {
    BASE,
    GET_ALL,
    GET_ONE,
    REPLY,
    GET_REVIEW_BY_PRODUCT_ID,
    GET_REVIEW_BY_ORDER_ID,
  },
} = END_POINTS;

@Controller(BASE)
@ApiTags(DOCUMENTATION.TAGS.COMMENT)
export class ReviewsController {
  constructor(private readonly reviewService: ReviewsService) {}
  @Get(GET_ALL)
  async getAll(
    @Query() query: GetReviewsDto,
  ): Promise<PageResponseDto<Reviews>> {
    const { reviews, itemCount } =
      await this.reviewService.getAllReviews(query);
    const pageResponseMetaDto = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto<Reviews>(reviews, pageResponseMetaDto);
  }
  @Get(GET_ONE)
  async getOne(@Param('id', ParseIntPipe) id: number) {
    return await this.reviewService.getReviewDetails(id);
  }
  @Post(REPLY)
  async replyReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminReplyReviewDto,
  ) {
    const reply = await this.reviewService.createAdminReply(id, dto);
    return new StandardResponse<ReplyReviews>(
      reply,
      'Create reply successfully',
      HttpStatusCode.CREATED,
    );
  }
  @Get(GET_REVIEW_BY_PRODUCT_ID)
  async getReviewByBookId(
    @Param('productId') productId: string,
    @Query() query: GetReviewsDto,
  ) {
    const { reviews, itemCount } =
      await this.reviewService.getReviewsByProductId(productId, query);
    const pageResponseMetaDto = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(reviews, pageResponseMetaDto);
  }
  @Get(GET_REVIEW_BY_ORDER_ID)
  async getReviewByOrderId(
    @Param('orderId') orderId: string,
    @Query() query: GetReviewsDto,
  ) {
    const { reviews, itemCount } = await this.reviewService.getReviewsByOrderId(
      orderId,
      query,
    );
    const pageResponseMetaDto = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(reviews, pageResponseMetaDto);
  }
}
