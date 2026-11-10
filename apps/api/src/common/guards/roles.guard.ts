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

    // 1. Extract session token: prioritize explicit Authorization header first, then session cookies
    let token: string | undefined = undefined;
    if (request.headers.authorization) {
      token = request.headers.authorization.replace(/^Bearer\s+/i, '');
    } else if (request.cookies && request.cookies.session_token) {
      token = request.cookies.session_token;
    } else if (request.headers.cookie) {
      const match = request.headers.cookie.match(/session_token=([^;]+)/);
      if (match) token = match[1];
    }

    let user: any = null;

    if (token) {
      user = await this.authService.validateSessionToken(token);
    }

    // Simulated-role bypass is permitted when explicitly enabled via ALLOW_SIMULATED_ROLE=true,
    // or by default in non-production environments.
    const simRoleHeader =
      request.headers['x-simulated-role'] ||
      request.query?.simulated_role ||
      (request.headers['x-rider-phone'] || request.query?.rider_phone ? 'RIDER' : undefined);
    const simulatedRoleEnabled =
      process.env.ALLOW_SIMULATED_ROLE === 'true' ||
      (process.env.NODE_ENV !== 'production' && process.env.ALLOW_SIMULATED_ROLE !== 'false');

    if (simulatedRoleEnabled && simRoleHeader) {
      const simRole = String(simRoleHeader).toUpperCase();
      if (!user || !requiredRoles.includes(user.role)) {
        user = {
          id: (request.headers['x-rider-id'] as string) || user?.id || (simRole === 'RIDER' ? 'simulated_rider_id' : 'simulated_staff_id'),
          role: simRole,
          name: user?.name || (simRole === 'RIDER' ? 'Delivery Partner' : 'Kitchen Station Staff'),
        };
      }
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
