import { Inject, Injectable, Logger, NestMiddleware } from '@nestjs/common';
import type { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Server } from '@tus/server';
import { S3Store } from '@tus/s3-store';
import type { NextFunction, Request, Response } from 'express';
import { BEARER_PREFIX } from '../auth/auth.constants';
import { JwtPayload } from '../auth/auth.types';
import { DomainException } from '../common/exceptions/domain.exception';
import { UploadUnauthenticatedException } from '../common/exceptions/domain.exception';
import storageConfig from '../config/storage.config';
import type { Video } from './entities/video.entity';
import { VideoUploadService } from './video-upload.service';
import { MAX_UPLOAD_SIZE_BYTES, TUS_UPLOAD_PATH } from './videos.constants';

interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

// Authenticates the tus upload session (per phase-03-videos/TD-06 Revision,
// 2026-09-08) before the raw tus protocol handler runs. tus is mounted as
// Express middleware (per TD-06), outside Nest's controller/guard pipeline,
// so authentication is re-implemented here at the middleware layer instead
// of the JwtAuthGuard used by ordinary controllers — same verification
// logic (JwtService + BEARER_PREFIX), different layer.
@Injectable()
export class TusAuthMiddleware implements NestMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction,
  ): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) {
      next(new UploadUnauthenticatedException());
      return;
    }

    const token = authHeader.slice(BEARER_PREFIX.length);

    try {
      req.user = await this.jwtService.verifyAsync<JwtPayload>(token);
      next();
    } catch {
      next(new UploadUnauthenticatedException());
    }
  }
}

// Mounts the tus 1.0 protocol server (per phase-03-videos/TD-06) — must run
// after TusAuthMiddleware on the same route so `req.user` is populated.
@Injectable()
export class TusServerMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TusServerMiddleware.name);
  private readonly server: Server;

  constructor(
    @Inject(storageConfig.KEY)
    config: ConfigType<typeof storageConfig>,
    private readonly videoUploadService: VideoUploadService,
  ) {
    this.server = new Server({
      path: TUS_UPLOAD_PATH,
      // Relative (path-only) Location header — the frontend's BFF proxy
      // (next-frontend/app/api/videos/uploads) rewrites the path prefix to
      // its own same-origin route; an absolute upstream host/port in the
      // header would leak this service's internal address to the browser.
      relativeLocation: true,
      maxSize: MAX_UPLOAD_SIZE_BYTES,
      datastore: new S3Store({
        s3ClientConfig: {
          bucket: config.bucket,
          region: config.region,
          endpoint: config.endpoint,
          forcePathStyle: config.forcePathStyle,
          credentials: {
            accessKeyId: config.accessKeyId,
            secretAccessKey: config.secretAccessKey,
          },
        },
      }),
      onUploadCreate: async (req, upload) => {
        const user = this.getAuthenticatedUser(req);
        try {
          await this.videoUploadService.createDraft(
            user!.sub,
            upload.id,
            upload.metadata ?? {},
          );
        } catch (error) {
          // tus's hook contract requires throwing a plain
          // { status_code, body } object (not an Error) to control the
          // HTTP response sent back to the client — see
          // https://github.com/tus/tus-node-server/blob/main/_autodocs/errors.md
          // eslint-disable-next-line @typescript-eslint/only-throw-error
          throw this.toTusError(error);
        }
        return {};
      },
      onUploadFinish: async (_req, upload) => {
        let video: Video;
        try {
          video = await this.videoUploadService.finalizeUpload(upload.id);
        } catch (error) {
          // eslint-disable-next-line @typescript-eslint/only-throw-error -- see onUploadCreate above.
          throw this.toTusError(error);
        }
        // The tus protocol carries no response body/metadata back to the
        // client on its own, so this is the only channel the uploading
        // browser has to learn the video it just created — the BFF/frontend
        // reads this header to redirect into the edit flow.
        return { headers: { 'X-Video-Public-Id': video.public_id } };
      },
    });
  }

  use(req: Request, res: Response): void {
    void this.server.handle(req, res);
  }

  // @tus/server (via its `srvx` request adapter) wraps the raw Express
  // request before invoking hooks, so `req.user` set by TusAuthMiddleware is
  // not directly on the hook's `req` param — it is reachable through the
  // adapter's `runtime.node.req` back-reference to the original Node/Express
  // request instance.
  private getAuthenticatedUser(req: unknown): JwtPayload | undefined {
    const nodeReq = (
      req as { runtime?: { node?: { req?: AuthenticatedRequest } } }
    ).runtime?.node?.req;
    return nodeReq?.user;
  }

  private toTusError(error: unknown): { status_code: number; body: string } {
    if (error instanceof DomainException) {
      return {
        status_code: error.httpStatus,
        body: JSON.stringify({
          statusCode: error.httpStatus,
          error: error.errorCode,
          message: error.message,
        }),
      };
    }
    this.logger.error(error);
    // TEMP diagnostic — a generic 500 is happening here specifically when
    // this endpoint is hit through next-frontend's BFF proxy in CI (not
    // locally, not via this project's own supertest e2e specs); the
    // redirected dev-server log isn't flushed by the time the CI job reads
    // it, so echo the real error into the body instead — visible via the
    // Playwright trace the failing test already captures. Revert to the
    // generic message once root-caused.
    return {
      status_code: 500,
      body: JSON.stringify({
        statusCode: 500,
        message: error instanceof Error ? error.message : 'Internal error',
        tusProxyDebugName: error instanceof Error ? error.name : typeof error,
        tusProxyDebugStack: error instanceof Error ? error.stack : undefined,
      }),
    };
  }
}
