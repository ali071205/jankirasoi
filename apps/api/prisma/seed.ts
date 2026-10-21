import { PrismaClient, UserRole, DietaryType, MealType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Janki Rasoi Database Seed...');

  // 1. Seed Super Admin
  const adminPasswordHash = await bcrypt.hash('AdminPassword123!', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@jankirasoi.in' },
    update: { passwordHash: adminPasswordHash },
    create: {
      email: 'admin@jankirasoi.in',
      phone: '9876543210',
      passwordHash: adminPasswordHash,
      name: 'Janki Rasoi Admin',
      role: UserRole.ADMIN,
      isActive: true,
    },
  });
  console.log(`👤 Super Admin verified: ${admin.email}`);

  // 2. Seed Delivery Rider
  const riderPasswordHash = await bcrypt.hash('RiderPassword123!', 10);
  const riderUser = await prisma.user.upsert({
    where: { phone: '9811223344' },
    update: { passwordHash: riderPasswordHash },
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
  console.log(`🛵 Sample Rider verified: ${riderUser.name} (${riderUser.phone})`);

  // 3. Seed Delivery Zones (Delhi NCR)
  const zones = [
    {
      name: 'South Delhi - Malviya Nagar & Saket',
      pincode: '110017',
      minOrderPaise: 9900,
      deliveryFeePaise: 3000,
      freeDeliveryThresholdPaise: 29900,
    },
    {
      name: 'South Delhi - Hauz Khas & Green Park',
      pincode: '110016',
      minOrderPaise: 9900,
      deliveryFeePaise: 3500,
      freeDeliveryThresholdPaise: 29900,
    },
    {
      name: 'South Delhi - Kalkaji & Nehru Place',
      pincode: '110019',
      minOrderPaise: 9900,
      deliveryFeePaise: 4000,
      freeDeliveryThresholdPaise: 29900,
    },
    {
      name: 'Central Delhi - South Extension',
      pincode: '110049',
      minOrderPaise: 9900,
      deliveryFeePaise: 3500,
      freeDeliveryThresholdPaise: 29900,
    },
  ];

  for (const z of zones) {
    await prisma.deliveryZone.upsert({
      where: { pincode: z.pincode },
      update: z,
      create: z,
    });
  }
  console.log(`📍 Seeded ${zones.length} delivery zones.`);

  // 4. Seed Delivery Slots
  const slots = [
    {
      mealType: MealType.LUNCH,
      label: 'Lunch (12:30 PM - 01:30 PM)',
      startTime: '12:30',
      endTime: '13:30',
      cutoffTime: '11:00',
      defaultCapacity: 35,
    },
    {
      mealType: MealType.DINNER,
      label: 'Dinner (07:30 PM - 08:30 PM)',
      startTime: '19:30',
      endTime: '20:30',
      cutoffTime: '18:00',
      defaultCapacity: 35,
    },
  ];

  for (const s of slots) {
    const existing = await prisma.deliverySlot.findFirst({
      where: { mealType: s.mealType, label: s.label },
    });
    if (!existing) {
      await prisma.deliverySlot.create({ data: s });
    }
  }
  console.log(`⏰ Seeded Lunch and Dinner delivery slots.`);

  // 5. Seed Menu Categories & Products
  const categoryThalis = await prisma.menuCategory.upsert({
    where: { slug: 'daily-tiffin-thalis' },
    update: {},
    create: {
      name: 'Daily Tiffin Thalis',
      slug: 'daily-tiffin-thalis',
      description: 'Wholesome, freshly prepared homestyle vegetarian meals',
      displayOrder: 1,
    },
  });

  const categoryCombos = await prisma.menuCategory.upsert({
    where: { slug: 'special-combos' },
    update: {},
    create: {
      name: 'Special Combos',
      slug: 'special-combos',
      description: 'Hearty meal bowls and weekend special boxes',
      displayOrder: 2,
    },
  });

  // Seed Product: Executive North Indian Thali
  const thali = await prisma.product.upsert({
    where: { slug: 'executive-north-indian-thali' },
    update: {},
    create: {
      categoryId: categoryThalis.id,
      name: 'Executive North Indian Thali',
      slug: 'executive-north-indian-thali',
      description: '4 Phulkas, Paneer Butter Masala, Dal Tadka, Jeera Rice, Salad & Gulab Jamun',
      dietaryType: DietaryType.VEG,
      imageUrl: 'https://res.cloudinary.com/jankirasoi/image/upload/v1/menu/thali.jpg',
      basePricePaise: 15900, // ₹159.00
      taxRatePercent: 5,
      variants: {
        create: [
          { name: 'Standard Portion', priceModifierPaise: 0, isDefault: true, displayOrder: 1 },
          { name: 'Deluxe Portion (+Extra Paneer & Sweet)', priceModifierPaise: 4000, isDefault: false, displayOrder: 2 },
        ],
      },
    },
  });

  // Seed Addon Group for Thali
  const addonGroup = await prisma.addonGroup.create({
    data: {
      name: 'Add Extras & Sides',
      minSelections: 0,
      maxSelections: 4,
      options: {
        create: [
          { name: 'Extra Phulka (2 pcs)', pricePaise: 2000 },
          { name: 'Sweet Lassi (250ml)', pricePaise: 3500 },
          { name: 'Boondi Raita (150ml)', pricePaise: 2500 },
          { name: 'Roasted Papad (2 pcs)', pricePaise: 1500 },
        ],
      },
      products: {
        create: {
          productId: thali.id,
        },
      },
    },
  });

  // Seed Product: Homestyle Dal Khichdi Bowl
  await prisma.product.upsert({
    where: { slug: 'homestyle-dal-khichdi-bowl' },
    update: {},
    create: {
      categoryId: categoryCombos.id,
      name: 'Homestyle Moong Dal Khichdi Bowl',
      slug: 'homestyle-dal-khichdi-bowl',
      description: 'Comforting desi ghee khichdi served with curd, pickle, and roasted papad',
      dietaryType: DietaryType.VEG,
      imageUrl: 'https://res.cloudinary.com/jankirasoi/image/upload/v1/menu/khichdi.jpg',
      basePricePaise: 12900, // ₹129.00
      taxRatePercent: 5,
      variants: {
        create: [
          { name: 'Regular Bowl (400g)', priceModifierPaise: 0, isDefault: true },
          { name: 'Large Bowl (600g)', priceModifierPaise: 3000, isDefault: false },
        ],
      },
    },
  });

  console.log('✅ Janki Rasoi Database Seed Completed Successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
