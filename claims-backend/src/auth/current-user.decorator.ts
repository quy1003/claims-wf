import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TriggeredBy } from '../engine/types';

export const CurrentUser = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): TriggeredBy => {
    const request = ctx.switchToHttp().getRequest();
    return request.user; // Set by JwtStrategy
  },
);
