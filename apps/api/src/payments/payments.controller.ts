import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import type { AuthUser } from '../auth/auth.types';
import { CreatePaymentSessionDto } from './dto/create-payment-session.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.payments.listUserPayments(user.id);
  }

  @Get('providers')
  providers() {
    return this.payments.getProvidersReadiness();
  }

  @Post('sessions')
  createSession(@CurrentUser() user: AuthUser, @Body() input: CreatePaymentSessionDto) {
    return this.payments.createPaymentSession(user.id, input);
  }

  @Get(':paymentId')
  async find(@CurrentUser() user: AuthUser, @Param('paymentId') paymentId: string) {
    return this.payments.assertUserOwnsPayment(user.id, paymentId);
  }
}
