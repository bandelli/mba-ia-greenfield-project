import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateChannelDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  @Matches(/^[a-z0-9_]+$/)
  nickname?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;
}
