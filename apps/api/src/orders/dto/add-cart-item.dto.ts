import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AddCartItemDto {
  @IsUUID('4')
  productId!: string;

  @IsOptional()
  @IsUUID('4')
  variantId?: string;

  @IsUUID('4')
  licenseId!: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(1)
  quantity = 1;
}
