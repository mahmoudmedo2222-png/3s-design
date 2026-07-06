import { Body, Controller, Get, Inject, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import type { AuthUser } from '../../auth/auth.types';
import { CurrentUser } from '../../auth/current-user.decorator';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminProductsService } from './admin-products.service';
import { CreateAdminProductDto } from './dto/create-admin-product.dto';
import { CreateProductAssetDto } from './dto/create-product-asset.dto';
import { CreateProductAttributeDto } from './dto/create-product-attribute.dto';
import { CreateProductVariantDto } from './dto/create-product-variant.dto';
import { SetProductCategoriesDto } from './dto/set-product-categories.dto';
import { SetProductLicensePricesDto } from './dto/set-product-license-prices.dto';
import { SetProductTagsDto } from './dto/set-product-tags.dto';
import { UpdateAdminProductDto } from './dto/update-admin-product.dto';

@Controller('admin/products')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminProductsController {
  constructor(@Inject(AdminProductsService) private readonly products: AdminProductsService) {}

  @Get()
  list() {
    return this.products.list();
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() body: CreateAdminProductDto) {
    return this.products.create(body, user.id);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: UpdateAdminProductDto) {
    return this.products.update(id, body, user.id);
  }

  @Get(':id/publishing-checks')
  getPublishingChecks(@Param('id') id: string) {
    return this.products.getPublishingChecks(id);
  }

  @Post(':id/publish')
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.publish(id, user.id);
  }

  @Post(':id/unpublish')
  unpublish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.products.unpublish(id, user.id);
  }

  @Post(':id/variants')
  createVariant(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: CreateProductVariantDto) {
    return this.products.createVariant(id, body, user.id);
  }

  @Post(':id/assets')
  createAsset(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: CreateProductAssetDto) {
    return this.products.createAsset(id, body, user.id);
  }

  @Post(':id/attributes')
  createAttribute(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: CreateProductAttributeDto) {
    return this.products.createAttribute(id, body, user.id);
  }

  @Put(':id/categories')
  setCategories(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: SetProductCategoriesDto) {
    return this.products.setCategories(id, body, user.id);
  }

  @Put(':id/tags')
  setTags(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: SetProductTagsDto) {
    return this.products.setTags(id, body, user.id);
  }

  @Put(':id/license-prices')
  setLicensePrices(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() body: SetProductLicensePricesDto) {
    return this.products.setLicensePrices(id, body, user.id);
  }
}
