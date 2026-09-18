import { SetMetadata } from '@nestjs/common';

export const IS_OPTIONAL_AUTH_KEY = 'isOptionalAuth';

// Marks a route as "mixed auth": anonymous callers are allowed through, but
// a valid Bearer token — when present — is still verified and attached to
// the request, so the handler can tell the two cases apart (per
// social-interactions' Video Watch Page `mixed-auth-intentional` UI
// contract — e.g. `GET /videos/:publicId/comments`'s `currentUserReaction`).
// Distinct from `@Public()`, which never inspects the token at all.
export const OptionalAuth = () => SetMetadata(IS_OPTIONAL_AUTH_KEY, true);
