import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private authService: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // 1. Extract session token from cookie or Authorization header
    let token: string | undefined = undefined;
    if (request.cookies && request.cookies.session_token) {
      token = request.cookies.session_token;
    } else if (request.headers.cookie) {
      const match = request.headers.cookie.match(/session_token=([^;]+)/);
      if (match) token = match[1];
    } else if (request.headers.authorization) {
      token = request.headers.authorization.replace(/^Bearer\s+/i, '');
    }

    let user: any = null;

    if (token) {
      user = await this.authService.validateSessionToken(token);
    }

    // Allow development test bypass only if NOT in production
    if (!user && process.env.NODE_ENV !== 'production' && request.headers['x-simulated-role']) {
      user = {
        id: 'simulated_user_id',
        role: request.headers['x-simulated-role'],
        name: 'Simulated Developer',
      };
    }

    if (!user) {
      throw new UnauthorizedException({
        statusCode: 401,
        error: 'Unauthorized',
        code: 'AUTH_REQUIRED',
        message: 'Valid session credentials are required to access this endpoint.',
      });
    }

    request.user = user;

    if (!requiredRoles.includes(user.role)) {
      throw new ForbiddenException({
        statusCode: 403,
        error: 'Forbidden',
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `Your role (${user.role}) is not authorized for this resource. Required: [${requiredRoles.join(', ')}]`,
      });
    }

    return true;
  }
}
