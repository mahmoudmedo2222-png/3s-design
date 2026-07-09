import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateRefundRequestDto } from './dto/create-refund-request.dto';
import { RefundsService } from './refunds.service';

@Controller('refunds')
@UseGuards(JwtAuthGuard)
export class RefundsController {
  constructor(@Inject(RefundsService) private readonly refunds: RefundsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.refunds.listUserRefunds(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() input: CreateRefundRequestDto) {
    return this.refunds.createUserRefundRequest(user.id, input);
  }
}
