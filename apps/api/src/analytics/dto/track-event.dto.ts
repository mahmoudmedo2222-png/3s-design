import { IsIn, IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

export const allowedAnalyticsEvents = [
  'home_intent_selected',
  'search_started',
  'search_completed',
  'search_result_clicked',
  'product_viewed',
  'product_license_selected',
  'product_add_to_cart_attempted',
  'product_add_to_cart_succeeded',
  'checkout_confirmation_toggled',
  'checkout_order_attempted',
  'checkout_order_created',
  'download_receipt_copied',
  'download_asset_requested',
] as const;

export type AnalyticsEventName = (typeof allowedAnalyticsEvents)[number];

export class TrackEventDto {
  @IsIn(allowedAnalyticsEvents)
  name!: AnalyticsEventName;

  @IsString()
  @MaxLength(140)
  sessionId!: string;

  @IsString()
  @MaxLength(260)
  path!: string;

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>;
}
