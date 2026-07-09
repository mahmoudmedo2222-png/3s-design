import { Body, Controller, Get, Inject, Patch, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UpdateBuyerProfileDto } from './buyer-profile.dto';
import { CustomerProfileService } from './customer-profile.service';

@Controller('customer/profile')
@UseGuards(JwtAuthGuard)
export class CustomerProfileController {
  constructor(@Inject(CustomerProfileService) private readonly profiles: CustomerProfileService) {}

  @Get()
  getProfile(@CurrentUser() user: AuthUser) {
    return this.profiles.getProfile(user.id);
  }

  @Patch('buyer-profile')
  updateBuyerProfile(@CurrentUser() user: AuthUser, @Body() input: UpdateBuyerProfileDto) {
    return this.profiles.updateBuyerProfile(user.id, input.profile);
  }
}
