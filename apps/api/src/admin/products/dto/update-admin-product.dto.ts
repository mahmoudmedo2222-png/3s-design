import { PartialType } from '@nestjs/mapped-types';
import { CreateAdminProductDto } from './create-admin-product.dto';

export class UpdateAdminProductDto extends PartialType(CreateAdminProductDto) {}
