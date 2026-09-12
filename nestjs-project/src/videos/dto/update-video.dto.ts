import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { VideoCategory, VideoVisibility } from '../entities/video.entity';

export class UpdateVideoDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsEnum(VideoCategory)
  category?: VideoCategory;

  @IsOptional()
  @IsEnum(VideoVisibility)
  visibility?: VideoVisibility;
}
