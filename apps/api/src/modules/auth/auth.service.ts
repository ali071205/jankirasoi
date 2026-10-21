import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AdminLoginDto, RiderLoginDto, CustomerLoginDto } from './dto/auth.dto';
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

  async loginCustomer(dto: CustomerLoginDto) {
    let cleanPhone = dto.phone.replace(/[\s\-\+]/g, '');
    if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
      cleanPhone = cleanPhone.substring(2);
    }

    if (cleanPhone.length !== 10) {
      throw new BadRequestException('Please provide a valid 10-digit Indian phone number.');
    }

    let user = await this.prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    if (!user) {
      const dummyHash = await this.hashPassword(randomBytes(16).toString('hex'));
      user = await this.prisma.user.create({
        data: {
          phone: cleanPhone,
          name: dto.name?.trim() || `Customer ${cleanPhone.slice(-4)}`,
          email: null,
          passwordHash: dummyHash,
          role: 'CUSTOMER',
          isActive: true,
        },
      });
      this.logger.log(`Created new customer account: ${user.name} (${user.phone})`);
    } else {
      if (dto.name && dto.name.trim() && (user.name.startsWith('Customer ') || user.name === 'Customer')) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { name: dto.name.trim() },
        });
      }
    }

    // Retrieve previous order delivery address if any
    const recentOrders = await this.prisma.order.findMany({
      where: { customerPhone: cleanPhone },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalAmountPaise: true,
        deliveryAddress: true,
        trackingToken: true,
        createdAt: true,
      },
    });

    const savedAddress = recentOrders[0]?.deliveryAddress || dto.address || null;
    const session = await this.createSession(user.id);

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        savedAddress,
        orderCount: recentOrders.length,
        recentOrders,
      },
      sessionToken: session.token,
      expiresAt: session.expiresAt.toISOString(),
    };
  }

  async getMe(token: string) {
    const user = await this.validateSessionToken(token);
    if (!user) {
      throw new UnauthorizedException('Session expired or invalid.');
    }

    let savedAddress = null;
    let recentOrders: any[] = [];
    let riderInfo = null;

    if (user.role === 'CUSTOMER') {
      recentOrders = await this.prisma.order.findMany({
        where: { customerPhone: user.phone },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          orderNumber: true,
          status: true,
          totalAmountPaise: true,
          deliveryAddress: true,
          trackingToken: true,
          createdAt: true,
        },
      });
      savedAddress = recentOrders[0]?.deliveryAddress || null;
    } else if (user.role === 'RIDER') {
      const profile = await this.prisma.riderProfile.findUnique({
        where: { userId: user.id },
      });
      riderInfo = profile;
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        savedAddress,
        orderCount: recentOrders.length,
        recentOrders,
        riderProfile: riderInfo,
      },
    };
  }

  async getAdminCustomers() {
    const customerUsers = await this.prisma.user.findMany({
      where: { role: 'CUSTOMER' },
      select: {
        id: true,
        name: true,
        phone: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const orders = await this.prisma.order.findMany({
      select: {
        customerPhone: true,
        customerName: true,
        totalAmountPaise: true,
        deliveryAddress: true,
        createdAt: true,
        status: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const phoneMap = new Map<string, {
      id?: string;
      name: string;
      phone: string;
      orderCount: number;
      totalSpendPaise: number;
      lastOrderDate: string;
      savedAddress: any;
    }>();

    for (const u of customerUsers) {
      phoneMap.set(u.phone, {
        id: u.id,
        name: u.name,
        phone: u.phone,
        orderCount: 0,
        totalSpendPaise: 0,
        lastOrderDate: u.createdAt.toISOString(),
        savedAddress: null,
      });
    }

    for (const ord of orders) {
      const existing = phoneMap.get(ord.customerPhone);
      if (existing) {
        existing.orderCount += 1;
        existing.totalSpendPaise += ord.totalAmountPaise;
        if (!existing.savedAddress && ord.deliveryAddress) {
          existing.savedAddress = ord.deliveryAddress;
        }
      } else {
        phoneMap.set(ord.customerPhone, {
          name: ord.customerName,
          phone: ord.customerPhone,
          orderCount: 1,
          totalSpendPaise: ord.totalAmountPaise,
          lastOrderDate: ord.createdAt.toISOString(),
          savedAddress: ord.deliveryAddress,
        });
      }
    }

    return {
      customers: Array.from(phoneMap.values()),
    };
  }

  async getAdminRiders() {
    const riders = await this.prisma.user.findMany({
      where: { role: 'RIDER' },
      include: {
        riderProfile: true,
      },
    });

    return {
      riders: riders.map((r) => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        vehicleNumber: r.riderProfile?.vehicleNumber || 'DL-01-AB-1234',
        isAvailable: r.riderProfile?.isAvailable ?? true,
        isActive: r.isActive,
      })),
    };
  }

  async logout(token: string) {
    await this.prisma.session.deleteMany({
      where: { token },
    });
    return { success: true, message: 'Logged out successfully.' };
  }
}
