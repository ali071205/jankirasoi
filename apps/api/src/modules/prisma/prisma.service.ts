import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import * as net from 'net';

let tunnelServer: net.Server | null = null;

function setupTunnel(logger: Logger) {
  if (tunnelServer) return;
  try {
    const server = net.createServer((clientSocket) => {
      logger.log('Prisma client connected to local tunnel');
      const remoteSocket = net.createConnection({ host: '15.165.245.138', port: 6543 }, () => {
        logger.log('Tunnel connected to Supabase pooler');
      });
      clientSocket.pipe(remoteSocket);
      remoteSocket.pipe(clientSocket);
      clientSocket.on('error', (err) => {
        logger.warn(`clientSocket error: ${err.message}`);
        remoteSocket.destroy();
      });
      remoteSocket.on('error', (err) => {
        logger.warn(`remoteSocket error: ${err.message}`);
        clientSocket.destroy();
      });
      clientSocket.on('close', () => remoteSocket.destroy());
      remoteSocket.on('close', () => clientSocket.destroy());
    });
    server.on('error', (err: any) => {
      if (err.code !== 'EADDRINUSE') {
        logger.error(`Tunnel error: ${err.message}`);
      }
    });
    server.listen(6543, '127.0.0.1', () => {
      logger.log('⚡ Local IPv4 proxy active on 127.0.0.1:6543 -> Supabase Pooler (Seoul)');
    });
    tunnelServer = server;
  } catch (err: any) {
    logger.warn(`Could not start tunnel: ${err.message}`);
  }
}

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    let databaseUrl = configService.get<string>('DATABASE_URL');
    if (databaseUrl && (databaseUrl.includes('supabase.co') || databaseUrl.includes('yxvwgcjavxeqsttzcbty'))) {
      try {
        const parsed = new URL(databaseUrl);
        const user = parsed.username || 'postgres';
        const projectRef = 'yxvwgcjavxeqsttzcbty';
        const poolerUser = user.includes('.') ? user : `${user}.${projectRef}`;
        const pass = parsed.password ? `:${encodeURIComponent(parsed.password)}` : '';
        setupTunnel(new Logger('PrismaTunnel'));
        databaseUrl = `postgresql://${poolerUser}${pass}@127.0.0.1:6543/postgres?pgbouncer=true&sslmode=disable`;
      } catch {
        // keep databaseUrl as-is if parsing fails
      }
    }

    super(
      databaseUrl
        ? {
            datasources: {
              db: {
                url: databaseUrl,
              },
            },
          }
        : undefined,
    );
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log('Prisma connected to PostgreSQL successfully.');
    } catch (error) {
      this.logger.warn(`Initial database connection deferred: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    if (tunnelServer) {
      tunnelServer.close();
      tunnelServer = null;
    }
    await this.$disconnect();
    this.logger.log('Prisma disconnected from PostgreSQL.');
  }

  // @ts-ignore
  override $transaction(arg: any, options?: any): Promise<any> {
    if (typeof arg === 'function') {
      return (super.$transaction as any)(arg, {
        maxWait: 15000,
        timeout: 30000,
        ...options,
      });
    }
    return (super.$transaction as any)(arg, options);
  }
}
