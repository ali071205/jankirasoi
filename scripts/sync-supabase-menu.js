const fs = require('fs');
const path = require('path');

const env = fs.readFileSync(path.resolve(__dirname, '../../.env'), 'utf8');
for (const line of env.split('\n')) {
  const parts = line.split('=');
  if (parts.length >= 2 && !line.trim().startsWith('#')) {
    const k = parts[0].trim();
    const v = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
    process.env[k] = v;
  }
}

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function uploadFileToSupabase(localFilePath, storagePath) {
  const fileBytes = fs.readFileSync(localFilePath);
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/menu/${storagePath}`, {
    method: 'POST',
    headers: {
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true'
    },
    body: fileBytes
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload ${storagePath}: ${res.status} ${errText}`);
  }

  return `${SUPABASE_URL}/storage/v1/object/public/menu/${storagePath}`;
}

async function main() {
  console.log('--- 1. Uploading All 31 Dish Photos to Supabase Storage ---');
  const dishesDir = path.resolve(__dirname, '../web/public/images/dishes');
  const files = fs.readdirSync(dishesDir).filter((f) => f.endsWith('.jpg') || f.endsWith('.png'));

  const slugToSupabaseUrl = {};

  for (const file of files) {
    const slug = path.basename(file, path.extname(file));
    const localPath = path.join(dishesDir, file);
    const storagePath = `dishes/${file}`;
    const publicUrl = await uploadFileToSupabase(localPath, storagePath);
    slugToSupabaseUrl[slug] = publicUrl;
    console.log(`✓ Uploaded ${slug} -> ${publicUrl}`);
  }

  console.log('\n--- 2. Updating Supabase Database Products ---');
  const products = await prisma.product.findMany();
  console.log(`Found ${products.length} products in Supabase.`);

  let updatedCount = 0;
  for (const p of products) {
    const supabaseUrl = slugToSupabaseUrl[p.slug];
    if (supabaseUrl) {
      await prisma.product.update({
        where: { id: p.id },
        data: { imageUrl: supabaseUrl }
      });
      console.log(`✓ Updated [${p.name}] (${p.slug}) -> ${supabaseUrl}`);
      updatedCount++;
    } else {
      console.warn(`! No matching image file for slug: ${p.slug}`);
    }
  }

  console.log(`\nSuccessfully updated ${updatedCount}/${products.length} products in Supabase database!`);

  // Verify
  console.log('\n--- 3. Verifying Updated Database State ---');
  const updatedProducts = await prisma.product.findMany({
    select: { name: true, slug: true, imageUrl: true }
  });
  for (const p of updatedProducts) {
    console.log(`${p.name}: ${p.imageUrl}`);
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
