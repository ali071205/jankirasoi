import { Controller, Post, Get, Body, Res, Req, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { AdminLoginDto, RiderLoginDto, CustomerLoginDto } from './dto/auth.dto';
import { Response, Request } from 'express';

@ApiTags('Authentication')
@Controller()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('auth/customer/login')
  @ApiOperation({ summary: 'Instant phone-first customer login or registration' })
  async loginCustomer(
    @Body() dto: CustomerLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginCustomer(dto);

    res.cookie('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Get('auth/me')
  @ApiOperation({ summary: 'Get current user session profile and saved addresses' })
  async getMe(@Req() req: Request) {
    const cookieToken = req.cookies?.session_token;
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (!token) {
      return { authenticated: false, user: null };
    }

    try {
      const data = await this.authService.getMe(token);
      return { authenticated: true, ...data };
    } catch {
      return { authenticated: false, user: null };
    }
  }

  @Get('admin/customers')
  @ApiOperation({ summary: 'Admin list all registered customers and delivery addresses' })
  async getCustomers() {
    return this.authService.getAdminCustomers();
  }

  @Get('admin/riders')
  @ApiOperation({ summary: 'Admin list all riders and vehicle details' })
  async getRiders() {
    return this.authService.getAdminRiders();
  }

  @Post('admin/auth/login')
  @ApiOperation({ summary: 'Admin/Staff authentication with HttpOnly cookie session' })
  async loginAdmin(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginAdmin(dto);

    // Set HttpOnly, Secure session cookie
    res.cookie('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    return result;
  }

  @Post('rider/auth/login')
  @ApiOperation({ summary: 'Rider authentication with HttpOnly cookie session' })
  async loginRider(
    @Body() dto: RiderLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.loginRider(dto);

    res.cookie('session_token', result.sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    return result;
  }

  @Post('auth/logout')
  @ApiOperation({ summary: 'Logout and invalidate current session' })
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const cookieToken = req.cookies?.session_token;
    const headerToken = req.headers.authorization?.replace('Bearer ', '');
    const token = cookieToken || headerToken;

    if (token) {
      await this.authService.logout(token);
    }

    res.clearCookie('session_token', { path: '/' });
    return { success: true, message: 'Logged out successfully.' };
  }
}
