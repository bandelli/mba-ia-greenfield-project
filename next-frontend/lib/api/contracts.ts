/**
 * BFF ↔ Components contracts barrel.
 *
 * This file is the **only** module in the project authorized to import `paths`
 * from `./types.gen`. Every Route Handler and every Component consumes BFF
 * shapes via named aliases exported from here — never by indexing `paths`
 * directly elsewhere.
 *
 * Two alias forms by convention:
 *
 * 1. **Pass-through alias** — BFF returns the upstream NestJS shape as-is.
 *    The alias indexes `paths` for the route's success-content type:
 *
 *      export type Video =
 *        paths["/videos/{id}"]["get"]["responses"][200]["content"]["application/json"];
 *
 * 2. **Reshape alias** — BFF projects a subset or composed shape. The alias
 *    name is named-only (does NOT index `paths`), making reshapes greppable
 *    against the wire shape:
 *
 *      export type VideoCard = Pick<Video, "id" | "title" | "thumbnailUrl">;
 *
 * Feature SIs append aliases here as endpoints are wired through the BFF.
 * The barrel starts empty by design.
 */
import type { paths } from "./types.gen";

// ─── Auth ─────────────────────────────────────────────────────────────────────

// Request bodies (fields are empty in the current openapi.json — will expand as the upstream spec grows)
export type RegisterDto =
  paths["/auth/register"]["post"]["requestBody"]["content"]["application/json"];

export type LoginDto =
  paths["/auth/login"]["post"]["requestBody"]["content"]["application/json"];

export type ForgotPasswordDto =
  paths["/auth/forgot-password"]["post"]["requestBody"]["content"]["application/json"];

export type RefreshTokenDto =
  paths["/auth/refresh"]["post"]["requestBody"]["content"]["application/json"];

// Upstream success response bodies
export type RegisterResponse =
  paths["/auth/register"]["post"]["responses"][201]["content"]["application/json"];

// LoginTokenPair: upstream 200 body — BFF reads it to seal into the iron-session cookie;
// tokens never cross to the browser (per phase-02-auth-frontend/TD-02).
export type LoginTokenPair =
  paths["/auth/login"]["post"]["responses"][200]["content"]["application/json"];

export type RefreshTokenPair =
  paths["/auth/refresh"]["post"]["responses"][200]["content"]["application/json"];

// Shared error envelope (all auth 4xx responses)
export type ApiErrorEnvelope =
  paths["/auth/register"]["post"]["responses"][400]["content"]["application/json"];

// ─── Videos (phase-04-video-channel-management) ───────────────────────────────

export type UpdateVideoDto =
  paths["/videos/{id}"]["patch"]["requestBody"]["content"]["application/json"];

export type Video =
  paths["/videos/{id}"]["patch"]["responses"][200]["content"]["application/json"];

export type VideoThumbnailResponse =
  paths["/videos/{id}/thumbnail"]["patch"]["responses"][200]["content"]["application/json"];

export type VideoThumbnailUrlResponse =
  paths["/videos/{id}/thumbnail-url"]["get"]["responses"][200]["content"]["application/json"];

// ─── Channels (phase-04-video-channel-management) ─────────────────────────────

export type UpdateChannelDto =
  paths["/channels/me"]["patch"]["requestBody"]["content"]["application/json"];

export type Channel =
  paths["/channels/me"]["get"]["responses"][200]["content"]["application/json"];

export type PublicChannelInfo =
  paths["/channels/{nickname}"]["get"]["responses"][200]["content"]["application/json"];

export type OwnerVideoListResponse =
  paths["/channels/me/videos"]["get"]["responses"][200]["content"]["application/json"];

export type PublicVideoListResponse =
  paths["/channels/{nickname}/videos"]["get"]["responses"][200]["content"]["application/json"];

// ─── Video watch page (phase-05-video-watch-page) ─────────────────────────────

export type PublicVideoDetail =
  paths["/videos/public/{publicId}"]["get"]["responses"][200]["content"]["application/json"];

export type VideoStreamUrlResponse =
  paths["/videos/public/{publicId}/stream-url"]["get"]["responses"][200]["content"]["application/json"];

export type VideoDownloadUrlResponse =
  paths["/videos/public/{publicId}/download-url"]["get"]["responses"][200]["content"]["application/json"];

export type PublicVideoThumbnailUrlResponse =
  paths["/videos/public/{publicId}/thumbnail-url"]["get"]["responses"][200]["content"]["application/json"];

export type SuggestedVideosResponse =
  paths["/videos/public/{publicId}/suggested"]["get"]["responses"][200]["content"]["application/json"];

export type HomeFeedResponse =
  paths["/videos/public"]["get"]["responses"][200]["content"]["application/json"];

// ─── Social interactions (phase-06-social-interactions) ───────────────────────

// Shared request body shape — the upstream reuses the same `SetReactionDto`
// class for both the video- and comment-reaction endpoints.
export type SetReactionDto =
  paths["/videos/{publicId}/reaction"]["put"]["requestBody"]["content"]["application/json"];

export type VideoReactionResponse =
  paths["/videos/{publicId}/reaction"]["put"]["responses"][200]["content"]["application/json"];

export type CommentReactionResponse =
  paths["/comments/{commentId}/reaction"]["put"]["responses"][200]["content"]["application/json"];

export type FindCommentsResponse =
  paths["/videos/{publicId}/comments"]["get"]["responses"][200]["content"]["application/json"];

export type CreateCommentDto =
  paths["/videos/{publicId}/comments"]["post"]["requestBody"]["content"]["application/json"];

export type CreateCommentResponse =
  paths["/videos/{publicId}/comments"]["post"]["responses"][201]["content"]["application/json"];

// Reuses the same `CreateCommentDto` request shape (body: string) — the
// upstream's `createReply` reuses `CreateCommentDto` for its request body.
export type CreateReplyResponse =
  paths["/videos/{publicId}/comments/{commentId}/replies"]["post"]["responses"][201]["content"]["application/json"];

export type SetSubscriptionDto =
  paths["/channels/{nickname}/subscription"]["put"]["requestBody"]["content"]["application/json"];

export type SubscriptionResponse =
  paths["/channels/{nickname}/subscription"]["put"]["responses"][200]["content"]["application/json"];

export type MySubscriptionsResponse =
  paths["/users/me/subscriptions"]["get"]["responses"][200]["content"]["application/json"];
