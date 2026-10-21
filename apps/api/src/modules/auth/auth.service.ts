import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto, RiderLoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async hashPassword(password: string): Promise<string> {
    const salt = await bcrypt.genSalt(10);
    return bcrypt.hash(password, salt);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async createSession(userId: string) {
    const token = 'sess_' + randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    await this.prisma.session.create({
      data: {
        userId,
        token,
        expiresAt,
      },
    });

    return { token, expiresAt };
  }

  async loginAdmin(dto: AdminLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      throw new UnauthorizedException('Invalid administrative email or password.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This account has been deactivated.');
    }

    const isValid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid administrative email or password.');
    }

    const session = await this.createSession(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      sessionToken: session.token,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async loginRider(dto: RiderLoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { phone: dto.phone },
      include: { riderProfile: true },
    });

    if (!user || user.role !== 'RIDER') {
      throw new UnauthorizedException('Invalid rider phone number or credentials.');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('This rider account is deactivated.');
    }

    const isValid = await this.verifyPassword(dto.password, user.passwordHash);
    if (!isValid) {
      throw new UnauthorizedException('Invalid rider credentials.');
    }

    const session = await this.createSession(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        role: user.role,
        vehicleNumber: user.riderProfile?.vehicleNumber,
      },
      sessionToken: session.token,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async validateSessionToken(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    if (!session.user || !session.user.isActive) {
      return null;
    }

    return session.user;
  }

  async logout(token: string) {
    await this.prisma.session.deleteMany({
      where: { token },
    });
    return { success: true, message: 'Logged out successfully.' };
  }
}
