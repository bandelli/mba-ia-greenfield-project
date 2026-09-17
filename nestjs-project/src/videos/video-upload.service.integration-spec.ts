import { DataSource, Repository } from 'typeorm';
import { ChannelsService } from '../channels/channels.service';
import { Channel } from '../channels/entities/channel.entity';
import {
  UploadContentValidationFailedException,
  UploadInvalidFileTypeException,
} from '../common/exceptions/domain.exception';
import {
  cleanAllTables,
  createTestDataSource,
  ALL_APP_ENTITIES,
} from '../test/create-test-data-source';
import { User } from '../users/entities/user.entity';
import { Video, VideoStatus } from './entities/video.entity';
import { VideoUploadService } from './video-upload.service';

describe('VideoUploadService (integration)', () => {
  let dataSource: DataSource;
  let userRepository: Repository<User>;
  let videoRepository: Repository<Video>;
  let channelsService: ChannelsService;
  let storageServiceMock: { deleteObject: jest.Mock };
  let videoProcessingServiceMock: { extractMetadata: jest.Mock };
  let queueServiceMock: { send: jest.Mock };
  let service: VideoUploadService;

  beforeAll(async () => {
    dataSource = createTestDataSource(ALL_APP_ENTITIES);
    await dataSource.initialize();
    userRepository = dataSource.getRepository(User);
    videoRepository = dataSource.getRepository(Video);
    channelsService = new ChannelsService(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  beforeEach(async () => {
    await cleanAllTables(dataSource);

    storageServiceMock = {
      deleteObject: jest.fn().mockResolvedValue(undefined),
    };
    videoProcessingServiceMock = { extractMetadata: jest.fn() };
    queueServiceMock = { send: jest.fn().mockResolvedValue('job-id') };

    service = new VideoUploadService(
      videoRepository,
      channelsService,
      storageServiceMock as never,
      videoProcessingServiceMock as never,
      { markProcessing: jest.fn().mockResolvedValue(undefined) } as never,
      queueServiceMock as never,
    );
  });

  let userCounter = 0;
  async function createOwner(): Promise<{ user: User; channel: Channel }> {
    const n = ++userCounter;
    const user = await userRepository.save(
      userRepository.create({
        email: `upload_owner_${n}@example.com`,
        password: 'hashed',
      }),
    );
    const channel = await channelsService.createChannel(user.id, user.email);
    return { user, channel };
  }

  describe('createDraft', () => {
    it('rejects a declared non-video file type without persisting a draft', async () => {
      const { user } = await createOwner();

      await expect(
        service.createDraft(user.id, 'videos/key.pdf', {
          filetype: 'application/pdf',
        }),
      ).rejects.toThrow(UploadInvalidFileTypeException);

      expect(await videoRepository.count()).toBe(0);
    });

    it('rejects when Upload-Metadata declares no filetype at all', async () => {
      const { user } = await createOwner();

      await expect(
        service.createDraft(user.id, 'videos/key.mp4', {}),
      ).rejects.toThrow(UploadInvalidFileTypeException);
    });

    it('creates a draft owned by the caller and their channel for a declared video type', async () => {
      const { user, channel } = await createOwner();

      const video = await service.createDraft(user.id, 'videos/key.mp4', {
        filetype: 'video/mp4',
      });

      expect(video.user_id).toBe(user.id);
      expect(video.channel_id).toBe(channel.id);
      expect(video.storage_key).toBe('videos/key.mp4');
      expect(video.status).toBe(VideoStatus.DRAFT);
    });
  });

  describe('finalizeUpload', () => {
    async function createDraftVideo(storageKey: string): Promise<Video> {
      const { user, channel } = await createOwner();
      return videoRepository.save(
        videoRepository.create({
          user_id: user.id,
          channel_id: channel.id,
          storage_key: storageKey,
        }),
      );
    }

    it('marks the video processing and enqueues the job on success', async () => {
      const video = await createDraftVideo('videos/valid-key.mp4');
      videoProcessingServiceMock.extractMetadata.mockResolvedValue({
        format: { duration: 5 },
        streams: [],
      });

      await service.finalizeUpload('videos/valid-key.mp4');

      expect(queueServiceMock.send).toHaveBeenCalledWith('video.uploaded', {
        videoId: video.id,
      });
      expect(storageServiceMock.deleteObject).not.toHaveBeenCalled();
    });

    it('deletes the object and the draft, then throws, when ffprobe rejects the content', async () => {
      const video = await createDraftVideo('videos/invalid-key.mp4');
      videoProcessingServiceMock.extractMetadata.mockRejectedValue(
        new Error('not a video'),
      );

      await expect(
        service.finalizeUpload('videos/invalid-key.mp4'),
      ).rejects.toThrow(UploadContentValidationFailedException);

      expect(storageServiceMock.deleteObject).toHaveBeenCalledWith(
        'videos/invalid-key.mp4',
      );
      expect(await videoRepository.findOneBy({ id: video.id })).toBeNull();
      expect(queueServiceMock.send).not.toHaveBeenCalled();
    });
  });
});
