import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateAiDiscoverySessionDto {
  @IsOptional()
  @IsString()
  @MaxLength(160)
  title?: string;
}
