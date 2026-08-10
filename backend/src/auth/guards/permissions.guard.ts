import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { UsersService } from '../../users/users.service';
import { PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { JwtPayload } from '../strategies/jwt.strategy';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const jwtUser = request.user as JwtPayload | undefined;
    if (!jwtUser) {
      throw new ForbiddenException('Not authenticated');
    }

    const user = await this.usersService.findById(jwtUser.sub);
    if (!user || !user.isActive) {
      throw new ForbiddenException('User not found or inactive');
    }

    const grantedKeys = new Set(
      user.roles?.flatMap((role) => role.permissions?.map((p) => p.key) ?? []) ?? [],
    );

    const hasAll = requiredPermissions.every((key) => grantedKeys.has(key));
    if (!hasAll) {
      throw new ForbiddenException(
        `Missing required permission(s): ${requiredPermissions.filter((k) => !grantedKeys.has(k)).join(', ')}`,
      );
    }

    return true;
  }
}
