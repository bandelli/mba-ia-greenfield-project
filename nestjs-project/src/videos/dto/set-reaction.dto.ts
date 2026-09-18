import { IsEnum, ValidateIf } from 'class-validator';
import { ReactionType } from '../entities/video-reaction.entity';

export class SetReactionDto {
  // `type` is required but nullable — `null` means "remove any existing
  // reaction" (per social-interactions/TD-03, Option A). @IsOptional() would
  // also accept a missing field, so validation is skipped only for the
  // explicit `null` value via @ValidateIf, keeping `undefined` rejected.
  @ValidateIf((dto: SetReactionDto) => dto.type !== null)
  @IsEnum(ReactionType)
  type: ReactionType | null;
}
