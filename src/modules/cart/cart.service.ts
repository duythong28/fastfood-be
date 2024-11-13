import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TUserSession } from 'src/common/decorators/user-session.decorator';
import { GetCartDto } from './dto/get_cart.dto';
import { AddToCartDto } from './dto/add_to_cart.dto';
import { UpdateCartDto } from './dto/update_cart.dto';
import { CheckOutDto } from './dto/check_out.dto';
import { OrderService } from '../order/order.service';

@Injectable()
export class CartsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orderService: OrderService,
  ) {}
  async createCart(session: TUserSession) {
    const existingCart = await this.prisma.carts.findUnique({
      where: { user_id: session.id },
    });
    if (existingCart) {
      throw new BadRequestException('Cart already exists');
    }
    const newCart = this.prisma.carts.create({
      data: {
        user_id: session.id,
      },
    });
    return newCart;
  }
  async getAllCartItems(session: TUserSession, getCartDto: GetCartDto) {
    const { id } = session;
    const cart = await this.prisma.carts.findFirst({
      where: { user_id: id },
    });
    if (!cart) {
      throw new BadRequestException('Cart not found');
    }
    const cartItems = await this.prisma.cartItems.findMany({
      where: { cart_id: cart.id },
      include: { book: true },
      skip: getCartDto.skip,
      take: getCartDto.take,
      orderBy: { [getCartDto.sortBy]: getCartDto.order },
    });
    const itemCount = await this.prisma.cartItems.count({
      where: { cart_id: cart.id },
    });
    return { cartItems, itemCount };
  }
  async addToCart(session: TUserSession, addToCartDto: AddToCartDto) {
    const { bookId, quantity } = addToCartDto;
    const cart = await this.prisma.carts.findFirst({
      where: { user_id: session.id },
    });
    if (!cart) {
      throw new BadRequestException('Cart not found');
    }
    const book = await this.prisma.books.findUnique({
      where: { id: bookId },
    });
    if (!book) {
      throw new BadRequestException('Book not found');
    }
    const existingCartItem = await this.prisma.cartItems.findFirst({
      where: {
        book_id: bookId,
        cart_id: cart.id,
      },
    });
    if (existingCartItem) {
      await this.prisma.cartItems.update({
        where: { id: existingCartItem.id },
        data: {
          quantity:
            existingCartItem.quantity + quantity < book.stock_quantity
              ? existingCartItem.quantity + quantity
              : book.stock_quantity,
        },
      });
    } else {
      await this.prisma.cartItems.create({
        data: {
          book_id: bookId,
          cart_id: cart.id,
          quantity:
            quantity < book.stock_quantity ? quantity : book.stock_quantity,
        },
      });
    }
    return this.prisma.carts.findFirst({
      where: { user_id: session.id },
      include: { CartItems: { include: { book: true } } },
    });
  }
  async deleteCartItem(session: TUserSession, bookId: string) {
    const book = await this.prisma.books.findUnique({
      where: { id: bookId },
    });
    if (!book) {
      throw new BadRequestException('Book not found');
    }
    const cart = await this.prisma.carts.findFirst({
      where: { user_id: session.id },
    });
    const cartItem = await this.prisma.cartItems.findFirst({
      where: {
        book_id: bookId,
        cart_id: cart.id,
      },
    });
    if (!cartItem) {
      throw new BadRequestException('Cart item not found');
    }
    try {
      await this.prisma.cartItems.delete({
        where: {
          id: cartItem.id,
        },
      });
      return this.prisma.carts.findFirst({
        where: { user_id: session.id },
        include: { CartItems: { include: { book: true } } },
      });
    } catch (error) {
      console.log('Error:', error);
      throw new Error('Failed to delete cart item');
    }
  }
  async updateCartItem(session: TUserSession, dto: UpdateCartDto) {
    const { bookId, quantity } = dto;
    const book = await this.prisma.books.findUnique({
      where: {
        id: bookId,
      },
    });
    if (!book) {
      throw new BadRequestException('Book not found');
    }
    const cart = await this.prisma.carts.findFirst({
      where: { user_id: session.id },
    });
    const cartItem = await this.prisma.cartItems.findFirst({
      where: {
        book_id: bookId,
        cart_id: cart.id,
      },
    });
    if (!cartItem) {
      throw new BadRequestException('Cart item not found');
    }
    return await this.prisma.$transaction(async (tx) => {
      await tx.cartItems.update({
        where: {
          id: cartItem.id,
        },
        data: {
          quantity:
            quantity < book.stock_quantity ? quantity : book.stock_quantity,
        },
      });
      const updateCart = await tx.carts.findUnique({
        where: { user_id: session.id },
        include: { CartItems: { include: { book: true } } },
      });
      return updateCart;
    });
  }
  async clearCart(session: TUserSession) {
    const cart = await this.prisma.carts.findFirst({
      where: { user_id: session.id },
    });
    if (!cart) {
      throw new BadRequestException('Cart not found');
    }
    await this.prisma.cartItems.deleteMany({
      where: {
        cart_id: cart.id,
      },
    });
    return this.prisma.carts.findFirst({
      where: { user_id: session.id },
      include: { CartItems: { include: { book: true } } },
    });
  }
  async checkoutCart(session: TUserSession, dto: CheckOutDto) {
    const cart = await this.prisma.carts.findFirst({
      where: { user_id: session.id },
    });
    if (!cart) {
      throw new BadRequestException('Cart not found');
    }
    const cartItems = await this.prisma.cartItems.findMany({
      where: { cart_id: cart.id },
      include: { book: true },
    });
    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }
    try {
      const order = await this.orderService.createOrder(session, {
        items: cartItems.map((item) => ({
          bookId: item.book.id,
          quantity: item.quantity,
        })),
        fullName: dto.fullName,
        phoneNumber: dto.phone,
        address: dto.shippingAddress,
      });
      await this.clearCart(session);
      return order;
    } catch (error) {
      console.log('Error:', error);
      throw new Error('Failed to checkout cart');
    }
  }
}
