import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { VideoNotFoundException } from '../common/exceptions/domain.exception';
import { FindHomeFeedQueryDto } from './dto/find-home-feed-query.dto';
import {
  Video,
  VideoCategory,
  VideoStatus,
  VideoVisibility,
} from './entities/video.entity';
import { ReactionType, VideoReaction } from './entities/video-reaction.entity';

export interface PublicVideoDetail {
  id: string;
  public_id: string;
  title: string | null;
  description: string | null;
  category: string;
  visibility: string;
  duration_seconds: number | null;
  thumbnail_key: string | null;
  views: number;
  likesCount: number;
  dislikesCount: number;
  // Present only when the caller authenticated via `@OptionalAuth()`;
  // anonymous callers always get `null` (per social-interactions/TD-01,
  // same pattern as CommentsService.findComments' currentUserReaction).
  currentUserReaction: ReactionType | null;
  published_at: Date | null;
  channel: { nickname: string; name: string; subscribersCount: number };
}

export interface SuggestedVideoItem {
  id: string;
  public_id: string;
  title: string | null;
  thumbnail_key: string | null;
  duration_seconds: number | null;
  views: number;
  published_at: Date | null;
  channel: { nickname: string; name: string };
}

export interface HomeFeedItem {
  public_id: string;
  title: string | null;
  thumbnail_key: string | null;
  duration_seconds: number | null;
  views: number;
  published_at: Date | null;
  category: VideoCategory;
  channel: { nickname: string; name: string };
}

export interface HomeFeedResult {
  items: HomeFeedItem[];
  total: number;
  page: number;
  limit: number;
}

const DEFAULT_SUGGESTED_LIMIT = 12;
const HOME_FEED_DEFAULT_PAGE = 1;
const HOME_FEED_DEFAULT_LIMIT = 24;

// Owns read access to a video for delivery (streaming/download) — separate
// from VideoStatusService, which owns status transitions
// (per phase-03-videos/TD-07, TD-10).
@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
    @InjectRepository(VideoReaction)
    private readonly videoReactionRepository: Repository<VideoReaction>,
  ) {}

  // Owner-only, `ready`-only lookup keyed by the public identifier (per
  // phase-03-videos/TD-05) — a draft/processing/error video, a video owned
  // by someone else, or an unknown public_id are all indistinguishable 404s
  // (per phase-03-videos/TD-10; visibility beyond owner is Phase 04 scope).
  async findOwnedReadyVideo(publicId: string, userId: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: {
        public_id: publicId,
        user_id: userId,
        status: VideoStatus.READY,
      },
    });
    if (!video) {
      throw new VideoNotFoundException();
    }
    return video;
  }

  // Anonymous, `ready`+(`public`|`unlisted`)+published lookup keyed by the
  // public identifier (per phase-05-video-watch-page/TD-01) — a draft/
  // processing/error video, a genuinely private video, a ready-but-not-yet-
  // published video (owner hasn't clicked "Publish" — `published_at` still
  // null, same gate `findSuggestedVideos` and `channels.service.ts`'s public
  // listing already enforce), or an unknown public_id are all
  // indistinguishable 404s, same non-disclosure principle as the owner-only
  // lookup above. Shared by the metadata, stream-url, and download-url public
  // endpoints; does NOT increment `views` — per phase-05-video-watch-page/TD-02
  // only the metadata endpoint (findPublicVideo below) does that, since a
  // single page load fetches metadata + stream-url + download-url together
  // and must count as exactly one view.
  async findPublicReadyVideo(publicId: string): Promise<Video> {
    const video = await this.videoRepository.findOne({
      where: {
        public_id: publicId,
        status: VideoStatus.READY,
        visibility: In([VideoVisibility.PUBLIC, VideoVisibility.UNLISTED]),
        published_at: Not(IsNull()),
      },
      relations: ['channel'],
    });
    if (!video) {
      throw new VideoNotFoundException();
    }
    return video;
  }

  // Anonymous public metadata lookup — every successful call atomically
  // increments `views` (per phase-05-video-watch-page/TD-02). Uses a single
  // atomic UPDATE...RETURNING so the count in the response is the real
  // post-increment value even under concurrent requests for the same video
  // (repository.increment() + reading the pre-increment entity's `views + 1`
  // would under-report whichever request's read lost the race).
  async findPublicVideo(
    publicId: string,
    currentUserId?: string,
  ): Promise<PublicVideoDetail> {
    const video = await this.findPublicReadyVideo(publicId);

    const updateResult = await this.videoRepository
      .createQueryBuilder()
      .update(Video)
      .set({ views: () => 'views + 1' })
      .where('id = :id', { id: video.id })
      .returning(['views'])
      .execute();
    const [{ views }] = updateResult.raw as { views: number }[];

    const currentUserReaction = currentUserId
      ? ((
          await this.videoReactionRepository.findOne({
            where: { user_id: currentUserId, video_id: video.id },
          })
        )?.type ?? null)
      : null;

    return {
      id: video.id,
      public_id: video.public_id,
      title: video.title,
      description: video.description,
      category: video.category,
      visibility: video.visibility,
      duration_seconds: video.duration_seconds,
      thumbnail_key: video.thumbnail_key,
      views,
      // per social-interactions/TD-01 — denormalized atomic counters kept
      // in sync by VideoReactionService's writes.
      likesCount: video.likes_count,
      dislikesCount: video.dislikes_count,
      currentUserReaction,
      published_at: video.published_at,
      channel: {
        nickname: video.channel.nickname,
        name: video.channel.name,
        // per social-interactions/TD-01 — denormalized atomic counter,
        // same column `channels.service.ts`'s public channel endpoint reads.
        subscribersCount: video.channel.subscribers_count,
      },
    };
  }

  // Same-category recommendations for the watch page sidebar (per
  // phase-05-video-watch-page/TD-03, reusing phase-04-video-channel-management/
  // TD-05's ready+public+published predicate). Only ever surfaces `public`
  // videos — an `unlisted` video is never suggested as someone else's
  // recommendation, even though it can itself be the anchor.
  async findSuggestedVideos(
    publicId: string,
    limit?: number,
  ): Promise<SuggestedVideoItem[]> {
    const anchor = await this.findPublicReadyVideo(publicId);

    const videos = await this.videoRepository.find({
      where: {
        category: anchor.category,
        status: VideoStatus.READY,
        visibility: VideoVisibility.PUBLIC,
        published_at: Not(IsNull()),
        id: Not(anchor.id),
      },
      relations: ['channel'],
      order: { published_at: 'DESC' },
      take: limit ?? DEFAULT_SUGGESTED_LIMIT,
    });

    return videos.map((video) => ({
      id: video.id,
      public_id: video.public_id,
      title: video.title,
      thumbnail_key: video.thumbnail_key,
      duration_seconds: video.duration_seconds,
      views: video.views,
      published_at: video.published_at,
      channel: {
        nickname: video.channel.nickname,
        name: video.channel.name,
      },
    }));
  }

  // Global cross-channel feed for the home page — search by title/channel
  // (ILIKE, backed by the pg_trgm trigram indexes from SI-07.1) and optional
  // category filter, offset/limit pagination (per home-search-launch/TD-01,
  // TD-02 — TD-02 deliberately keeps the offset/limit contract already
  // established by phase-04-video-channel-management/TD-05 rather than
  // switching to cursor pagination).
  async findHomeFeed(query: FindHomeFeedQueryDto): Promise<HomeFeedResult> {
    const page = query.page ?? HOME_FEED_DEFAULT_PAGE;
    const limit = query.limit ?? HOME_FEED_DEFAULT_LIMIT;

    const qb = this.videoRepository
      .createQueryBuilder('video')
      .innerJoinAndSelect('video.channel', 'channel')
      .where('video.status = :status', { status: VideoStatus.READY })
      .andWhere('video.visibility = :visibility', {
        visibility: VideoVisibility.PUBLIC,
      })
      .andWhere('video.published_at IS NOT NULL');

    if (query.category) {
      qb.andWhere('video.category = :category', { category: query.category });
    }

    if (query.q) {
      qb.andWhere(
        '(video.title ILIKE :q OR channel.name ILIKE :q OR channel.nickname ILIKE :q)',
        { q: `%${query.q}%` },
      );
    }

    const [videos, total] = await qb
      .orderBy('video.published_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items: videos.map((video) => ({
        public_id: video.public_id,
        title: video.title,
        thumbnail_key: video.thumbnail_key,
        duration_seconds: video.duration_seconds,
        views: video.views,
        published_at: video.published_at,
        category: video.category,
        channel: {
          nickname: video.channel.nickname,
          name: video.channel.name,
        },
      })),
      total,
      page,
      limit,
    };
  }
}
