import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { OrdersService } from './orders.service';

@Controller('checkout')
@UseGuards(JwtAuthGuard)
export class CheckoutController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Post()
  createPendingOrder(@CurrentUser() user: AuthUser, @Body() input?: CreateCheckoutDto) {
    return this.orders.createPendingOrder(user.id, input);
  }
}
