import { IsOptional, IsNumber, Min, Max, IsEnum } from 'class-validator';
import { Transform } from 'class-transformer';

export enum SortBy {
  TIME = 'time',
  MAGNITUDE = 'magnitude',
  SIGNIFICANCE = 'significance',
}

export class ListEarthquakesDto {
  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  @IsNumber()
  @Min(0)
  @Max(10)
  minMagnitude?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseFloat(value) : undefined))
  @IsNumber()
  @Min(0)
  @Max(10)
  maxMagnitude?: number;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  @IsNumber()
  @Min(1)
  @Max(30)
  days?: number = 7;

  @IsOptional()
  @IsEnum(SortBy)
  sortBy?: SortBy = SortBy.TIME;

  @IsOptional()
  @Transform(({ value }) => (value !== undefined ? parseInt(value) : undefined))
  @IsNumber()
  @Min(1)
  @Max(500)
  limit?: number = 100;
}
