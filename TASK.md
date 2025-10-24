 npm run seed:init

> newmodbitui@0.1.0 seed:init
> node scripts/seed-init.js

🚀 Starting modular database seeding...

📋 Seeding Configuration:
   - Users: ENABLED
   - Menu: ENABLED
   - Menu Presets: ENABLED
   - Dashboard: ENABLED
   - Devices: ENABLED
   - Layout 2D: ENABLED
   - Logging Configs: ENABLED
   - Alarm Configs: ENABLED
   - Maintenance: ENABLED
   - Reset DB: ENABLED
   - Force Generate: ENABLED

🔧 Database reset...
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": SQLite database "iot_dashboard.db" at "file:./iot_dashboard.db"

SQLite database iot_dashboard.db created at file:./iot_dashboard.db

Applying migration `20251016034716_initial`
Applying migration `20251017094758_add_rack_model`
Applying migration `20251017181353_add_tenant_model`
Applying migration `20251017182019_add_node_tenant_location_model`
Applying migration `20251017182238_add_tenant_location_relationship`
Applying migration `20251017193825_add_node_type_to_locations`
Applying migration `20251017195253_optional_tenant_id`
Applying migration `20251019180236_update_location_status_schema`
Applying migration `20251020033151_add_last_logged_at_and_interval`
Applying migration `20251021084122_add_menu_preset_tables`

Database reset successful

The following migration(s) have been applied:

migrations/
  └─ 20251016034716_initial/
    └─ migration.sql
  └─ 20251017094758_add_rack_model/
    └─ migration.sql
  └─ 20251017181353_add_tenant_model/
    └─ migration.sql
  └─ 20251017182019_add_node_tenant_location_model/
    └─ migration.sql
  └─ 20251017182238_add_tenant_location_relationship/
    └─ migration.sql
  └─ 20251017193825_add_node_type_to_locations/
    └─ migration.sql
  └─ 20251017195253_optional_tenant_id/
    └─ migration.sql
  └─ 20251019180236_update_location_status_schema/
    └─ migration.sql
  └─ 20251020033151_add_last_logged_at_and_interval/
    └─ migration.sql
  └─ 20251021084122_add_menu_preset_tables/
    └─ migration.sql

✅ Database reset completed

🔧 Prisma client generation...
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
┌─────────────────────────────────────────────────────────┐
│  Update available 6.16.2 -> 6.18.0                      │
│  Run the following to update                            │
│    npm i --save-dev prisma@latest                       │
│    npm i @prisma/client@latest                          │
└─────────────────────────────────────────────────────────┘

✔ Generated Prisma Client (v6.16.2) to ./node_modules/@prisma/client in 236ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate

✅ Prisma client generation completed

👥 Starting user seeding...
👥 Seeding users and roles...
🔍 Checking Prisma client availability...
✅ Database tables exist
   - Created role: ADMIN
   - Created role: USER
   - Created role: DEVELOPER
📋 Available roles for user creation: ADMIN, USER, DEVELOPER
   - Created user: admin@gmail.com (ADMIN)
   - Created user: user@gmail.com (USER)
   - Created user: developer@gmail.com (DEVELOPER)
✅ Users and roles seeded successfully
   - 3 roles available
   - 3 users processed
✅ User seeding completed

📋 Starting menu seeding...
📋 Seeding menu system...
✅ Menu system seeded successfully
   - 13 menu groups created
   - 45 menu items created
✅ Menu seeding completed

📋 Starting menu presets seeding...
📋 Seeding menu presets...
📋 Loaded 13 menu groups and 45 menu items
📋 Creating menu preset: Node (cmh1qu812000pgvvf9rnrhhnu)
   ✅ 11 groups and 31 items selected
📋 Creating menu preset: Server (cmh1qs5tb0000gvvf8vxmlx2w)
   ✅ 7 groups and 17 items selected
📋 Creating menu preset: Water Waste (cmh1r5xri001xgvvfb59t8h1s)
   ✅ 7 groups and 15 items selected
✅ Menu presets seeded successfully - 3 presets created
✅ Menu presets seeding completed

📱 Starting device seeding...
🔄 Starting device seeding...
📦 Processing 11 devices...

🔍 Processing: SENSOR PH 1
   ➕ Created: SENSOR PH 1 (ID: limbah-ph1)
🔍 Processing: SENSOR PH 2
   ➕ Created: SENSOR PH 2 (ID: limbah-ph2)
🔍 Processing: SENSOR PH 3
   ➕ Created: SENSOR PH 3 (ID: limbah-ph3)
🔍 Processing: WATER FLOW 1
   ➕ Created: WATER FLOW 1 (ID: limbah-flow1)
🔍 Processing: WATER FLOW 2
   ➕ Created: WATER FLOW 2 (ID: limbah-flow2)
🔍 Processing: AIR QUALITY 1
   ➕ Created: AIR QUALITY 1 (ID: limbah-airquality1-sps30)
🔍 Processing: TEMP HUM 1
   ➕ Created: TEMP HUM 1 (ID: limbah-airquality1-sht4x)
🔍 Processing: VIBRATION 1
   ➕ Created: VIBRATION 1 (ID: limbah-airquality1-lis3dhtr)
🔍 Processing: AIR QUALITY 2
   ➕ Created: AIR QUALITY 2 (ID: limbah-airquality2-sps30)
🔍 Processing: TEMP HUM 2
   ➕ Created: TEMP HUM 2 (ID: limbah-airquality2-sht4x)
🔍 Processing: VIBRATION 2
   ➕ Created: VIBRATION 2 (ID: limbah-airquality2-lis3dhtr)

📊 Device seeding summary:
   ✅ Created: 11 devices
   📝 Updated: 0 devices
   ❌ Skipped: 0 devices

🔗 Predictable Device IDs:
   💡 Device IDs are now topic-based and consistent:
   • SENSOR PH 1: limbah-ph1
   • SENSOR PH 2: limbah-ph2
   • SENSOR PH 3: limbah-ph3
   • WATER FLOW 1: limbah-flow1
   • WATER FLOW 2: limbah-flow2
   • AIR QUALITY 1: limbah-airquality1-sps30
   • TEMP HUM 1: limbah-airquality1-sht4x
   • VIBRATION 1: limbah-airquality1-lis3dhtr
   • AIR QUALITY 2: limbah-airquality2-sps30
   • TEMP HUM 2: limbah-airquality2-sht4x
   • VIBRATION 2: limbah-airquality2-lis3dhtr

🎯 Device categories seeded:
   🔬 PH Sensors: 3 devices (PH 1, 2, 3)
   💧 Water Flow: 2 devices (Flow 1, 2)
   🌪️  Air Quality: 2 devices (LPS S30 sensors)
   🌡️  Temperature: 2 devices (SHT4X sensors)
   📳 Vibration: 2 devices (LIS3DHTR sensors)
✅ Device seeding completed

📟 Starting Layout 2D seeding...
🔄 Starting Layout 2D seeding...
📦 Processing 1 layouts...

🔍 Processing: IoT-Based Wastewater Treatment Monitoring System
✅ Image verified: /home/ubuntu/Alfi/RnD/Development/newmodbitui/public/images/Diagram WTP.png
   ➕ Created: "IoT-Based Wastewater Treatment Monitoring System"

📊 Layout 2D seeding summary:
   ✅ Created: 1 layouts
   📝 Updated: 0 layouts
   ❌ Skipped: 0 layouts

🎯 Layout configuration:
   📟 Name: "IoT-Based Wastewater Treatment Monitoring System"
   🔄 Active Status: true
   🖼️  Background Image: /images/Diagram WTP.png
✅ Layout 2D seeding completed

📊 Starting dashboard seeding...
📊 Seeding dashboard layout data with pre-configured widgets...
   Found admin user: admin@gmail.com (ID: cmh46o1g80004gvd1mi5rppu2)
🔍 Processing dashboard: "IOT Dashboard"
   📝 Updated dashboard: IOT Dashboard
      ID: iot-dashboard-main
      User: cmh46o1g80004gvd1mi5rppu2
      Widgets: 11 configured widgets
      In Use: ✅
      Active: ✅

📊 Dashboard seeding summary:
   ✅ Created: 0 dashboards
   📝 Updated: 1 dashboards

🎯 Pre-configured widgets included:
   📈 Flow Monitoring: Flow rates and total flow for 2 water meters
   🌡️  PH & Temp: Dual-parameter display for 2 PH sensors
   📊 Charts: Multi-series charts for flow, PH, temperature, and totalizers
   🔗 Shortcuts: Quick access to Layout 2D monitoring schema
✅ Dashboard seeding completed successfully
🚀 Ready-to-use dashboard with monitoring widgets available.
✅ Dashboard seeding completed

📈 Starting logging configurations seeding...
📊 Seeding device logging configurations...
📦 Processing 8 logging configurations...

🔍 Processing: Flow Rate [Water Flow Meter 1]
   ➕ Created: Flow Rate [Water Flow Meter 1]
🔍 Processing: Flow Rate [Water Flow Meter 2]
   ➕ Created: Flow Rate [Water Flow Meter 2]
🔍 Processing: PH [PH Sensor 1]
   ➕ Created: PH [PH Sensor 1]
🔍 Processing: PH [PH Sensor 2]
   ➕ Created: PH [PH Sensor 2]
🔍 Processing: Temperature [PH Sensor 1]
   ➕ Created: Temperature [PH Sensor 1]
🔍 Processing: Temperature [PH Sensor 2]
   ➕ Created: Temperature [PH Sensor 2]
🔍 Processing: Total Flow [Water Flow Meter 1]
   ➕ Created: Total Flow [Water Flow Meter 1]
🔍 Processing: Total Flow [Water Flow Meter 2]
   ➕ Created: Total Flow [Water Flow Meter 2]

📊 Logging configurations seeding summary:
   ✅ Created: 8 configurations
   📝 Updated: 0 configurations
   ❌ Skipped: 0 configurations

🎯 Logging configurations summary:
   🌊 Flow Monitoring: 4 configurations (rates and totals)
   🧪 Chemical Sensors: 4 configurations (pH levels)
   🌡️  Temperature: 2 configurations (environmental)

📋 Device associations:
   • Flow Rate: 2 parameters
   • Flow Rate: 2 parameters
   • PH: 2 parameters
   • PH: 2 parameters
✅ Logging configurations seeding completed

🚨 Starting alarm configurations seeding...
🚨 Seeding alarm configurations...
📦 Processing 19 alarm configurations...

🔍 Processing: PH Critical High [PH Sensor 1]
   ➕ Created: PH Critical High [PH Sensor 1]
🔍 Processing: PH Critical Low [PH Sensor 1]
   📝 Updated existing: PH Critical Low [PH Sensor 1]
🔍 Processing: PH Major High [PH Sensor 1]
   ➕ Created: PH Major High [PH Sensor 1]
🔍 Processing: PH Minor Low [PH Sensor 1]
   ➕ Created: PH Minor Low [PH Sensor 1]
🔍 Processing: PH Critical High [PH Sensor 2]
   ➕ Created: PH Critical High [PH Sensor 2]
🔍 Processing: PH Major Low [PH Sensor 2]
   ➕ Created: PH Major Low [PH Sensor 2]
🔍 Processing: PH Warning High [PH Sensor 3]
   ➕ Created: PH Warning High [PH Sensor 3]
🔍 Processing: Temperature Critical High [PH Sensor 1]
   ➕ Created: Temperature Critical High [PH Sensor 1]
🔍 Processing: Temperature Major High [PH Sensor 1]
   ➕ Created: Temperature Major High [PH Sensor 1]
🔍 Processing: Temperature Critical Low [PH Sensor 2]
   ➕ Created: Temperature Critical Low [PH Sensor 2]
🔍 Processing: Temperature Major High [PH Sensor 2]
   ➕ Created: Temperature Major High [PH Sensor 2]
🔍 Processing: Flow Rate Critical Low [Water Flow Meter 1]
   ➕ Created: Flow Rate Critical Low [Water Flow Meter 1]
🔍 Processing: Flow Rate Major High [Water Flow Meter 1]
   ➕ Created: Flow Rate Major High [Water Flow Meter 1]
🔍 Processing: Flow Rate Critical No Flow [Water Flow Meter 2]
   ➕ Created: Flow Rate Critical No Flow [Water Flow Meter 2]
🔍 Processing: Flow Rate Major Low [Water Flow Meter 2]
   ➕ Created: Flow Rate Major Low [Water Flow Meter 2]
🔍 Processing: PM2.5 Critical High [Air Quality 1]
   ➕ Created: PM2.5 Critical High [Air Quality 1]
🔍 Processing: PM10 Major High [Air Quality 1]
   ➕ Created: PM10 Major High [Air Quality 1]
🔍 Processing: Humidity Critical Low [Air Quality 2]
   ➕ Created: Humidity Critical Low [Air Quality 2]
🔍 Processing: Vibration Sensor Fault [Vibration 1]
   ➕ Created: Vibration Sensor Fault [Vibration 1]

📊 Alarm configurations seeding summary:
   ✅ Created: 18 configurations
   📝 Updated: 1 configurations
   ❌ Skipped: 0 configurations

🎯 Alarm configurations summary:
   🚨 Critical Alarms: 9 configurations
   ⚠️  Major Alarms: 8 configurations
   ℹ️  Minor Alarms: 2 configurations
   📏 Threshold-based: 18 configurations
   🔢 Bit Value-based: 1 configurations

📋 Device associations:
   • PH Sensor 1: 6 alarm configs
   • PH Sensor 2: 4 alarm configs
   • PH Sensor 3: 1 alarm configs
   • Water Flow Meter 1: 2 alarm configs
   • Water Flow Meter 2: 2 alarm configs
   • Air Quality 1: 2 alarm configs
   • Air Quality 2: 1 alarm configs
   • Vibration 1: 1 alarm configs
📋 Seeding alarm logs...
📦 Processing 8 alarm logs...

   ➕ Created log: ph-sensor-1-high-001 (CLEARED)
   ➕ Created log: temp-sensor-2-high-001 (ACTIVE)
   ➕ Created log: flow-rate-1-low-001 (CLEARED)
   ➕ Created log: ph-sensor-2Major-high-002 (CLEARED)
   ➕ Created log: flow-rate-2-no-flow-001 (ACKNOWLEDGED)
   ⚠️  Alarm config not found: temp-sensor-1-critical-low, skipping log...
   ➕ Created log: air-quality-1-pm25-001 (ACTIVE)
   ➕ Created log: vibration-1-fault-001 (CLEARED)

📊 Alarm logs seeding summary:
   ✅ Created: 7 logs
   ⏭️  Skipped: 1 logs

📋 Alarm log status distribution:
   🔴 Active: 2 alarms
   🟡 Acknowledged: 1 alarms
   🟢 Cleared: 5 alarms
✅ Alarm configurations seeding completed

🔧 Starting maintenance seeding...
🔧 Starting maintenance seeding...
📋 Processing 2 maintenance records...

🔍 Processing: Maintenance Sensor PH
   ⚠️  Target device not found: cmgsx5t3400a1gvt6a4dbjsii, skipping...
🔍 Processing: Maintenance Sensor PH 2
   ⚠️  Target device not found: cmgsx5t3700a3gvt6pysfjq9p, skipping...

📊 Maintenance seeding summary:
   ✅ Created: 0 records
   📝 Updated: 0 records
   ❌ Skipped: 2 records

🎯 Maintenance categories seeded:
   🔧 PH Sensor Maintenance: 2 scheduled maintenance tasks
      - Weekly maintenance for PH Sensor 1 and 2
      - Assigned to user@gmail.com
      - Status: Scheduled
✅ Maintenance seeding completed

🎉 Modular seeding completed successfully!

📝 Summary of seeded modules:
   ✅ Users & Roles seeded
      - ADMIN: admin@gmail.com / admin123
      - USER: user@gmail.com / user123
      - DEVELOPER: developer@gmail.com / dev123
   ✅ Menu System seeded (70+ menu items)
      - 11 Menu Groups
      - Role-based permissions
      - Admin Menu Management
   ✅ Menu Presets seeded (3 presets)
      - "Node" preset: 11 groups, 32 items (full access)
      - "Server" preset: 7 groups, 17 items (server focus)
      - "Water Waste" preset: 8 groups, 18 items (waste water monitoring)
      - Ready for menu preset management in admin panel
   ✅ Dashboard Layout seeded
      - Pre-configured dashboard with 11 monitoring widgets
      - Flow meters, PH sensors, temperature monitoring
      - Multi-series charts and navigation shortcuts
      - Ready-to-use for IoT wastewater monitoring
   ✅ IoT Devices seeded (11 devices)
      - 3 pH Sensors (addresses 1, 2, 5)
      - 2 Water Flow meters
      - 2 Air Quality stations
      - 2 Temp/Humidity sensors
      - 2 Vibration sensors
   ✅ Layout 2D seeded (1 layout)
      - "IoT-Based Wastewater Treatment Monitoring System" (isUse: true)
      - Background Image: /images/Diagram WTP.png
      - Ready for data point configuration
   ✅ Logging Configurations seeded (8 configurations)
      - 4 Flow monitoring configs (rates and totals)
      - 2 PH sensor configs (pH levels)
      - 2 Temperature monitoring configs
      - Ready for chart visualization and data logging
   ✅ Alarm Configurations seeded (19 configurations + 8 demo logs)
      - 10 Critical alarms (threshold-based)
      - 6 Major alarms (mid-level alerts)
      - 3 Minor alarms (warning level)
      - 1 Bit value alarm (digital status)
      - Demo alarm logs for testing dashboard widgets
   ✅ Maintenance seeded (2 scheduled tasks)
      - PH Sensor maintenance schedules
      - Weekly maintenance cycles
      - Assigned to regular users

💡 Control seeding with environment variables:
   SEED_USERS=false         # Disable user seeding
   SEED_MENU=false          # Disable menu seeding
   SEED_MENU_PRESETS=false  # Disable menu presets seeding
   SEED_DASHBOARD=false     # Disable dashboard seeding
   SEED_DEVICES=false       # Disable device seeding
   SEED_LAYOUT2D=false      # Disable Layout 2D seeding
   SEED_LOGGING_CONFIGS=false # Disable logging configs seeding
   SEED_ALARM_CONFIGS=false # Disable alarm configurations seeding
   SEED_MAINTENANCE=false   # Disable maintenance seeding
   RESET_DB=false           # Disable database reset
   FORCE_GENERATE=false     # Skip Prisma generation

✅ All seeding operations completed successfully!
ubuntu@ubuntu-Alfi-Maulana:~/Alfi/RnD/Development/newmodbitui$ 