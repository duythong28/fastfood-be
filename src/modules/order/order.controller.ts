import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import {
  TUserSession,
  UserSession,
} from 'src/common/decorators/user-session.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Orders, Reviews } from '@prisma/client';
import { StandardResponse } from 'src/utils/response.dto';
import { END_POINTS } from 'src/constants/end_points';
import { ROLE } from 'src/constants/enum';
import { OrderService } from './order.service';
import { OrderPageOptionsDto } from './dto/find_all_order.dto';
import { PageResponseMetaDto } from 'src/utils/page_response_meta.dto';
import { PageResponseDto } from 'src/utils/page_response.dto';
import HttpStatusCode from 'src/constants/http_status_code';
import { CreateOrderDto } from './dto/create_order.dto';
import { CreateReviewDto } from './dto/create_review.dto';
import { UpdateOrderStatusDto } from './dto/update_order_status.dto';
import { ChatbotService } from '../chatbot/chatbot.service';
import { StatisticService } from '../statistic/statistic.service';
import { ORDER_STATUS } from 'src/constants/enum';
import { CreatePaymentUrlDto } from './dto/create_order_payment_url.dto';
import { Public } from 'src/common/decorators/public.decorator';
import { Request, Response } from 'express';

const {
  ORDER: {
    BASE,
    GET_FULL_LIST,
    GET_ALL,
    CREATE,
    UPDATE_STATUS,
    GET_ONE,
    CANCEL_ORDER,
    GET_ONE_BY_ADMIN,
    CREATE_ORDER_PAYMENT_URL_WITH_MOMO,
    CALLBACK_WITH_MOMO,
  },
} = END_POINTS;

@Controller(BASE)
export class OrdersController {
  constructor(
    private readonly orderService: OrderService,
    private readonly chatbotService: ChatbotService,
    private readonly statisticService: StatisticService,
  ) {}
  @Get(GET_FULL_LIST)
  @Roles(ROLE.ADMIN)
  async getListOrders(
    @Query() query: OrderPageOptionsDto,
  ): Promise<PageResponseDto<Orders>> {
    const { orders, itemCount } = await this.orderService.getListOrders(query);
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(orders, meta);
  }
  @Get(GET_ALL)
  async getAllOrders(
    @Query() query: OrderPageOptionsDto,
    @UserSession() session: TUserSession,
  ): Promise<PageResponseDto<Orders>> {
    const { orders, itemCount } = await this.orderService.getListOrdersByUser(
      query,
      session,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: query,
      itemCount: itemCount,
    });
    return new PageResponseDto(orders, meta);
  }
  @Post(CREATE)
  async createOrder(
    @UserSession() session: TUserSession,
    @Body() dto: CreateOrderDto,
  ) {
    const order = await this.orderService.createOrder(session, dto);
    const message = 'Order created successfully';
    await this.chatbotService.updateEntityOrderId(order.id);
    return new StandardResponse<Orders>(order, message, HttpStatusCode.CREATED);
  }
  @Post(UPDATE_STATUS)
  async updateOrderStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    const order = await this.orderService.updateOrderStatus(id, dto);
    const message = 'Order status updated successfully';

    if (order.status === ORDER_STATUS.SUCCESS) {
      this.statisticService.createStatistic(order.total_price);
    }

    return new StandardResponse<Orders>(order, message, HttpStatusCode.OK);
  }
  @Get(GET_ONE_BY_ADMIN)
  async getOrderDetailsByAdmin(@Param('id', ParseUUIDPipe) id: string) {
    const order = await this.orderService.getOrderDetailsByAdmin(id);
    const message = 'Order details retrive';
    return new StandardResponse<Orders>(order, message, HttpStatusCode.OK);
  }
  @Get(GET_ONE)
  async getOrderDetails(
    @UserSession() session: TUserSession,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<StandardResponse<Orders>> {
    const order = await this.orderService.getOrderProductsByUser(id, session);
    const message = 'Order details retrieved successfully';
    return new StandardResponse<Orders>(order, message, HttpStatusCode.OK);
  }
  @Post(`${GET_ONE}/order-details/:orderDetailsId/:productId`)
  async createReview(
    @UserSession() session: TUserSession,
    @Body() dto: CreateReviewDto,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('orderDetailsId', ParseUUIDPipe) orderDetailsId: string,
    @Param('productId', ParseUUIDPipe) productId: string,
  ): Promise<StandardResponse<Reviews>> {
    console.log(dto);
    const review = await this.orderService.createReview(
      session,
      dto,
      id,
      orderDetailsId,
      productId,
    );
    const message = 'Comment created successfully';
    return new StandardResponse(review, message, HttpStatusCode.CREATED);
  }
  @Patch(CANCEL_ORDER)
  async cancelOrder(
    @Param('id', ParseUUIDPipe) id: string,
    @UserSession() session: TUserSession,
  ) {
    const order = await this.orderService.cancelOrder(id, session);
    const message = 'Order cancelled successfully';
    return new StandardResponse(order, message, HttpStatusCode.OK);
  }

  @Public()
  @Post(CREATE_ORDER_PAYMENT_URL_WITH_MOMO)
  async createOrderPaymentUrlWithMomo(@Body() body: CreatePaymentUrlDto) {
    const orderPaymentUrl =
      await this.orderService.createOrderPaymentUrlWithMomo(body);
    const message = 'Order payment url created successfully';
    return new StandardResponse(
      orderPaymentUrl,
      message,
      HttpStatusCode.CREATED,
    );
  }

  @Public()
  @Post(CALLBACK_WITH_MOMO)
  async callbackWithVNPay(@Req() req: Request, @Res() res: Response) {
    await this.orderService.callbackWithMomo(req, res);
  }
}
