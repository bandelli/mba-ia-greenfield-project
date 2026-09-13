import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

const MAX_LIMIT = 100;

export class FindPublicVideosQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(MAX_LIMIT)
  limit?: number;

  @IsOptional()
  @IsIn(['latest', 'popular', 'oldest'])
  sort?: 'latest' | 'popular' | 'oldest';
}
