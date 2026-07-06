import { ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class SetProductTagsDto {
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  tagIds!: string[];
}
