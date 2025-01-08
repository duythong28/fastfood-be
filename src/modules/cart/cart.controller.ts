import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Carts } from '@prisma/client';
import {
  TUserSession,
  UserSession,
} from 'src/common/decorators/user-session.decorator';
import { StandardResponse } from 'src/utils/response.dto';
import { ApiTags } from '@nestjs/swagger';
import HttpStatusCode from 'src/constants/http_status_code';
import { CartsService } from './cart.service';
import { DOCUMENTATION } from 'src/constants/documentation';
import { END_POINTS } from 'src/constants/end_points';
import { GetCartDto } from './dto/get_cart.dto';
import { PageResponseDto } from 'src/utils/page_response.dto';
import { PageResponseMetaDto } from 'src/utils/page_response_meta.dto';
import { AddToCartDto } from './dto/add_to_cart.dto';
import { UpdateCartDto } from './dto/update_cart.dto';
import { CheckOutDto } from './dto/check_out.dto';
import { ChatbotService } from '../chatbot/chatbot.service';

const {
  CARTS: {
    BASE,
    CREATE,
    GET_ALL,
    ADD_TO_CART,
    REMOVE_FROM_CART,
    UPDATE_CART,
    CHECKOUT_CART,
  },
} = END_POINTS;

@Controller(BASE)
@ApiTags(DOCUMENTATION.TAGS.CARTS)
export class CartController {
  constructor(
    private readonly cartService: CartsService,
    private readonly chatbotService: ChatbotService,
  ) {}
  @Post(CREATE)
  async createCart(
    @UserSession() session: TUserSession,
  ): Promise<StandardResponse<Carts>> {
    const cart = await this.cartService.createCart(session);
    const message = 'Cart created successfully';
    return new StandardResponse(cart, message, HttpStatusCode.CREATED);
  }
  @Get(GET_ALL)
  async getAllCartItem(
    @UserSession() session: TUserSession,
    @Query() getCartDto: GetCartDto,
  ) {
    const { cartItems, itemCount } = await this.cartService.getAllCartItems(
      session,
      getCartDto,
    );
    const meta = new PageResponseMetaDto({
      pageOptionsDto: getCartDto,
      itemCount: itemCount,
    });
    return new PageResponseDto(cartItems, meta);
  }
  @Post(ADD_TO_CART)
  async addToCart(
    @UserSession() session: TUserSession,
    @Body() addToCartDto: AddToCartDto,
  ) {
    const cart = await this.cartService.addToCart(session, addToCartDto);
    const message = 'Add to cart successfully';
    return new StandardResponse(cart, message, HttpStatusCode.CREATED);
  }
  @Put(UPDATE_CART)
  async updateCart(
    @UserSession() session: TUserSession,
    @Body() dto: UpdateCartDto,
  ) {
    const cart = await this.cartService.updateCartItem(session, dto);
    const message = 'Update cart successfully';
    return new StandardResponse(cart, message, HttpStatusCode.OK);
  }
  @Delete(REMOVE_FROM_CART)
  async removeFromCart(
    @UserSession() session: TUserSession,
    @Param('bookId', ParseUUIDPipe) id: string,
  ) {
    const result = await this.cartService.deleteCartItem(session, id);
    return result;
  }
  @Post(CHECKOUT_CART)
  async checkoutCart(
    @UserSession() session: TUserSession,
    @Body() dto: CheckOutDto,
  ) {
    const result = await this.cartService.checkoutCart(session, dto);
    await this.chatbotService.updateEntityOrderId(result.id);
    return result;
  }
}
