import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiDiscoveryModule } from './ai-discovery/ai-discovery.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AdminAssetsModule } from './admin/assets/admin-assets.module';
import { AdminCatalogModule } from './admin/catalog/admin-catalog.module';
import { AdminProductsModule } from './admin/products/admin-products.module';
import { AuthModule } from './auth/auth.module';
import { CustomerProfileModule } from './customer-profile/customer-profile.module';
import { DatabaseModule } from './database/database.module';
import { DownloadsModule } from './downloads/downloads.module';
import { HealthModule } from './health/health.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { ProductsModule } from './products/products.module';
import { RefundsModule } from './refunds/refunds.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['../../.env.local', '.env.local', '../../.env', '.env'],
    }),
    AiDiscoveryModule,
    AnalyticsModule,
    AuthModule,
    CustomerProfileModule,
    DatabaseModule,
    DownloadsModule,
    HealthModule,
    AdminAssetsModule,
    AdminCatalogModule,
    AdminProductsModule,
    OrdersModule,
    PaymentsModule,
    ProductsModule,
    RefundsModule,
  ],
})
export class AppModule {}
