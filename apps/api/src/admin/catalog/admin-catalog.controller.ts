import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Roles } from '../../auth/roles.decorator';
import { RolesGuard } from '../../auth/roles.guard';
import { AdminCatalogService } from './admin-catalog.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { CreateLicenseDto } from './dto/create-license.dto';
import { CreateTagDto } from './dto/create-tag.dto';

@Controller('admin/catalog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminCatalogController {
  constructor(@Inject(AdminCatalogService) private readonly catalog: AdminCatalogService) {}

  @Get('categories')
  categories() {
    return this.catalog.listCategories();
  }

  @Post('categories')
  createCategory(@Body() body: CreateCategoryDto) {
    return this.catalog.createCategory(body);
  }

  @Get('tags')
  tags() {
    return this.catalog.listTags();
  }

  @Post('tags')
  createTag(@Body() body: CreateTagDto) {
    return this.catalog.createTag(body);
  }

  @Get('licenses')
  licenses() {
    return this.catalog.listLicenses();
  }

  @Post('licenses')
  createLicense(@Body() body: CreateLicenseDto) {
    return this.catalog.createLicense(body);
  }
}
