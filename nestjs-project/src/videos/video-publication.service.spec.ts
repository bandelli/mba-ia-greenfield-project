import {
  VideoMissingTitleException,
  VideoNotFoundException,
  VideoNotReadyException,
} from '../common/exceptions/domain.exception';
import { Video, VideoStatus } from './entities/video.entity';
import { VideoPublicationService } from './video-publication.service';

function makeVideo(overrides: Partial<Video> = {}): Video {
  const v = new Video();
  v.id = 'uuid';
  v.public_id = 'pub123';
  v.user_id = 'owner-id';
  v.channel_id = 'channel-id';
  v.storage_key = 'videos/key.mp4';
  v.status = VideoStatus.READY;
  v.title = 'Existing title';
  v.published_at = null;
  return Object.assign(v, overrides);
}

function makeRepository(overrides: Record<string, jest.Mock> = {}): any {
  return {
    findOne: jest.fn(),
    save: jest.fn(),
    ...overrides,
  };
}

function makeStorageService(overrides: Record<string, jest.Mock> = {}): any {
  return {
    putObject: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

describe('VideoPublicationService', () => {
  describe('getOwnedVideo', () => {
    it("returns the owner's video", async () => {
      const video = makeVideo();
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      const result = await service.getOwnedVideo('pub123', 'owner-id');

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { public_id: 'pub123', user_id: 'owner-id' },
      });
      expect(result).toBe(video);
    });

    it('throws VideoNotFoundException when the video does not belong to the caller', async () => {
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      await expect(
        service.getOwnedVideo('pub123', 'someone-else'),
      ).rejects.toThrow(VideoNotFoundException);
    });
  });

  describe('updateFields', () => {
    it("updates the fields on the owner's video", async () => {
      const video = makeVideo();
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
        save: jest.fn().mockImplementation((v: Video) => Promise.resolve(v)),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      const result = await service.updateFields('pub123', 'owner-id', {
        title: 'New title',
      });

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { public_id: 'pub123', user_id: 'owner-id' },
      });
      expect(result.title).toBe('New title');
    });

    it('throws VideoNotFoundException when the video does not belong to the caller', async () => {
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      await expect(
        service.updateFields('pub123', 'someone-else', { title: 'x' }),
      ).rejects.toThrow(VideoNotFoundException);
    });
  });

  describe('publish', () => {
    it('sets published_at when the video is ready', async () => {
      const video = makeVideo({ status: VideoStatus.READY });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
        save: jest.fn().mockImplementation((v: Video) => Promise.resolve(v)),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      const result = await service.publish('pub123', 'owner-id', {});

      expect(result.published_at).toBeInstanceOf(Date);
    });

    it('throws VideoNotReadyException when status is not ready', async () => {
      const video = makeVideo({ status: VideoStatus.PROCESSING });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      await expect(service.publish('pub123', 'owner-id', {})).rejects.toThrow(
        VideoNotReadyException,
      );
    });

    it('throws VideoNotFoundException when the video does not belong to the caller', async () => {
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      await expect(
        service.publish('pub123', 'someone-else', {}),
      ).rejects.toThrow(VideoNotFoundException);
    });

    it('throws VideoMissingTitleException when the video has no title', async () => {
      const video = makeVideo({ title: null });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      await expect(service.publish('pub123', 'owner-id', {})).rejects.toThrow(
        VideoMissingTitleException,
      );
    });

    it('throws VideoMissingTitleException when the title is blank whitespace', async () => {
      const video = makeVideo({ title: '   ' });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      await expect(service.publish('pub123', 'owner-id', {})).rejects.toThrow(
        VideoMissingTitleException,
      );
    });

    it('does not overwrite published_at when the video is already published', async () => {
      const originalPublishedAt = new Date('2026-01-01T00:00:00.000Z');
      const video = makeVideo({ published_at: originalPublishedAt });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
        save: jest.fn().mockImplementation((v: Video) => Promise.resolve(v)),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      const result = await service.publish('pub123', 'owner-id', {});

      expect(result.published_at).toBe(originalPublishedAt);
    });
  });

  describe('replaceThumbnail', () => {
    it('overwrites the existing thumbnail_key without changing it', async () => {
      const video = makeVideo({ thumbnail_key: 'thumbnails/existing.png' });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
        save: jest.fn().mockImplementation((v: Video) => Promise.resolve(v)),
      });
      const storageService = makeStorageService();
      const service = new VideoPublicationService(repository, storageService);

      const result = await service.replaceThumbnail(
        'pub123',
        'owner-id',
        Buffer.from('new content'),
        'image/png',
      );

      expect(storageService.putObject).toHaveBeenCalledWith(
        'thumbnails/existing.png',
        Buffer.from('new content'),
        'image/png',
      );
      expect(repository.save).not.toHaveBeenCalled();
      expect(result.thumbnail_key).toBe('thumbnails/existing.png');
    });

    it('falls back to the worker naming convention and persists it when thumbnail_key is null', async () => {
      const video = makeVideo({ thumbnail_key: null });
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(video),
        save: jest.fn().mockImplementation((v: Video) => Promise.resolve(v)),
      });
      const storageService = makeStorageService();
      const service = new VideoPublicationService(repository, storageService);

      const result = await service.replaceThumbnail(
        'pub123',
        'owner-id',
        Buffer.from('new content'),
        'image/png',
      );

      expect(storageService.putObject).toHaveBeenCalledWith(
        'thumbnails/uuid.png',
        Buffer.from('new content'),
        'image/png',
      );
      expect(result.thumbnail_key).toBe('thumbnails/uuid.png');
    });

    it('throws VideoNotFoundException when the video does not belong to the caller', async () => {
      const repository = makeRepository({
        findOne: jest.fn().mockResolvedValue(null),
      });
      const service = new VideoPublicationService(
        repository,
        makeStorageService(),
      );

      await expect(
        service.replaceThumbnail(
          'pub123',
          'someone-else',
          Buffer.from('x'),
          'image/png',
        ),
      ).rejects.toThrow(VideoNotFoundException);
    });
  });
});
