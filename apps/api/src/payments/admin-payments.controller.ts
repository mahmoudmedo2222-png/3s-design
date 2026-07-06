import { Body, Controller, Inject, Param, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MarkPaymentPaidDto } from './dto/mark-payment-paid.dto';
import { PaymentsService } from './payments.service';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPaymentsController {
  constructor(@Inject(PaymentsService) private readonly payments: PaymentsService) {}

  @Post(':paymentId/mark-paid')
  markPaid(@CurrentUser() user: AuthUser, @Param('paymentId') paymentId: string, @Body() input: MarkPaymentPaidDto) {
    return this.payments.markPaymentPaid(paymentId, input.providerPaymentId, user.id);
  }

  @Post(':paymentId/mark-failed')
  markFailed(@CurrentUser() user: AuthUser, @Param('paymentId') paymentId: string) {
    return this.payments.failPayment(paymentId, user.id);
  }
}
