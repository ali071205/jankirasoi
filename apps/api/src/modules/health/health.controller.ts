import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Default Health & Liveness Probe' })
  @ApiResponse({ status: 200, description: 'Service is alive and healthy.' })
  getHealth() {
    return this.getLiveness();
  }

  @Get('ping')
  @ApiOperation({ summary: 'Fast ping probe' })
  getPing() {
    return 'pong';
  }

  @Get('live')
  @ApiOperation({ summary: 'Process Liveness Probe' })
  @ApiResponse({ status: 200, description: 'Process is alive and responding.' })
  getLiveness() {
    const memory = process.memoryUsage();
    return {
      status: 'UP',
      uptimeSeconds: Math.floor(process.uptime()),
      memory: {
        heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
        rssMb: Math.round(memory.rss / 1024 / 1024),
      },
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Database Readiness Probe' })
  @ApiResponse({ status: 200, description: 'Service and database are ready.' })
  @ApiResponse({ status: 503, description: 'Service is not ready to accept traffic.' })
  async getReadiness(@Res() res: Response) {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return res.status(HttpStatus.OK).json({
        status: 'READY',
        database: 'CONNECTED',
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        status: 'UNREADY',
        database: 'DISCONNECTED',
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
