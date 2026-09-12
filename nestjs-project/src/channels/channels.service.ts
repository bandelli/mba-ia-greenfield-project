import { Injectable } from '@nestjs/common';
import { DataSource, IsNull, Not, QueryFailedError } from 'typeorm';
import {
  ChannelNicknameTakenException,
  ChannelNotFoundException,
} from '../common/exceptions/domain.exception';
import {
  Video,
  VideoStatus,
  VideoVisibility,
} from '../videos/entities/video.entity';
import { FindOwnerVideosQueryDto } from './dto/find-owner-videos-query.dto';
import { FindPublicVideosQueryDto } from './dto/find-public-videos-query.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';
import { appendRandomSuffix, sanitizeNickname } from './nickname.util';
import { Channel } from './entities/channel.entity';

export interface PublicChannelInfo {
  id: string;
  name: string;
  nickname: string;
  description: string | null;
  created_at: Date;
}

export interface OwnerVideoListItem {
  id: string;
  public_id: string;
  title: string | null;
  thumbnail_key: string | null;
  category: string;
  visibility: string;
  status: string;
  published_at: Date | null;
  views: number;
  likes: number;
  comments: number;
}

export interface PublicVideoListItem {
  id: string;
  public_id: string;
  title: string | null;
  thumbnail_key: string | null;
  duration_seconds: number | null;
  published_at: Date | null;
  views: number;
}

export interface PaginatedResult<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;

const PG_UNIQUE_VIOLATION = '23505';
const NICKNAME_COLUMN = 'nickname';
const MAX_RETRIES = 5;

interface PgDriverError {
  code?: string;
  detail?: string;
}

function isPgUniqueViolationOnColumn(err: unknown, column: string): boolean {
  if (!(err instanceof QueryFailedError)) return false;
  const e = err as QueryFailedError & PgDriverError;
  return (
    e.code === PG_UNIQUE_VIOLATION &&
    typeof e.detail === 'string' &&
    e.detail.includes(column)
  );
}

// Postgres treats `%` and `_` as LIKE/ILIKE wildcards and `\` as the default
// escape character — a search term containing any of them must have that
// character escaped, or it silently changes the query's matching semantics
// instead of being treated as a literal substring.
function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (char) => `\\${char}`);
}

@Injectable()
export class ChannelsService {
  constructor(private readonly dataSource: DataSource) {}

  // Every user has exactly one channel, auto-created at registration
  // (phase-01-configuracao-base) — absence signals a data-integrity bug,
  // not a normal domain outcome, so this fails loudly rather than
  // returning null (per .claude/rules/typeorm-queries.md's findOneOrFail
  // guidance for genuinely exceptional absence).
  async findByUserId(userId: string): Promise<Channel> {
    return this.dataSource
      .getRepository(Channel)
      .findOneByOrFail({ user_id: userId });
  }

  private async findChannelByNicknameOrFail(
    nickname: string,
  ): Promise<Channel> {
    const channel = await this.dataSource
      .getRepository(Channel)
      .findOne({ where: { nickname } });
    if (!channel) {
      throw new ChannelNotFoundException();
    }
    return channel;
  }

  async findPublicChannelInfo(nickname: string): Promise<PublicChannelInfo> {
    const channel = await this.findChannelByNicknameOrFail(nickname);
    return {
      id: channel.id,
      name: channel.name,
      nickname: channel.nickname,
      description: channel.description,
      created_at: channel.created_at,
    };
  }

  async createChannel(userId: string, email: string): Promise<Channel> {
    const baseNickname = sanitizeNickname(email.split('@')[0]);

    return this.dataSource.transaction(async (manager) => {
      let nickname = baseNickname;

      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        const existing = await manager.findOne(Channel, {
          where: { nickname },
        });
        if (existing) {
          nickname = appendRandomSuffix(baseNickname);
          continue;
        }

        try {
          return await manager.save(
            manager.create(Channel, {
              name: baseNickname,
              nickname,
              user_id: userId,
            }),
          );
        } catch (err) {
          if (isPgUniqueViolationOnColumn(err, NICKNAME_COLUMN)) {
            // Concurrent insert between pre-check and save — retry with new suffix
            nickname = appendRandomSuffix(baseNickname);
          } else {
            throw err;
          }
        }
      }

      throw new Error(
        'Nickname conflict could not be resolved after max retries',
      );
    });
  }

  // Unlike createChannel's auto-suffix collision handling, an owner-driven
  // edit must surface the collision to the caller as 409 instead of picking
  // a different nickname silently (per phase-04-video-channel-management/TD-04).
  async updateOwnChannel(
    userId: string,
    dto: UpdateChannelDto,
  ): Promise<Channel> {
    const repository = this.dataSource.getRepository(Channel);
    const channel = await repository.findOneByOrFail({ user_id: userId });

    if (dto.nickname && dto.nickname !== channel.nickname) {
      const existing = await repository.findOne({
        where: { nickname: dto.nickname },
      });
      if (existing) {
        throw new ChannelNicknameTakenException();
      }
    }

    Object.assign(channel, dto);

    try {
      return await repository.save(channel);
    } catch (err) {
      if (isPgUniqueViolationOnColumn(err, NICKNAME_COLUMN)) {
        throw new ChannelNicknameTakenException();
      }
      throw err;
    }
  }

  // views/likes/comments are fixed at 0 — those subsystems (view tracking,
  // likes, comments) don't exist until Phase 05/06 (per
  // phase-04-video-channel-management/TD-05).
  async findVideosForOwner(
    userId: string,
    query: FindOwnerVideosQueryDto,
  ): Promise<PaginatedResult<OwnerVideoListItem>> {
    const channel = await this.findByUserId(userId);
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const qb = this.dataSource
      .getRepository(Video)
      .createQueryBuilder('video')
      .where('video.channel_id = :channelId', { channelId: channel.id });

    if (query.visibility) {
      qb.andWhere('video.visibility = :visibility', {
        visibility: query.visibility,
      });
    }
    if (query.search) {
      qb.andWhere('video.title ILIKE :search', {
        search: `%${escapeLikePattern(query.search)}%`,
      });
    }

    qb.orderBy('video.created_at', query.sort === 'oldest' ? 'ASC' : 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [videos, total] = await qb.getManyAndCount();

    return {
      items: videos.map((video) => ({
        id: video.id,
        public_id: video.public_id,
        title: video.title,
        thumbnail_key: video.thumbnail_key,
        category: video.category,
        visibility: video.visibility,
        status: video.status,
        published_at: video.published_at,
        views: 0,
        likes: 0,
        comments: 0,
      })),
      page,
      limit,
      total,
    };
  }

  // `sort: "popular"` has no real signal yet — view tracking is Phase 05
  // scope (per phase-04-video-channel-management/TD-05) — so it currently
  // falls back to the same ordering as "latest".
  async findPublicVideos(
    nickname: string,
    query: FindPublicVideosQueryDto,
  ): Promise<PaginatedResult<PublicVideoListItem>> {
    const channel = await this.findChannelByNicknameOrFail(nickname);
    const page = query.page ?? DEFAULT_PAGE;
    const limit = query.limit ?? DEFAULT_LIMIT;

    const [videos, total] = await this.dataSource
      .getRepository(Video)
      .findAndCount({
        where: {
          channel_id: channel.id,
          status: VideoStatus.READY,
          visibility: VideoVisibility.PUBLIC,
          published_at: Not(IsNull()),
        },
        order: { published_at: query.sort === 'oldest' ? 'ASC' : 'DESC' },
        skip: (page - 1) * limit,
        take: limit,
      });

    return {
      items: videos.map((video) => ({
        id: video.id,
        public_id: video.public_id,
        title: video.title,
        thumbnail_key: video.thumbnail_key,
        duration_seconds: video.duration_seconds,
        published_at: video.published_at,
        views: 0,
      })),
      page,
      limit,
      total,
    };
  }
}
