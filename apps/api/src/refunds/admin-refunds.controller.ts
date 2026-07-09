import { Body, Controller, Get, Inject, Param, Post, UseGuards } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { ResolveRefundRequestDto } from './dto/resolve-refund-request.dto';
import { RefundsService } from './refunds.service';

@Controller('admin/refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminRefundsController {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(RefundsService) private readonly refunds: RefundsService,
  ) {}

  @Get()
  list() {
    return this.refunds.listAdminRefunds();
  }

  @Post(':refundRequestId/approve')
  async approve(@CurrentUser() user: AuthUser, @Param('refundRequestId') refundRequestId: string, @Body() input: ResolveRefundRequestDto) {
    await this.auth.assertPasswordForStepUp(user.id, input.adminPassword, 'admin.refunds.approve');
    return this.refunds.approveRefundRequest(refundRequestId, user.id, input);
  }

  @Post(':refundRequestId/reject')
  async reject(@CurrentUser() user: AuthUser, @Param('refundRequestId') refundRequestId: string, @Body() input: ResolveRefundRequestDto) {
    await this.auth.assertPasswordForStepUp(user.id, input.adminPassword, 'admin.refunds.reject');
    return this.refunds.rejectRefundRequest(refundRequestId, user.id, input);
  }
}
