const { PrismaClient } = require('@prisma/client');
const { hash } = require('bcryptjs');

const prisma = new PrismaClient();

async function seedTenants() {
  console.log('🏢 Seeding tenants...');

  try {
    // Create sample tenants
    const tenants = [
      {
        name: 'Server',
        company: 'Server Infrastructure',
        email: 'server@server.co.id',
        phone: '+62-21-5678-9012',
        address: 'Jl. Server No. 1, Jakarta Selatan, DKI Jakarta',
        status: 'active',
        notes: 'Server infrastructure and data center management'
      },
      {
        name: 'PT. Jakarta Data Center',
        company: 'Jakarta Data Center',
        email: 'admin@jdc.co.id',
        phone: '+62-21-1234-5678',
        address: 'Jl. Sudirman No. 45, Jakarta Pusat, DKI Jakarta',
        status: 'active',
        notes: 'Main data center provider in Jakarta area'
      },
      {
        name: 'PT. Surabaya Technology Hub',
        company: 'Surabaya Tech Hub',
        email: 'contact@sth.co.id',
        phone: '+62-31-8765-4321',
        address: 'Jl. Tunjungan No. 123, Surabaya, Jawa Timur',
        status: 'active',
        notes: 'Technology hub serving East Java region'
      },
      {
        name: 'PT. Bandung Digital Solutions',
        company: 'Bandung Digital',
        email: 'info@bdigital.co.id',
        phone: '+62-22-5566-7788',
        address: 'Jl. Asia Afrika No. 78, Bandung, Jawa Barat',
        status: 'active',
        notes: 'Digital solutions provider in Bandung area'
      },
      {
        name: 'PT. Medan Cloud Services',
        company: 'Medan Cloud',
        email: 'support@medancloud.co.id',
        phone: '+62-61-4455-6677',
        address: 'Jl. Diponegoro No. 234, Medan, Sumatera Utara',
        status: 'inactive',
        notes: 'Cloud services provider in North Sumatra'
      },
      {
        name: 'PT. Bali Digital Island',
        company: 'Bali Digital',
        email: 'hello@balidigital.co.id',
        phone: '+62-361-8888-9999',
        address: 'Jl. Raya Kuta No. 567, Kuta, Bali',
        status: 'active',
        notes: 'Digital innovation hub in Bali tourism area'
      },
      {
        name: 'PT. Makassar Enterprise Network',
        company: 'Makassar Enterprise',
        email: 'admin@makassar-ent.co.id',
        phone: '+62-411-3333-4444',
        address: 'Jl. Penghibur No. 89, Makassar, Sulawesi Selatan',
        status: 'active',
        notes: 'Enterprise networking solutions in Makassar'
      }
    ];

    const createdTenants = [];
    for (const tenantData of tenants) {
      const tenant = await prisma.tenant.upsert({
        where: { email: tenantData.email },
        update: {},
        create: tenantData,
      });
      createdTenants.push(tenant);
      console.log(`✓ Created tenant: ${tenant.name}`);
    }

    console.log(`✅ ${createdTenants.length} tenants seeded successfully`);

    // Optional: Create sample users for each tenant (uncomment if needed)
    /*
    console.log('👤 Creating sample users for tenants...');
    const roles = await prisma.role.findMany();
    const adminRole = roles.find(r => r.name === 'ADMIN') || roles[0];

    if (adminRole) {
      for (const tenant of createdTenants) {
        const hashedPassword = await hash('password123', 10);
        await prisma.user.upsert({
          where: { email: tenant.email },
          update: {},
          create: {
            email: `${tenant.email.split('@')[0]}@user.local`,
            password: hashedPassword,
            roleId: adminRole.id,
            phoneNumber: tenant.phone,
          },
        });
      }
      console.log(`✅ Sample users created for tenants`);
    }
    */

    return createdTenants;
  } catch (error) {
    console.error('❌ Error seeding tenants:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  seedTenants,
  default: seedTenants
};

// Run if called directly
if (require.main === module) {
  seedTenants()
    .then(() => {
      console.log('🏢 Tenant seeding completed!');
    })
    .catch((error) => {
      console.error('❌ Tenant seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
