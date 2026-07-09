import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { MarkPaymentPaidDto } from './dto/mark-payment-paid.dto';
import { ReconcilePaymentsDto } from './dto/reconcile-payments.dto';
import { PaymentsService } from './payments.service';

@Controller('admin/payments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminPaymentsController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  @Get()
  list() {
    return this.payments.listAdminPayments();
  }

  @Post('reconcile-stale')
  async reconcileStale(@CurrentUser() user: AuthUser, @Body() input: ReconcilePaymentsDto) {
    await this.auth.assertPasswordForStepUp(user.id, input.adminPassword, 'admin.payments.reconcile_stale');
    return this.payments.reconcileStalePendingPayments(user.id);
  }

  @Post(':paymentId/mark-paid')
  async markPaid(@CurrentUser() user: AuthUser, @Param('paymentId') paymentId: string, @Body() input: MarkPaymentPaidDto) {
    await this.auth.assertPasswordForStepUp(user.id, input.adminPassword, 'admin.payments.mark_paid');
    return this.payments.markPaymentPaid(paymentId, input.providerPaymentId, user.id);
  }

  @Post(':paymentId/mark-failed')
  markFailed(@CurrentUser() user: AuthUser, @Param('paymentId') paymentId: string) {
    return this.payments.failPayment(paymentId, user.id);
  }
}
