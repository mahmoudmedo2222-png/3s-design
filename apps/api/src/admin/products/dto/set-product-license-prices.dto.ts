import { Type } from 'class-transformer';
import { ArrayUnique, IsArray, IsNumberString, IsOptional, IsString, IsUUID, Length, ValidateNested } from 'class-validator';

class ProductLicensePriceInput {
  @IsUUID('4')
  licenseId!: string;

  @IsNumberString()
  price!: string;

  @IsOptional()
  @IsString()
  @Length(3, 3)
  currency = 'USD';
}

export class SetProductLicensePricesDto {
  @IsArray()
  @ArrayUnique((item: ProductLicensePriceInput) => item.licenseId)
  @ValidateNested({ each: true })
  @Type(() => ProductLicensePriceInput)
  prices!: ProductLicensePriceInput[];
}
