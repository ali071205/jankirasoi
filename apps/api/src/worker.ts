import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { OutboxService } from './modules/outbox/outbox.service';
import { Logger } from '@nestjs/common';

async function bootstrapWorker() {
  const logger = new Logger('OutboxWorker');
  const app = await NestFactory.createApplicationContext(AppModule);
  const outboxService = app.get(OutboxService);

  logger.log('🚀 Janki Rasoi Background Outbox Worker started.');

  let isRunning = true;

  const shutdown = async () => {
    logger.log('Shutting down outbox worker gracefully...');
    isRunning = false;
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  while (isRunning) {
    try {
      await outboxService.processPendingMessages(10);
    } catch (err) {
      logger.error(`Error processing outbox queue: ${(err as Error).message}`);
    }

    // Sleep 2 seconds before polling next batch
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

bootstrapWorker();
