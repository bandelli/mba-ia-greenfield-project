export const VIDEO_UPLOADED_QUEUE = 'video.uploaded' as const;

export const TUS_UPLOAD_PATH = '/videos/uploads' as const;

// Target from phase-03-videos/TD-06 ("files up to 10GB") — never enforced
// until the frontend upload page (phase-07 follow-up) made it worth wiring.
export const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 ** 3;
