import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { CartsModule } from './cart/cart.module';
import { CategoriesModule } from './category/category.module';
import { EmailModule } from './email/email.module';
import { GoogleOauthModule } from './google_oauth/google_oauth.module';
import { OrdersModule } from './order/order.module';
import { ReviewsModule } from './review/review.module';
import { UsersModule } from './user/user.module';
const Modules = [
  EmailModule,
  UsersModule,
  BooksModule,
  AuthModule,
  CategoriesModule,
  CartsModule,
  OrdersModule,
  GoogleOauthModule,
  ReviewsModule,
];

export default Modules;
