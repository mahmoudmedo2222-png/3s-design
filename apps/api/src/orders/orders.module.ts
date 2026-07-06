import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DatabaseModule } from '../database/database.module';
import { CartController } from './cart.controller';
import { CheckoutController } from './checkout.controller';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [CartController, CheckoutController, OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
