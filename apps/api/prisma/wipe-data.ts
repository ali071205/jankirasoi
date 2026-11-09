import * as fs from 'fs';
import * as path from 'path';

function loadLocalEnv() {
  const envCandidates = [
    path.resolve(process.cwd(), '.env'),
    path.resolve(process.cwd(), 'apps/api/.env'),
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../.env'),
  ];
  for (const envPath of envCandidates) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          let val = trimmed.substring(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          process.env[key] = val;
        }
      }
    }
  }
}
loadLocalEnv();

import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Starting Complete Database Cleanup...');

  // 1. Delete Order-related children and dependent records
  console.log('Deleting OrderItemAddon records...');
  const deletedAddons = await prisma.orderItemAddon.deleteMany({});
  console.log(`Deleted ${deletedAddons.count} OrderItemAddons`);

  console.log('Deleting OrderItem records...');
  const deletedItems = await prisma.orderItem.deleteMany({});
  console.log(`Deleted ${deletedItems.count} OrderItems`);

  console.log('Deleting OrderStatusEvent records...');
  const deletedStatusEvents = await prisma.orderStatusEvent.deleteMany({});
  console.log(`Deleted ${deletedStatusEvents.count} OrderStatusEvents`);

  console.log('Deleting PaymentEvent records...');
  const deletedPaymentEvents = await prisma.paymentEvent.deleteMany({});
  console.log(`Deleted ${deletedPaymentEvents.count} PaymentEvents`);

  console.log('Deleting Refund records...');
  const deletedRefunds = await prisma.refund.deleteMany({});
  console.log(`Deleted ${deletedRefunds.count} Refunds`);

  console.log('Deleting PaymentAttempt records...');
  const deletedPaymentAttempts = await prisma.paymentAttempt.deleteMany({});
  console.log(`Deleted ${deletedPaymentAttempts.count} PaymentAttempts`);

  console.log('Deleting DeliveryAttempt records...');
  const deletedDeliveryAttempts = await prisma.deliveryAttempt.deleteMany({});
  console.log(`Deleted ${deletedDeliveryAttempts.count} DeliveryAttempts`);

  console.log('Deleting DeliveryOtp records...');
  const deletedOtps = await prisma.deliveryOtp.deleteMany({});
  console.log(`Deleted ${deletedOtps.count} DeliveryOtps`);

  console.log('Deleting RiderAssignment records...');
  const deletedAssignments = await prisma.riderAssignment.deleteMany({});
  console.log(`Deleted ${deletedAssignments.count} RiderAssignments`);

  // 2. Delete All Orders
  console.log('Deleting all Orders...');
  const deletedOrders = await prisma.order.deleteMany({});
  console.log(`Deleted ${deletedOrders.count} Orders`);

  // 3. Clear Delivery Slot Capacities used by orders
  console.log('Clearing DeliverySlotCapacity records...');
  const deletedCapacities = await prisma.deliverySlotCapacity.deleteMany({});
  console.log(`Deleted ${deletedCapacities.count} DeliverySlotCapacities`);

  // 4. Clear Outbox Messages
  console.log('Clearing OutboxMessage records...');
  const deletedOutbox = await prisma.outboxMessage.deleteMany({});
  console.log(`Deleted ${deletedOutbox.count} OutboxMessages`);

  // 5. Clear Audit Logs (removes ban logs, audit history)
  console.log('Clearing AuditLog records...');
  const deletedAuditLogs = await prisma.auditLog.deleteMany({});
  console.log(`Deleted ${deletedAuditLogs.count} AuditLogs`);

  // 6. Clear Sessions
  console.log('Clearing Session records...');
  const deletedSessions = await prisma.session.deleteMany({});
  console.log(`Deleted ${deletedSessions.count} Sessions`);

  // 7. Remove all Customer accounts
  console.log('Deleting Customer accounts...');
  const deletedCustomers = await prisma.user.deleteMany({
    where: {
      role: UserRole.CUSTOMER,
    },
  });
  console.log(`Deleted ${deletedCustomers.count} Customer Accounts`);

  // 8. Reset any non-admin users or unban any staff/riders
  await prisma.user.updateMany({
    where: {
      role: { in: [UserRole.ADMIN, UserRole.STAFF, UserRole.RIDER] },
    },
    data: {
      isActive: true,
    },
  });

  // Ensure default Admin and Rider exist
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  await prisma.user.upsert({
    where: { email: 'admin@jankirasoi.in' },
    update: { passwordHash: adminPasswordHash, isActive: true },
    create: {
      email: 'admin@jankirasoi.in',
      phone: '9876543210',
      passwordHash: adminPasswordHash,
      name: 'Janki Rasoi Admin',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const riderPasswordHash = await bcrypt.hash('RiderPassword123!', 10);
  await prisma.user.upsert({
    where: { phone: '9811223344' },
    update: { passwordHash: riderPasswordHash, isActive: true },
    create: {
      phone: '9811223344',
      passwordHash: riderPasswordHash,
      name: 'Amit Sharma (Rider)',
      role: UserRole.RIDER,
      isActive: true,
      riderProfile: {
        create: {
          vehicleNumber: 'DL-01-AB-1234',
          isAvailable: true,
        },
      },
    },
  });

  // Reset rider availability
  await prisma.riderProfile.updateMany({
    data: {
      isAvailable: true,
    },
  });

  console.log('✅ Database cleanup completed successfully! Zero orders, zero customer accounts, clean admin & fleet ready.');
}

main()
  .catch((e) => {
    console.error('❌ Error during cleanup:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

