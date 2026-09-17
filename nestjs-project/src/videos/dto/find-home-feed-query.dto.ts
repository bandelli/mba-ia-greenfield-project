import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { VideoCategory } from '../entities/video.entity';

export const HOME_FEED_MAX_LIMIT = 48;
export const HOME_FEED_DEFAULT_LIMIT = 24;
export const HOME_FEED_DEFAULT_PAGE = 1;
export const HOME_FEED_QUERY_MAX_LENGTH = 200;

// Query contract for the global home feed listing (per home-search-launch/TD-01, TD-02).
export class FindHomeFeedQueryDto {
  @IsOptional()
  @IsEnum(VideoCategory)
  category?: VideoCategory;

  @IsOptional()
  @IsString()
  @MaxLength(HOME_FEED_QUERY_MAX_LENGTH)
  q?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(HOME_FEED_MAX_LIMIT)
  limit?: number;
}
