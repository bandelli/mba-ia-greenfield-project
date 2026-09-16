import { http, HttpResponse } from "msw";

import type { CommentReactionResponse, VideoReactionResponse } from "@/lib/api/contracts";
import { env } from "@/lib/env";

// Reserved trigger (E2E + Vitest) — a `:publicId`/`:commentId` path value
// that always yields 404 (VIDEO_NOT_FOUND / COMMENT_NOT_FOUND) on either
// reaction endpoint.
export const REACTION_NOT_FOUND_TRIGGER = "trigger-reaction-not-found";

function reactionNotFoundEnvelope(errorCode: string) {
  return { statusCode: 404, error: errorCode, message: "Not found", code: null };
}

// `SetReactionDto` is `Record<string, never>` in the generated types (the
// upstream openapi-export runs under plain ts-node, so class-validator DTOs
// without `@ApiProperty()` decorators export as empty schemas — see
// next-frontend/CLAUDE.md's OpenAPI section). Cast to this local shape for
// field access, same pattern `mocks/handlers/videos.ts`'s PATCH handler uses.
function reactionResponseFor(type: "like" | "dislike" | null) {
  return {
    type,
    likesCount: type === "like" ? 1 : 0,
    dislikesCount: type === "dislike" ? 1 : 0,
  };
}

export const handlers = [
  // PUT /videos/:publicId/reaction
  http.put(`${env.API_URL}/videos/:publicId/reaction`, async ({ request, params }) => {
    if (params.publicId === REACTION_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(reactionNotFoundEnvelope("VIDEO_NOT_FOUND"), {
        status: 404,
      });
    }
    const body = (await request.json()) as { type: "like" | "dislike" | null };
    return HttpResponse.json<VideoReactionResponse>(
      reactionResponseFor(body.type),
      { status: 200 }
    );
  }),

  // PUT /comments/:commentId/reaction
  http.put(`${env.API_URL}/comments/:commentId/reaction`, async ({ request, params }) => {
    if (params.commentId === REACTION_NOT_FOUND_TRIGGER) {
      return HttpResponse.json(reactionNotFoundEnvelope("COMMENT_NOT_FOUND"), {
        status: 404,
      });
    }
    const body = (await request.json()) as { type: "like" | "dislike" | null };
    return HttpResponse.json<CommentReactionResponse>(
      reactionResponseFor(body.type),
      { status: 200 }
    );
  }),
];
