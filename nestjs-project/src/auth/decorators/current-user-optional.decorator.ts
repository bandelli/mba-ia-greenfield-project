import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../auth.types';

// Companion to `@CurrentUser()` for `@OptionalAuth()` routes, where
// `request.user` is genuinely absent for anonymous callers instead of
// always being populated by a mandatory JwtAuthGuard pass.
export const CurrentUserOptional = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload | undefined => {
    const request = ctx.switchToHttp().getRequest<{ user?: JwtPayload }>();
    return request.user;
  },
);
