const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Data layout 2D untuk seeding
const LAYOUT2D_DATA = [
  {
    name: "IoT-Based Wastewater Treatment Monitoring System",
    isUse: true, // Status aktif sebagai layout utama
    image: "/images/Diagram WTP.png", // Path relative dari public folder
  }
];

/**
 * Check if image exists
 */
async function checkImageExists(imagePath) {
  const fs = require('fs').promises;
  const path = require('path');

  try {
    // Check if file exists in public/images directory
    const fullPath = path.join(process.cwd(), 'public', imagePath.replace('/images/', 'images/'));
    await fs.access(fullPath);
    console.log(`✅ Image verified: ${fullPath}`);
    return true;
  } catch (error) {
    console.log(`⚠️  Image not found: ${imagePath}`);
    return false;
  }
}

/**
 * Seed layout 2D menggunakan transactional approach
 */
async function seedLayout2D() {
  console.log('🔄 Starting Layout 2D seeding...');
  console.log(`📦 Processing ${LAYOUT2D_DATA.length} layouts...\n`);

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const errors = [];

  try {
    // Gunakan transaksi untuk memastikan semua atau tidak sama sekali
    await prisma.$transaction(async (tx) => {
      for (const layoutData of LAYOUT2D_DATA) {
        try {
          console.log(`🔍 Processing: ${layoutData.name}`);

          // Cek apakah layout sudah ada berdasarkan name
          const existingLayout = await tx.layout2D.findUnique({
            where: { name: layoutData.name }
          });

          // Verify image exists
          const imageExists = layoutData.image ? await checkImageExists(layoutData.image) : true;

          if (!imageExists && layoutData.image) {
            console.log(`   ⚠️  Skipping image ${layoutData.image} - not found`);
            layoutData.image = null;
          }

          if (existingLayout) {
            // Update layout yang sudah ada
            await tx.layout2D.update({
              where: { name: layoutData.name },
              data: {
                isUse: layoutData.isUse,
                image: layoutData.image,
                updatedAt: new Date()
              }
            });
            updatedCount++;
            console.log(`   📝 Updated: "${layoutData.name}"`);

          } else {
            // Buat layout baru
            await tx.layout2D.create({
              data: layoutData
            });
            createdCount++;
            console.log(`   ➕ Created: "${layoutData.name}"`);
          }

        } catch (layoutError) {
          console.error(`   ❌ Error processing ${layoutData.name}:`, layoutError.message);
          errors.push(`${layoutData.name}: ${layoutError.message}`);
          skippedCount++;
        }
      }
    });

    console.log('\n📊 Layout 2D seeding summary:');
    console.log(`   ✅ Created: ${createdCount} layouts`);
    console.log(`   📝 Updated: ${updatedCount} layouts`);
    console.log(`   ❌ Skipped: ${skippedCount} layouts`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }

    console.log('\n🎯 Layout configuration:');
    console.log(`   📟 Name: "IoT-Based Wastewater Treatment Monitoring System"`);
    console.log(`   🔄 Active Status: true`);
    console.log(`   🖼️  Background Image: /images/Diagram WTP.png`);

  } catch (error) {
    console.error('❌ Layout 2D seeding failed:', error);
    throw error;
  }
}

/**
 * Verify layout setelah seeding
 */
async function verifyLayouts() {
  console.log('\n🔍 Verifying seeded layouts...');

  try {
    const layouts = await prisma.layout2D.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    console.log(`📋 Total layouts in database: ${layouts.length}`);
    console.log('\n📋 All layouts:');

    layouts.forEach((layout, index) => {
      console.log(`   ${index + 1}. "${layout.name}"`);
      console.log(`      Active (isUse): ${layout.isUse ? '✅ True' : '❌ False'}`);
      console.log(`      Image: ${layout.image || 'None'}`);
      console.log(`      Created: ${layout.createdAt.toISOString().split('T')[0]}`);
      console.log(`      Updated: ${layout.updatedAt.toISOString().split('T')[0]}`);
    });

    // Check for active layout
    const activeLayout = layouts.find(l => l.isUse);
    if (activeLayout) {
      console.log(`\n🎯 Active Layout: "${activeLayout.name}"`);
    } else {
      console.log(`\n⚠️  No active layout found!`);
    }

  } catch (error) {
    console.error('❌ Layout verification failed:', error);
  }
}

module.exports = {
  seedLayout2D,
  default: seedLayout2D,
  LAYOUT2D_DATA
};

// Export for compatibility with seed-init.js
async function seedLayout2DExport() {
  return seedLayout2D();
}

if (require.main === module) {
  seedLayout2D()
    .then(async () => {
      await verifyLayouts();
      console.log('\n✅ Layout 2D seeding completed successfully!');
      console.log('🚀 Layout is ready for data point and flow indicator configuration.');
    })
    .catch((error) => {
      console.error('\n❌ Layout 2D seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
