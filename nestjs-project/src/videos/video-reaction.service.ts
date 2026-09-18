import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Video } from './entities/video.entity';
import { ReactionType, VideoReaction } from './entities/video-reaction.entity';
import { VideosService } from './videos.service';
import {
  applyReactionCounterDelta,
  persistReactionToggle,
} from './reaction-toggle.util';

export interface ReactionResult {
  type: ReactionType | null;
  likesCount: number;
  dislikesCount: number;
}

// Owns the like/dislike toggle for videos (per social-interactions/TD-01,
// TD-02, TD-03) — a dedicated service, not folded into VideosService, since
// it owns a different entity (VideoReaction) and a different write path
// (per Single Responsibility).
@Injectable()
export class VideoReactionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly videosService: VideosService,
  ) {}

  // Idempotent "set state" contract (per social-interactions/TD-03, Option
  // A): the caller declares the reaction state they want to end up in.
  // Repeating the same request is a no-op; switching from one non-null type
  // to the other updates the existing row in place (never delete-then-
  // insert), so the counters move by exactly one increment/decrement pair
  // instead of passing through an intermediate "no reaction" state.
  async setReaction(
    userId: string,
    publicId: string,
    type: ReactionType | null,
  ): Promise<ReactionResult> {
    const video = await this.videosService.findPublicReadyVideo(publicId);

    return this.dataSource.transaction(async (manager) => {
      const reactionRepository = manager.getRepository(VideoReaction);
      const existing = await reactionRepository.findOne({
        where: { user_id: userId, video_id: video.id },
      });

      const previousType = await persistReactionToggle(
        manager,
        reactionRepository,
        existing,
        'insert_reaction',
        () =>
          reactionRepository.create({
            user_id: userId,
            video_id: video.id,
            type: type as ReactionType,
          }),
        () =>
          reactionRepository.findOneByOrFail({
            user_id: userId,
            video_id: video.id,
          }),
        type,
      );

      const counters = await applyReactionCounterDelta(
        manager,
        Video,
        video.id,
        previousType,
        type,
      );

      return { type, ...counters };
    });
  }
}
