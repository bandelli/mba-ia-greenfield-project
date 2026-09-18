export abstract class DomainException extends Error {
  constructor(
    public readonly errorCode: string,
    public readonly httpStatus: number,
    message: string,
  ) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class EmailAlreadyExistsException extends DomainException {
  constructor() {
    super('EMAIL_ALREADY_EXISTS', 409, 'Email is already registered');
  }
}

export class InvalidCredentialsException extends DomainException {
  constructor() {
    super('INVALID_CREDENTIALS', 401, 'Invalid email or password');
  }
}

export class EmailNotConfirmedException extends DomainException {
  constructor() {
    super('EMAIL_NOT_CONFIRMED', 403, 'Email address has not been confirmed');
  }
}

export class InvalidTokenException extends DomainException {
  constructor() {
    super('INVALID_TOKEN', 401, 'Token is invalid');
  }
}

export class TokenExpiredException extends DomainException {
  constructor() {
    super('TOKEN_EXPIRED', 401, 'Token has expired');
  }
}

export class TokenReuseDetectedException extends DomainException {
  constructor() {
    super(
      'TOKEN_REUSE_DETECTED',
      401,
      'Token reuse detected — all sessions revoked',
    );
  }
}

export class UploadUnauthenticatedException extends DomainException {
  constructor() {
    super(
      'UPLOAD_UNAUTHENTICATED',
      401,
      'Upload session requires an authenticated caller',
    );
  }
}

export class UploadInvalidFileTypeException extends DomainException {
  constructor() {
    super(
      'UPLOAD_INVALID_FILE_TYPE',
      400,
      'Declared upload file type is not a supported video type',
    );
  }
}

export class UploadContentValidationFailedException extends DomainException {
  constructor() {
    super(
      'UPLOAD_CONTENT_VALIDATION_FAILED',
      422,
      'Uploaded content failed authoritative video validation',
    );
  }
}

export class VideoNotFoundException extends DomainException {
  constructor() {
    super(
      'VIDEO_NOT_FOUND',
      404,
      'Video not found, not owned by the caller, or not ready',
    );
  }
}

export class VideoNotReadyException extends DomainException {
  constructor() {
    super(
      'VIDEO_NOT_READY',
      400,
      'Video cannot be published until its status is "ready"',
    );
  }
}

export class VideoMissingTitleException extends DomainException {
  constructor() {
    super(
      'VIDEO_MISSING_TITLE',
      400,
      'Video must have a title before it can be published',
    );
  }
}

export class ThumbnailInvalidFileException extends DomainException {
  constructor() {
    super(
      'THUMBNAIL_INVALID_FILE',
      400,
      'Thumbnail file is missing, not an accepted image type, or exceeds the size limit',
    );
  }
}

export class VideoThumbnailNotFoundException extends DomainException {
  constructor() {
    super('VIDEO_THUMBNAIL_NOT_FOUND', 404, 'Video has no thumbnail yet');
  }
}

export class CommentNotFoundException extends DomainException {
  constructor() {
    super('COMMENT_NOT_FOUND', 404, 'Comment not found');
  }
}

export class ReplyDepthExceededException extends DomainException {
  constructor() {
    super(
      'REPLY_DEPTH_EXCEEDED',
      400,
      'Cannot reply to a comment that is itself a reply',
    );
  }
}

export class ChannelNotFoundException extends DomainException {
  constructor() {
    super('CHANNEL_NOT_FOUND', 404, 'Channel not found');
  }
}

export class CannotSubscribeOwnChannelException extends DomainException {
  constructor() {
    super(
      'CANNOT_SUBSCRIBE_OWN_CHANNEL',
      409,
      'Cannot subscribe to a channel you own',
    );
  }
}

export class ChannelNicknameTakenException extends DomainException {
  constructor() {
    super(
      'CHANNEL_NICKNAME_TAKEN',
      409,
      'This nickname is already in use by another channel',
    );
  }
}
