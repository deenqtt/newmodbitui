const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
        tenantIndex: 2 // PT. Bandung Digital Solutions
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
        tenantIndex: 4 // PT. Bali Digital Island
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
        tenantIndex: 3 // PT. Medan Cloud Services
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
        tenantIndex: 5 // PT. Makassar Enterprise Network
      },

      // Batam area (Riau Islands)
      {
        name: 'batam-industrial-zone',
        longitude: 104.0782,
        latitude: 1.0521,
        url: 'https://batam-industrial.bi-zone.co.id',
        topic: 'iot/batam/industrial/zone',
        description: 'Industrial monitoring zone in Batam',
        status: true,
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
        status: true,
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

      console.log(`✓ Upserted location: ${location.name} (${tenantName}) - nodeType: ${location.nodeType}`);
      createdLocations.push(location);
    }

    console.log(`✅ ${createdLocations.length} node tenant locations seeded successfully`);
    console.log(`   📊 Tenant-assigned: ${createdLocations.filter(l => l.tenantId !== '').length}`);
    console.log(`   📍 Standalone: ${createdLocations.filter(l => l.tenantId === '').length}`);

    return createdLocations;
  } catch (error) {
    console.error('❌ Error seeding node tenant locations:', error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = {
  seedNodeLocations,
  default: seedNodeLocations
};

// Run if called directly
if (require.main === module) {
  seedNodeLocations()
    .then(() => {
      console.log('📍 Node tenant location seeding completed!');
    })
    .catch((error) => {
      console.error('❌ Node tenant location seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
