import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface RecordAuditParams {
  actorId?: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(private readonly prisma: PrismaService) {}

  async log(params: RecordAuditParams) {
    try {
      return await this.prisma.auditLog.create({
        data: {
          actorId: params.actorId,
          actorRole: params.actorRole,
          action: params.action,
          entity: params.entity,
          entityId: params.entityId,
          oldValue: params.oldValue ?? undefined,
          newValue: params.newValue ?? undefined,
          reason: params.reason,
          ipAddress: params.ipAddress,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record audit log: ${(error as Error).message}`, (error as Error).stack);
      return null;
    }
  }

  async getRecentLogs(limit = 50) {
    return this.prisma.auditLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        actor: {
          select: { id: true, name: true, role: true, email: true },
        },
      },
    });
  }
}
