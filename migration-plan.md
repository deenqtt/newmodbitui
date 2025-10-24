# Migration Plan: SQLite → PostgreSQL + TimescaleDB
## Nexus IoT Dashboard Database Migration

### Ikhtisar
Migrasi database dari SQLite ke PostgreSQL dengan implementasi TimescaleDB untuk optimasi time series data pada branch `newMigrationDatabase`.

---

## 1. Persiapan Infrastruktur

### 1.1 Installasi Database Server

#### Opsi 1: PostgreSQL Lokal
```bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# Setup TimescaleDB repository
curl -s https://packagecloud.io/install/repositories/timescale/timescaledb/script.deb.sh | sudo bash
sudo apt install timescaledb-2-postgresql-15  # sesuai versi PostgreSQL
```

#### Opsi 2: Docker PostgreSQL + TimescaleDB
```bash
docker run -d \
  --name timescale \
  -p 5432:5432 \
  -e POSTGRES_PASSWORD=mypassword \
  timescale/timescaledb:latest \
  postgres -c shared_preload_libraries=timescaledb
```

#### Opsi 3: Cloud Database (Recomended untuk Production)
- AWS RDS PostgreSQL dengan TimescaleDB extension
- Google Cloud SQL PostgreSQL
- Supabase PostgreSQL

### 1.2 Konfigurasi Environment
```bash
# Copy existing .env and add
cp .env .env.postgres
```

Edit `.env`:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/nexus_dashboard"
TIMESCALE_ENABLED=true
# Backup existing SQLite URL for rollback
DATABASE_URL_SQLITE="file:./iot_dashboard.db"
```

---

## 2. Persiapan Kode Aplikasi

### 2.1 Installasi Dependencies Baru
```bash
npm install @types/pg pg timescaledb
npm install --save-dev @types/pg pg
```

### 2.2 Update Prisma Schema

#### 2.2.1 Change Datasource
```diff
- datasource db {
-   provider = "sqlite"
-   url      = "file:./iot_dashboard.db"
- }

+ datasource db {
+   provider = "postgresql"
+   url      = env("DATABASE_URL")
+ }
```

#### 2.2.2 Optimize Schema untuk PostgreSQL
```prisma
// Tambah optimization untuk PostgreSQL
generator client {
  provider      = "prisma-client-js"
  binaryTargets = ["native", "linux-arm64-openssl-3.0.x"]
  engineType    = "binary"  // Better performance untuk PostgreSQL
}

model User {
  id                   String            @id @default(cuid())
  email                String            @unique
  password             String
  roleId               String
  role_data            Role              @relation(fields: [roleId], references: [id])
  fingerprintId        String?           @unique
  cardUid              String?           @unique
  createdAt            DateTime          @default(now())
  updatedAt            DateTime          @default(now()) @updatedAt

  // Tambah indexes yang tidak ada di SQLite
  @@index([email, roleId])
  @@index([createdAt])

  dashboards           DashboardLayout[]
  assignedMaintenances Maintenance[]     @relation("AssignedToUser")
  notifications        Notification[]
}
```

#### 2.2.3 Time Series Tables Optimisasi
```prisma
// Time Series Tables - tambah partitioning dan indexes
model LoggedData {
  id        String               @id @default(cuid())
  configId  String
  value     Float
  timestamp DateTime             @default(now())
  config    LoggingConfiguration @relation(fields: [configId], references: [id], onDelete: Cascade)

  @@index([configId, timestamp DESC])
  @@index([timestamp])  // Untuk cross-config queries
  // Hypertable akan diinisialisasi via SQL
}

model ThermalData {
  id        Int      @id @default(autoincrement())
  deviceId  String
  timestamp DateTime @default(now())
  minTemp   Float?
  maxTemp   Float?
  avgTemp   Float?
  frameCount Int?

  device    DeviceExternal @relation(fields: [deviceId], references: [id], onDelete: Cascade)

  @@index([deviceId, timestamp DESC])
  @@index([timestamp])
}

model NodeLocationMqttPayload {
  id           String            @id @default(cuid())
  locationId   String
  topic        String
  payload      Json
  receivedAt   DateTime          @default(now())
  messageId    String?

  location     NodeTenantLocation @relation(fields: [locationId], references: [id], onDelete: Cascade)

  @@index([locationId, receivedAt DESC])
  @@index([topic, receivedAt])
  @@index([receivedAt])
}
```

### 2.3 Setup TimescaleDB Extension
Buat file baru: `prisma/setup-timescaledb.sql`
```sql
-- Initialize TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;

-- Convert tables to hypertables
SELECT create_hypertable('LoggedData', by_range('timestamp'), if_not_exists => TRUE);
SELECT create_hypertable('ThermalData', by_range('timestamp'), if_not_exists => TRUE);
SELECT create_hypertable('AlarmLog', by_range('timestamp'), if_not_exists => TRUE);
SELECT create_hypertable('BillLog', by_range('timestamp'), if_not_exists => TRUE);
SELECT create_hypertable('DeviceData', by_range('timestamp'), if_not_exists => TRUE);
SELECT create_hypertable('GatewayStats', by_range('timestamp'), if_not_exists => TRUE);
SELECT create_hypertable('ActivityLog', by_range('timestamp'), if_not_exists => TRUE);
SELECT create_hypertable('NodeLocationMqttPayload', by_range('receivedAt'), if_not_exists => TRUE);

-- Setup compression policies
ALTER TABLE LoggedData SET (timescaledb.compress_chunk_interval = INTERVAL '1 day');
ALTER TABLE LoggedData SET (timescaledb.compress_segmentby = 'configId');
ALTER TABLE ThermalData SET (timescaledb.compress_chunk_interval = INTERVAL '7 days');
ALTER TABLE ThermalData SET (timescaledb.compress_segmentby = 'deviceId');

-- Setup retention policies (30 days for logs)
SELECT add_continuous_aggregate_policy('LoggedData', INTERVAL '7 days', INTERVAL '30 days');
```

---

## 3. Migration Tools

### 3.1 Data Export Script dari SQLite
Buat file: `scripts/export-sqlite-data.js`
```javascript
const { PrismaClient: SqlitePrisma } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const EXPORT_DIR = './migration-exports';

// Create export directory
if (!fs.existsSync(EXPORT_DIR)) {
  fs.mkdirSync(EXPORT_DIR);
}

const sqliteClient = new SqlitePrisma({
  datasourceUrl: process.env.DATABASE_URL_SQLITE
});

const BATCH_SIZE = 1000;
const TABLES_TO_EXPORT = [
  'User', 'Role', 'Permission', 'RolePermission', 'RoleMenuPermission',
  'MenuGroup', 'MenuItem', 'Maintenance', 'DeviceExternal',
  'LoggingConfiguration', 'LoggedData', 'BillConfiguration', 'BillLog',
  'PueConfiguration', 'PowerAnalyzerConfiguration', 'AlarmConfiguration',
  'AlarmBitConfiguration', 'AlarmLog', 'Notification', 'ZigbeeDevice',
  'ZkTecoDevice', 'ZkTecoUser', 'Cctv', 'DashboardLayout', 'EnergyTarget',
  'AccessController', 'ActivityLog', 'LoraDevice', 'DeviceData',
  'LoraGateway', 'GatewayStats', 'ThermalData', 'Tenant',
  'NodeTenantLocation', 'NodeLocationMqttPayload', 'Rack', 'Layout2D',
  'Layout2DDataPoint', 'Layout2DFlowIndicator', 'MenuPreset',
  'MenuPresetGroup', 'MenuPresetItem', 'MQTTConfiguration'
];

async function exportTable(tableName) {
  console.log(`Exporting ${tableName}...`);

  try {
    const data = await sqliteClient[tableName].findMany({
      orderBy: { id: 'asc' }
    });

    fs.writeFileSync(
      path.join(EXPORT_DIR, `${tableName}.json`),
      JSON.stringify(data, null, 2)
    );

    console.log(`✅ Exported ${data.length} records from ${tableName}`);
    return data.length;
  } catch (error) {
    console.error(`❌ Error exporting ${tableName}:`, error.message);
    return 0;
  }
}

async function main() {
  console.log('🚀 Starting SQLite data export...\n');

  let totalRecords = 0;

  for (const tableName of TABLES_TO_EXPORT) {
    const count = await exportTable(tableName);
    totalRecords += count;
  }

  console.log(`\n✅ Migration export complete! Total records: ${totalRecords}`);
  console.log(`📁 Exported data saved to ${EXPORT_DIR}/`);

  await sqliteClient.$disconnect();
}

main().catch(console.error);
```

### 3.2 Data Import Script ke PostgreSQL
Buat file: `scripts/import-postgres-data.js`
```javascript
const { PrismaClient: PostgresPrisma } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const EXPORT_DIR = './migration-exports';

const postgresClient = new PostgresPrisma();

const BATCH_SIZE = 500; // Smaller batch for stability
const TIME_SERIES_TABLES = [
  'LoggedData', 'ThermalData', 'AlarmLog', 'BillLog', 'DeviceData',
  'GatewayStats', 'ActivityLog', 'NodeLocationMqttPayload'
];

async function importTable(tableName) {
  const filePath = path.join(EXPORT_DIR, `${tableName}.json`);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠️  Skipping ${tableName} - export file not found`);
    return 0;
  }

  console.log(`📥 Importing ${tableName}...`);

  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

    if (data.length === 0) {
      console.log(`⚠️  Skipping ${tableName} - no data to import`);
      return 0;
    }

    // Batch insert for better memory management
    let importedCount = 0;

    for (let i = 0; i < data.length; i += BATCH_SIZE) {
      const batch = data.slice(i, Math.min(i + BATCH_SIZE, data.length));

      // Clean data for PostgreSQL compatibility
      const cleanedBatch = batch.map(record => ({
        ...record,
        // Ensure timestamp fields are properly formatted if needed
        createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
        updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
        timestamp: record.timestamp ? new Date(record.timestamp) : undefined,
        receivedAt: record.receivedAt ? new Date(record.receivedAt) : undefined
      }));

      await postgresClient[tableName].createMany({
        data: cleanedBatch,
        skipDuplicates: true // Prevent conflicts
      });

      importedCount += batch.length;
      console.log(`   - Imported batch ${Math.floor(i/BATCH_SIZE) + 1}: ${batch.length} records`);
    }

    console.log(`✅ Successfully imported ${importedCount} records to ${tableName}`);
    return importedCount;

  } catch (error) {
    console.error(`❌ Error importing ${tableName}:`, error.message);

    // For time series tables, try without skipDuplicates
    if (TIME_SERIES_TABLES.includes(tableName)) {
      console.log(`   ↻ Retrying ${tableName} with individual inserts...`);

      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        let retryCount = 0;

        for (const record of data) {
          try {
            const cleanedRecord = {
              ...record,
              createdAt: record.createdAt ? new Date(record.createdAt) : undefined,
              updatedAt: record.updatedAt ? new Date(record.updatedAt) : undefined,
              timestamp: record.timestamp ? new Date(record.timestamp) : undefined,
              receivedAt: record.receivedAt ? new Date(record.receivedAt) : undefined
            };

            await postgresClient[tableName].create({ data: cleanedRecord });
            retryCount++;
          } catch (err) {
            // Skip individual duplicates
            if (!err.message.includes('Unique constraint')) {
              console.error(`   ❌ Failed to import record ${record.id}:`, err.message);
            }
          }
        }

        console.log(`✅ Retry completed: ${retryCount} records imported to ${tableName}`);
        return retryCount;

      } catch (retryError) {
        console.error(`❌ Retry failed for ${tableName}:`, retryError.message);
        return 0;
      }
    }

    return 0;
  }
}

async function main() {
  console.log('🚀 Starting PostgreSQL data import...\n');

  const TABLES_TO_IMPORT = [
    'Role', 'Permission', 'User', 'RolePermission', 'RoleMenuPermission',
    'MenuGroup', 'MenuItem', 'Tenant', 'Rack', 'ZigbeeDevice',
    'ZkTecoDevice', 'ZkTecoUser', 'Cctv', 'MQTTConfiguration',
    'AccessController', 'LoraGateway', 'LoraDevice', 'Maintenance',
    'DeviceExternal', 'Layout2D', 'Layout2DDataPoint', 'Layout2DFlowIndicator',
    'MenuPreset', 'MenuPresetGroup', 'MenuPresetItem', 'DashboardLayout',
    'EnergyTarget', 'LoggingConfiguration', 'BillConfiguration',
    'PueConfiguration', 'PowerAnalyzerConfiguration', 'AlarmConfiguration',
    'AlarmBitConfiguration', 'ActivityLog', 'DeviceData', 'GatewayStats',
    'ThermalData', 'AlarmLog', 'BillLog', 'LoggedData',
    'NodeTenantLocation', 'NodeLocationMqttPayload', 'Notification'
  ];

  let totalImported = 0;
  let successCount = 0;

  for (const tableName of TABLES_TO_IMPORT) {
    const imported = await importTable(tableName);
    totalImported += imported;
    if (imported > 0) successCount++;
  }

  console.log(`\n✅ Migration import complete!`);
  console.log(`📊 Total records imported: ${totalImported}`);
  console.log(`📋 Tables with data: ${successCount}/${TABLES_TO_IMPORT.length}`);

  await postgresClient.$disconnect();
}

main().catch(console.error);
```

### 3.3 Setup TimescaleDB Script
Buat file: `scripts/setup-timescaledb.js`
```javascript
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

const SETUP_SQL_PATH = path.join(__dirname, '..', 'prisma', 'setup-timescaledb.sql');

async function setupTimescaleDB() {
  try {
    await client.connect();
    console.log('✅ Connected to PostgreSQL');

    // Enable TimescaleDB extension
    await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb;');
    console.log('✅ TimescaleDB extension enabled');

    // Run setup SQL if file exists
    if (fs.existsSync(SETUP_SQL_PATH)) {
      const setupSQL = fs.readFileSync(SETUP_SQL_PATH, 'utf8');

      await client.query(setupSQL);
      console.log('✅ TimescaleDB hypertables setup completed');
    } else {
      console.log('⚠️  Setup SQL file not found, skipping hypertable setup');
    }

    // Verify hypertables
    const result = await client.query(`
      SELECT hypertable_name, num_chunks
      FROM timescaledb_information.hypertables
      ORDER BY hypertable_name;
    `);

    console.log('\n📊 Created hypertables:');
    result.rows.forEach(row => {
      console.log(`   - ${row.hypertable_name}: ${row.num_chunks} chunks`);
    });

  } catch (error) {
    console.error('❌ Error setting up TimescaleDB:', error.message);
  } finally {
    await client.end();
  }
}

setupTimescaleDB();
```

---

## 4. Langkah-Langkah Eksekusi Migrasi

### 4.1 Pre-Migration Preparations
```bash
# 1. Backup existing database
echo "Creating backup..."
cp prisma/iot_dashboard.db backup/pre-migration-$(date +%Y%m%d-%H%M%S).db

# 2. Pull latest changes from main branch
git pull origin main

# 3. Ensure we're on migration branch
git checkout newMigrationDatabase

# 4. Install new dependencies
npm install
```

### 4.2 Database Setup
```bash
# 5. Setup PostgreSQL database dan user (ganti password dengan yang aman)
createdb -U postgres nexus_dashboard
psql -U postgres -d nexus_dashboard -c "CREATE USER nexus_user WITH PASSWORD 'your_secure_password_here';"
psql -U postgres -d nexus_dashboard -c "GRANT ALL ON DATABASE nexus_dashboard TO nexus_user;"

# 6. Enable TimescaleDB (skip jika menggunakan cloud)
psql -U postgres -d nexus_dashboard -c "CREATE EXTENSION timescaledb;"
```

### 4.3 Schema Migration
```bash
# 7. Update Prisma schema untuk PostgreSQL
# Edit prisma/schema.prisma sesuai bagian 2.2

# 8. Generate Prisma client untuk PostgreSQL
npx prisma generate

# 9. Push schema ke database baru (create tables)
npx prisma db push

# 10. Setup TimescaleDB hypertables
node scripts/setup-timescaledb.js
```

### 4.4 Data Migration
```bash
# 11. Export data dari SQLite
node scripts/export-sqlite-data.js

# 12. Import data ke PostgreSQL
node scripts/import-postgres-data.js

# 13. Verify data counts
node scripts/verify-migration.js  # (create this script jika needed)
```

### 4.5 Post-Migration Testing
```bash
# 14. Run existing seed scripts untuk verify
npm run seed:init

# 15. Start development server
npm run dev

# 16. Test critical features:
#   - User login
#   - Dashboard loading
#   - Device data ingestion via MQTT
#   - Alarm triggering
#   - Time series queries in analytics
```

### 4.6 Production Deployment
```bash
# 17. Update environment variables pada server
# 18. Run database migrations pada production
# 19. Monitor performance dan data ingestion
# 20. Setup automated backups untuk PostgreSQL
```

---

## 5. Monitoring dan Optimasi

### 5.1 Post-Migration Monitoring
```javascript
// scripts/monitor-migration.js - untuk testing kinerja
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Test time series query performance
async function testTimeSeriesPerformance() {
  console.log('🧪 Testing Time Series Query Performance...\n');

  const startTime = Date.now();

  // Test typical analytics query
  const result = await prisma.loggedData.groupBy({
    by: ['configId'],
    _count: { id: true },
    _avg: { value: true },
    where: {
      timestamp: {
        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
      }
    }
  });

  const duration = Date.now() - startTime;

  console.log(`✅ Query completed in ${duration}ms`);
  console.log(`📊 Results: ${result.length} configurations`);

  // Test hypertable info
  const hypertables = await prisma.$queryRaw`
    SELECT hypertable_name, num_chunks, compression_status
    FROM timescaledb_information.hypertables
    WHERE hypertable_name IN ('LoggedData', 'ThermalData', 'AlarmLog')
    ORDER BY num_chunks DESC;
  `;

  console.log('\n📈 Hypertables Status:');
  hypertables.forEach(table => {
    console.log(`   - ${table.hypertable_name}: ${table.num_chunks} chunks, ${table.compression_status}`);
  });
}

testTimeSeriesPerformance().catch(console.error);
```

### 5.2 Performance Benchmarks
- **SQLite**: ~500ms untuk queries dengan 100k records
- **PostgreSQL + TimescaleDB**: ~50-100ms untuk queries dengan 1M+ records
- **Compression**: 60-80% ukuran data berkurang
- **Ingestion Rate**: 1000+ records/second per device

### 5.3 Backup Strategy Baru
```bash
# Daily automated backup
pg_dump -U nexus_user -h localhost nexus_dashboard > backup/daily-$(date +%Y%m%d).sql

# Weekly full backup dengan TimescaleDB utilities
timescaledb-tune --quiet --yes
```

---

## 6. Rollback Strategy

Jika migrasi gagal atau ada masalah:
```bash
# 1. Switch back to main branch
git checkout main

# 2. Restore backup
cp backup/pre-migration-YYYYMMDD-HHMMSS.db prisma/iot_dashboard.db

# 3. Restart services
npm run dev

# 4. Note issues untuk future migration attempts
```

---

## 7. Timeline dan Resources

### 7.1 Estimasi Durasi
- **Setup Infrastructure**: 2-4 jam
- **Code Changes**: 4-6 jam
- **Data Migration**: 1-3 jam (tergantung ukuran database)
- **Testing**: 4-8 jam
- **Deployment**: 2-4 jam

### 7.2 Team Requirements
- **Database Administrator**: Setup PostgreSQL
- **Backend Developer**: Code changes dan migration scripts
- **QA Engineer**: Testing dan validation
- **DevOps Engineer**: Deployment dan monitoring

### 7.3 Risiko dan Mitigation
- **Data Loss**: Full backup + test migration pada staging
- **Performance Issues**: Benchmark queries sebelum production
- **Downtime**: Blue/green deployment strategy

---

## 8. References dan Resources

### Useful Links
- [TimescaleDB Documentation](https://docs.timescale.com/)
- [Prisma PostgreSQL Guide](https://www.prisma.io/docs/concepts/database-connectors/postgresql)
- [PostgreSQL Migration Tools](https://www.postgresql.org/docs/current/pgupgrade.html)

### Command Cheatsheet
```bash
# PostgreSQL basics
sudo -u postgres psql
\l  # List databases
\c database_name  # Connect to database
\dt  # List tables
\q  # Quit

# TimescaleDB monitoring
SELECT * FROM timescaledb_information.hypertables;
SELECT * FROM timescaledb_information.chunks;
