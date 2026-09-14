import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Not, Repository } from 'typeorm';
import { VideoNotFoundException } from '../common/exceptions/domain.exception';
import { Video, VideoStatus, VideoVisibility } from './entities/video.entity';

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
  published_at: Date | null;
  channel: { nickname: string; name: string };
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

const DEFAULT_SUGGESTED_LIMIT = 12;

// Owns read access to a video for delivery (streaming/download) — separate
// from VideoStatusService, which owns status transitions
// (per phase-03-videos/TD-07, TD-10).
@Injectable()
export class VideosService {
  constructor(
    @InjectRepository(Video)
    private readonly videoRepository: Repository<Video>,
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

  // Anonymous, `ready`+(`public`|`unlisted`) lookup keyed by the public
  // identifier (per phase-05-video-watch-page/TD-01) — a draft/processing/
  // error video, a genuinely private video, or an unknown public_id are all
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
      },
      relations: ['channel'],
    });
    if (!video) {
      throw new VideoNotFoundException();
    }
    return video;
  }

  // Anonymous public metadata lookup — every successful call atomically
  // increments `views` (per phase-05-video-watch-page/TD-02).
  async findPublicVideo(publicId: string): Promise<PublicVideoDetail> {
    const video = await this.findPublicReadyVideo(publicId);

    await this.videoRepository.increment({ id: video.id }, 'views', 1);

    return {
      id: video.id,
      public_id: video.public_id,
      title: video.title,
      description: video.description,
      category: video.category,
      visibility: video.visibility,
      duration_seconds: video.duration_seconds,
      thumbnail_key: video.thumbnail_key,
      views: video.views + 1,
      published_at: video.published_at,
      channel: {
        nickname: video.channel.nickname,
        name: video.channel.name,
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
}
