import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { BestSellersQueryDto } from './dto/best-sellers-query.dto';
import { ListProductsQueryDto } from './dto/list-products-query.dto';
import { ProductsService } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(@Inject(ProductsService) private readonly products: ProductsService) {}

  @Get()
  list(@Query() query: ListProductsQueryDto) {
    return this.products.list(query);
  }

  @Get('best-sellers')
  bestSellers(@Query() query: BestSellersQueryDto) {
    return this.products.bestSellers(query);
  }

  @Get(':slug')
  findBySlug(@Param('slug') slug: string) {
    return this.products.findBySlug(slug);
  }
}
