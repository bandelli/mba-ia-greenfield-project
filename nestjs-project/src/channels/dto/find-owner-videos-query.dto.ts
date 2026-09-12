import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { VideoVisibility } from '../../videos/entities/video.entity';

const MAX_LIMIT = 100;

export class FindOwnerVideosQueryDto {
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
  @IsIn(Object.values(VideoVisibility))
  visibility?: VideoVisibility;

  @IsOptional()
  @IsIn(['latest', 'oldest'])
  sort?: 'latest' | 'oldest';

  @IsOptional()
  @IsString()
  search?: string;
}
