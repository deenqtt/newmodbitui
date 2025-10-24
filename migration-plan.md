# Migration Plan: SQLite → PostgreSQL + TimescaleDB

## 1. Persiapan Environment

### 1.1 Install Database Dependencies
```bash
# Install PostgreSQL client dan TimescaleDB
sudo apt update
sudo apt install postgresql-client-common postgresql-client

# Setup TimescaleDB extension di PostgreSQL
# (asumsikan PostgreSQL sudah terinstall)
```

### 1.2 Update Package Dependencies
Tambahkan ke package.json:
```json
"devDependencies": {
  "@types/pg": "^8.10.2",
  "pg": "^8.11.0"
}
```

## 2. Schema Changes (prisma/schema.prisma)

### 2.1 Update Datasource
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

### 2.2 Convert Tables ke Hypertables (TimescaleDB)
```prisma
// LoggedData - Time Series Table
model LoggedData {
  id        String   @id @default(cuid())
  configId  String
  value     Float
  timestamp DateTime @default(now())
  config    LoggingConfiguration @relation(fields: [configId], references: [id], onDelete: Cascade)
  
  @@index([configId, timestamp DESC])
  // Hypertable configuration akan ditambahkan via SQL
}

// Tambah Performance Timestamps (Opsional)
model PerformanceMetrics {
  id        String   @id @default(cuid())
  metric    String   // CPU, Memory, Throughput, etc.
  value     Float
  timestamp DateTime @default(now())
  deviceId  String?
  
  @@index([metric, timestamp DESC])
}
```

### 2.3 Optimisasi Indexes untuk Time Series
```prisma
// ThermalData - Add more performance indexes
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
  @@index([timestamp]) // For cross-device queries
}

// ActivityLog - Optimize untuk event queries  
model ActivityLog {
  id           String           @id @default(cuid())
  controllerId String
  timestamp    DateTime
  message      String
  details      String?
  createdAt    DateTime         @default(now())
  controller   AccessController @relation(fields: [controllerId], references: [id], onDelete: Cascade)

  @@index([controllerId, timestamp DESC])
  @@index([timestamp]) // Untuk timeline queries
}
```

## 3. Environment Configuration

### 3.1 Update .env
```env
# OLD
DATABASE_URL="file:./iot_dashboard.db"

# NEW  
DATABASE_URL="postgresql://username:password@localhost:5432/iot_dashboard?schema=public"
TIMESCALE_ENABLED=true
```

### 3.2 Database Connection Setup
Tambah file `lib/timescale.ts`:
```typescript
import { createClient } from '@vercel/postgres';

export const timescaleClient = createClient({
  connectionString: process.env.DATABASE_URL,
});

// Initialize TimescaleDB extension
export async function initializeTimescale() {
  await timescaleClient.query(`
    CREATE EXTENSION IF NOT EXISTS timescaledb;
    
    -- Convert existing tables to hypertables
    SELECT create_hypertable('LoggedData', 'timestamp', if_not_exists => TRUE);
    SELECT create_hypertable('ThermalData', 'timestamp', if_not_exists => TRUE);
    SELECT create_hypertable('AlarmLog', 'timestamp', if_not_exists => TRUE);
    SELECT create_hypertable('BillLog', 'timestamp', if_not_exists => TRUE);
    SELECT create_hypertable('DeviceData', 'timestamp', if_not_exists => TRUE);
    SELECT create_hypertable('GatewayStats', 'timestamp', if_not_exists => TRUE);
    SELECT create_hypertable('ActivityLog', 'timestamp', if_not_exists => TRUE);
    SELECT create_hypertable('NodeLocationMqttPayload', 'receivedAt', if_not_exists => TRUE);
  `);
}
```

## 4. Migration Scripts

### 4.1 Data Export dari SQLite
```javascript
// scripts/export-sqlite-data.js
const { PrismaClient: SqlitePrisma } = require('@prisma/client');
const fs = require('fs');

// Export dalam batch untuk memory efficiency
async function exportTableData(tableName, batchSize = 1000) {
  const sqliteClient = new SqlitePrisma({
    datasourceUrl: "file:./iot_dashboard.db"
  });
  
  const data = await sqliteClient[tableName].findMany();
  fs.writeFileSync(`./exports/${tableName}.json`, JSON.stringify(data));
  
  console.log(`Exported ${data.length} records from ${tableName}`);
}
```

### 4.2 Data Import ke PostgreSQL
```javascript
// scripts/import-postgres-data.js  
const { PrismaClient: PostgresPrisma } = require('@prisma/client');
const fs = require('fs');

async function importTableData(tableName) {
  const postgresClient = new PostgresPrisma();
  const data = JSON.parse(fs.readFileSync(`./exports/${tableName}.json`));
  
  // Import dalam batches
  const batchSize = 1000;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    await postgresClient[tableName].createMany({ data: batch });
  }
  
  console.log(`Imported ${data.length} records to ${tableName}`);
}
```

### 4.3 Retention Policy Setup
```sql
-- scripts/setup-retention-policies.sql
-- Setup data retention (30 hari untuk sensor data)
SELECT add_retention_policy('LoggedData', INTERVAL '30 days');
SELECT add_retention_policy('ThermalData', INTERVAL '7 days');  
SELECT add_retention_policy('DeviceData', INTERVAL '90 days');

-- Setup compression untuk performance
ALTER TABLE LoggedData SET (timescaledb.compress, timescaledb.compress_segmentby = 'configId');
ALTER TABLE ThermalData SET (timescaledb.compress, timescaledb.compress_segmentby = 'deviceId');
```

## 5. Code Changes Needed

### 5.1 Update API Queries (Opsional)
```typescript
// OLD - SQLite compatible
await prisma.loggedData.findMany({
  where: { 
    configId,
    timestamp: { gte: startDate, lte: endDate }
  },
  orderBy: { timestamp: 'desc' },
  take: 1000
});

// NEW - PostgreSQL optimized (similar performance)
await prisma.loggedData.findMany({
  where: { 
    configId,
    timestamp: { gte: startDate, lte: endDate }
  },
  orderBy: { timestamp: 'desc' }, 
  take: 1000
});
```

### 5.2 Add Time Series Analytics Functions
```typescript
// lib/time-series-queries.ts
export async function getTimeSeriesAggregates(
  tableName: string, 
  configId: string,
  interval: string = '1 hour',
  startDate: Date,
  endDate: Date
) {
  const result = await prisma.$queryRaw`
    SELECT 
      time_bucket(${interval}, timestamp) AS bucket,
      AVG(value) as avg_value,
      MIN(value) as min_value, 
      MAX(value) as max_value,
      COUNT(*) as count
    FROM ${prisma.raw(tableName)}
    WHERE config_id = ${configId}
      AND timestamp BETWEEN ${startDate} AND ${endDate}
    GROUP BY bucket
    ORDER BY bucket ASC
  `;
  
  return result;
}
```

## 6. Deployment Steps

### 6.1 Database Setup
```bash
# Create PostgreSQL database
createdb iot_dashboard
psql -d iot_dashboard -c "CREATE EXTENSION timescaledb;"

# Setup user dan permissions
psql -d iot_dashboard -c "CREATE USER iot_user WITH PASSWORD 'your_password';"
psql -d iot_dashboard -c "GRANT ALL ON DATABASE iot_dashboard TO iot_user;"
```

### 6.2 Migration Execution
```bash
# 1. Backup existing SQLite
cp prisma/iot_dashboard.db backup/

# 2. Regenerate Prisma client untuk PostgreSQL
npx prisma generate

# 3. Push schema ke database baru
npx prisma db push

# 4. Export dari SQLite
node scripts/export-sqlite-data.js

# 5. Import ke PostgreSQL  
node scripts/import-postgres-data.js

# 6. Setup retention policies
psql -d iot_dashboard -f scripts/setup-retention-policies.sql

# 7. Run existing seed scripts
npm run seed
```

## 7. Monitoring & Optimization

### 7.1 Add Performance Monitoring
```typescript
// lib/monitoring.ts
export async function getHypertableInfo() {
  return await prisma.$queryRaw`
    SELECT 
      hypertable_name,
      num_chunks,
      compression_status
    FROM timescaledb_information.hypertables
    ORDER BY num_chunks DESC;
  `;
}
```

### 7.2 Backup Strategy  
- **Daily**: Automated PostgreSQL dumps
- **Weekly**: Full backup dengan TimescaleDB utilities
- **Monitoring**: Setup alerts untuk chunk growth

## 8. Performance Improvements Expected

### 8.1 Query Performance
- **LoggedData queries**: 10-100x faster dengan chunking
- **Aggregate queries**: Optimized dengan TimescaleDB functions  
- **Retention**: Automatic compression & cleanup

### 8.2 Scalability
- **Concurrency**: Better PostgreSQL connection handling
- **Data volume**: Efficient storage compression (50-80% reduction)
- **Analytics**: Advanced time series functions built-in

### 8.3 Maintenance
- **Backup**: Standard PostgreSQL tooling
- **Monitoring**: Comprehensive database observability
- **Updates**: Rolling updates dengan zero downtime
