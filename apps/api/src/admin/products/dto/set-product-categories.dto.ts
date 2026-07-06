import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetProductCategoriesDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  categoryIds!: string[];
}
