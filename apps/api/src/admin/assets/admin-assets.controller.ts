import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminAssetsService } from './admin-assets.service';
import { CreateAssetUploadUrlDto } from './dto/create-asset-upload-url.dto';

@Controller('admin/assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminAssetsController {
  constructor(@Inject(AdminAssetsService) private readonly assets: AdminAssetsService) {}

  @Post('upload-url')
  createUploadUrl(@CurrentUser() user: AuthUser, @Body() input: CreateAssetUploadUrlDto) {
    return this.assets.createUploadUrl(input, user.id);
  }
}
