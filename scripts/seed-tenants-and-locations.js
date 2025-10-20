const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function seedTenantsAndLocations() {
  console.log('🏢🔗 Seeding tenants and node locations...');

  try {
    // First seed tenants
    const tenants = await seedTenants();

    // Then seed node locations (which depend on tenants)
    const locations = await seedNodeLocations();

    console.log(`🎉 Combined seeding completed!`);
    console.log(`   🏢 Tenants: ${tenants.length}`);
    console.log(`   📍 Node Locations: ${locations.length}`);
    console.log(`   🔗 Tenant-Assigned Locations: ${locations.filter(l => l.tenantId).length}`);
    console.log(`   📍 Standalone Locations: ${locations.filter(l => !l.tenantId).length}`);

    return { tenants, locations };
  } catch (error) {
    console.error('❌ Error in combined tenant and location seeding:', error);
    throw error;
  }
}

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
    return createdTenants;
  } catch (error) {
    console.error('❌ Error seeding tenants:', error);
    throw error;
  }
}

async function seedNodeLocations() {
  console.log('📍 Seeding node tenant locations...');

  try {
    // Get existing tenants to assign node locations to them
    const tenants = await prisma.tenant.findMany();

    if (tenants.length === 0) {
      console.log('⚠️ No tenants found. Please run tenant seeding first.');
      return [];
    }

    // Create sample node locations with real Indonesian coordinates - LIMITED REGIONS ONLY
    const locationData = [
      // Jakarta area (SERVER LOCATION)
      {
        name: 'server-main-datacenter',
        longitude: 106.8456,
        latitude: -6.2088,
        url: 'https://server-main.dc.co.id',
        topic: 'iot/server/main/dc',
        description: 'Main server data center facility - Jakarta',
        status: true,
        nodeType: 'server',
        tenantIndex: 0 // Server tenant
      },

      // Bandung area
      {
        name: 'bandung-digital-campus',
        longitude: 107.6098,
        latitude: -6.9175,
        url: 'https://bdg-campus.bdigital.co.id',
        topic: 'iot/bandung/digital/campus',
        description: 'Digital campus facility in Bandung',
        status: true,
        nodeType: 'node',
        tenantIndex: 3 // PT. Bandung Digital Solutions
      },

      // Bali area
      {
        name: 'bali-tourism-hub',
        longitude: 115.1648,
        latitude: -8.6705,
        url: 'https://balitourism.bdigital.co.id',
        topic: 'iot/bali/tourism/hub',
        description: 'Tourism digital services hub',
        status: true,
        nodeType: 'node',
        tenantIndex: 5 // PT. Bali Digital Island
      },

      // Medan area
      {
        name: 'medan-cloud-center',
        longitude: 98.6759,
        latitude: 3.5897,
        url: 'https://mdn-cloud.medancloud.co.id',
        topic: 'iot/medan/cloud/center',
        description: 'Cloud computing center',
        status: true,
        nodeType: 'node',
        tenantIndex: 4 // PT. Medan Cloud Services
      },

      // Makassar area
      {
        name: 'makassar-enterprise-hub',
        longitude: 119.4327,
        latitude: -5.1477,
        url: 'https://mkassar-hub.makassar-ent.co.id',
        topic: 'iot/makassar/enterprise/hub',
        description: 'Enterprise networking hub',
        status: true,
        nodeType: 'node',
        tenantIndex: 6 // PT. Makassar Enterprise Network
      },

      // Batam area (Riau Islands)
      {
        name: 'batam-industrial-zone',
        longitude: 104.0782,
        latitude: 1.0521,
        url: 'https://batam-industrial.bi-zone.co.id',
        topic: 'iot/batam/industrial/zone',
        description: 'Industrial monitoring zone in Batam',
        status: false, // Inactive location
        nodeType: 'node',
        tenantIndex: null
      },

      // Papua area
      {
        name: 'papua-jayapura-hub',
        longitude: 140.7187,
        latitude: -2.6217,
        url: 'https://papua-jayapura.papua-digital.co.id',
        topic: 'iot/papua/jayapura/hub',
        description: 'Digital hub in Jayapura, Papua',
        status: true,
        nodeType: 'node',
        tenantIndex: null
      },

      // West Kalimantan (Pontianak)
      {
        name: 'pontianak-gateway',
        longitude: 109.3333,
        latitude: -0.0333,
        url: 'https://ptk-gateway.west-kalimantan.co.id',
        topic: 'iot/pontianak/gateway/main',
        description: 'Gateway node for West Kalimantan region',
        status: true,
        nodeType: 'node',
        tenantIndex: null
      },

      // East Kalimantan (Balikpapan)
      {
        name: 'balikpapan-oil-hub',
        longitude: 116.8364,
        latitude: -1.2618,
        url: 'https://balikpapan-oil.e-kalimantan.co.id',
        topic: 'iot/balikpapan/oil/hub',
        description: 'Oil and gas monitoring hub in Balikpapan',
        status: false, // Temporarily inactive
        nodeType: 'node',
        tenantIndex: null
      }
    ];

    // First, delete locations that are not in our new list
    const newLocationNames = locationData.map(data => data.name);
    const locationsToDelete = await prisma.nodeTenantLocation.findMany({
      where: {
        name: { notIn: newLocationNames }
      }
    });

    if (locationsToDelete.length > 0) {
      const deletedCount = await prisma.nodeTenantLocation.deleteMany({
        where: {
          name: { notIn: newLocationNames }
        }
      });
      console.log(`🗑️ Deleted ${deletedCount.count} old locations`);
    }

    // Now create/update the locations we want
    const createdLocations = [];
    for (const data of locationData) {
      // Determine tenant assignment (null for no tenant, otherwise tenant ID)
      let tenantId = null; // null for no tenant assignment
      if (data.tenantIndex !== null && tenants[data.tenantIndex]) {
        tenantId = tenants[data.tenantIndex].id;
      }

      const tenantName = tenantId ? tenants.find(t => t.id === tenantId)?.name : 'No Tenant';

      // Upsert location (create if doesn't exist, update if exists)
      const location = await prisma.nodeTenantLocation.upsert({
        where: { name: data.name },
        create: {
          name: data.name,
          longitude: data.longitude,
          latitude: data.latitude,
          url: data.url,
          topic: data.topic,
          description: data.description,
          status: data.status,
          nodeType: data.nodeType || 'node',
          tenantId: tenantId,
        },
        update: {
          longitude: data.longitude,
          latitude: data.latitude,
          url: data.url,
          topic: data.topic,
          description: data.description,
          status: data.status,
          nodeType: data.nodeType || 'node',
          tenantId: tenantId,
        },
        select: {
          id: true,
          name: true,
          longitude: true,
          latitude: true,
          status: true,
          nodeType: true,
          tenantId: true,
        }
      });

      console.log(`✓ Upserted location: ${location.name} (${tenantName}) - nodeType: ${location.nodeType} - status: ${location.status}`);
      createdLocations.push(location);
    }

    console.log(`✅ ${createdLocations.length} node tenant locations seeded successfully`);
    console.log(`   📊 Tenant-assigned: ${createdLocations.filter(l => l.tenantId !== null).length}`);
    console.log(`   📍 Standalone: ${createdLocations.filter(l => l.tenantId === null).length}`);
    console.log(`   ✅ Active: ${createdLocations.filter(l => l.status === true).length}`);
    console.log(`   ⚠️ Inactive: ${createdLocations.filter(l => l.status === false).length}`);

    return createdLocations;
  } catch (error) {
    console.error('❌ Error seeding node tenant locations:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  seedTenantsAndLocations,
  seedTenants,
  seedNodeLocations,
  default: seedTenantsAndLocations
};

// Run if called directly
if (require.main === module) {
  seedTenantsAndLocations()
    .then(() => {
      console.log('🏢🔗 Combined tenant and location seeding completed successfully!');
    })
    .catch((error) => {
      console.error('❌ Combined tenant and location seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
