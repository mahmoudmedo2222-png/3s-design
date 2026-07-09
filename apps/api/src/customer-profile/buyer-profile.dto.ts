import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ValidateNested } from 'class-validator';

const confidenceValues = ['fresh', 'warming', 'strong'] as const;
const stageValues = ['new', 'exploring', 'deciding'] as const;

export class BuyerProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(180)
  signature?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  colors?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  styles?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  moods?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  useCases?: string[];

  @IsOptional()
  @IsIn(confidenceValues)
  confidence?: (typeof confidenceValues)[number];

  @IsOptional()
  @IsIn(stageValues)
  stage?: (typeof stageValues)[number];

  @IsOptional()
  @IsString()
  @MaxLength(220)
  nextAction?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(8)
  @IsString({ each: true })
  @MaxLength(120, { each: true })
  reasons?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(16)
  @IsString({ each: true })
  @MaxLength(80, { each: true })
  terms?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(280)
  prompt?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000)
  eventCount?: number;
}

export class UpdateBuyerProfileDto {
  @IsObject()
  @ValidateNested()
  @Type(() => BuyerProfileDto)
  profile!: BuyerProfileDto;
}
