import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { OrdersService } from './orders.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(@Inject(OrdersService) private readonly orders: OrdersService) {}

  @Get()
  getCart(@CurrentUser() user: AuthUser) {
    return this.orders.getCart(user.id);
  }

  @Post('items')
  addItem(@CurrentUser() user: AuthUser, @Body() body: AddCartItemDto) {
    return this.orders.addCartItem(user.id, body);
  }

  @Patch('items/:id')
  updateItem(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateCartItemDto) {
    return this.orders.updateCartItem(user.id, id, body);
  }

  @Delete('items/:id')
  removeItem(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.orders.removeCartItem(user.id, id);
  }
}
