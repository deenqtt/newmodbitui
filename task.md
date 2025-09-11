containment@containment:~/newmodbitui$ sudo chmod +x de
default deploy.sh
containment@containment:~/newmodbitui$ sudo chmod +x deploy.sh
[sudo] password for containment:
containment@containment:~/newmodbitui$ sudo ./deploy.sh
[2025-09-11 10:26:21] === IoT Dashboard Deployment Script ===
[2025-09-11 10:26:21] Project Root: /home/containment/newmodbitui
[2025-09-11 10:26:21] Target Port: 3001
[2025-09-11 10:26:21] === Checking Dependencies ===
Hit:1 http://id.archive.ubuntu.com/ubuntu jammy InRelease
Get:2 http://id.archive.ubuntu.com/ubuntu jammy-updates InRelease [128 kB]
Hit:3 https://deb.nodesource.com/node_22.x nodistro InRelease
Hit:4 https://packages.microsoft.com/ubuntu/22.04/prod jammy InRelease
Hit:5 http://id.archive.ubuntu.com/ubuntu jammy-backports InRelease
Hit:6 https://download.docker.com/linux/ubuntu jammy InRelease
Get:7 http://id.archive.ubuntu.com/ubuntu jammy-updates/main amd64 c-n-f Metadata [18,9 kB]
Get:8 http://security.ubuntu.com/ubuntu jammy-security InRelease [129 kB]
Fetched 276 kB in 2s (181 kB/s)
Reading package lists... Done
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
ca-certificates is already the newest version (20240203~22.04.1).
curl is already the newest version (7.81.0-1ubuntu1.20).
software-properties-common is already the newest version (0.99.22.9).
wget is already the newest version (1.21.2-2ubuntu1.1).
apt-transport-https is already the newest version (2.4.14).
Suggested packages:
sqlite3-doc
The following NEW packages will be installed:
gnupg2 sqlite3
0 upgraded, 2 newly installed, 0 to remove and 30 not upgraded.
Need to get 774 kB of archives.
After this operation, 1.926 kB of additional disk space will be used.
Get:1 http://id.archive.ubuntu.com/ubuntu jammy-updates/main amd64 sqlite3 amd64 3.37.2-2ubuntu0.5 [769 kB]
Get:2 http://id.archive.ubuntu.com/ubuntu jammy-updates/universe amd64 gnupg2 all 2.2.27-3ubuntu2.4 [5.544 B]
Fetched 774 kB in 1s (678 kB/s)
Selecting previously unselected package sqlite3.
(Reading database ... 247163 files and directories currently installed.)
Preparing to unpack .../sqlite3_3.37.2-2ubuntu0.5_amd64.deb ...
Unpacking sqlite3 (3.37.2-2ubuntu0.5) ...
Selecting previously unselected package gnupg2.
Preparing to unpack .../gnupg2_2.2.27-3ubuntu2.4_all.deb ...
Unpacking gnupg2 (2.2.27-3ubuntu2.4) ...
Setting up gnupg2 (2.2.27-3ubuntu2.4) ...
Setting up sqlite3 (3.37.2-2ubuntu0.5) ...
Processing triggers for man-db (2.10.2-1) ...
[2025-09-11 10:26:33] Checking Node.js installation...
[SUCCESS] Node.js v22.18.0 and npm 10.9.3 are installed
[2025-09-11 10:26:33] Checking PostgreSQL installation...
[ERROR] PostgreSQL not found
[2025-09-11 10:26:33] Checking PM2 installation...
[SUCCESS] PM2 v6.0.8 is installed
[2025-09-11 10:26:33] Checking Nginx installation...
[SUCCESS] Nginx v1.18.0 is installed
[2025-09-11 10:26:33] Checking Mosquitto MQTT installation...
[SUCCESS] Mosquitto MQTT Broker is installed
[WARNING] Missing dependencies: postgresql
[2025-09-11 10:26:33] Installing missing dependencies...
[2025-09-11 10:26:33] === Installing Missing Dependencies ===
[2025-09-11 10:26:33] Checking Node.js installation...
[SUCCESS] Node.js v22.18.0 and npm 10.9.3 are installed
[2025-09-11 10:26:33] Checking PostgreSQL installation...
[ERROR] PostgreSQL not found
[2025-09-11 10:26:33] Installing PostgreSQL...
Hit:1 http://id.archive.ubuntu.com/ubuntu jammy InRelease
Hit:2 http://id.archive.ubuntu.com/ubuntu jammy-updates InRelease
Hit:3 http://id.archive.ubuntu.com/ubuntu jammy-backports InRelease
Hit:4 https://deb.nodesource.com/node_22.x nodistro InRelease
Hit:5 https://packages.microsoft.com/ubuntu/22.04/prod jammy InRelease
Hit:6 https://download.docker.com/linux/ubuntu jammy InRelease
Hit:7 http://security.ubuntu.com/ubuntu jammy-security InRelease
Reading package lists... Done
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
The following additional packages will be installed:
libcommon-sense-perl libjson-perl libjson-xs-perl libllvm14 libpq5 libtypes-serialiser-perl postgresql-14 postgresql-client-14
postgresql-client-common postgresql-common sysstat
Suggested packages:
postgresql-doc postgresql-doc-14 isag
The following NEW packages will be installed:
libcommon-sense-perl libjson-perl libjson-xs-perl libllvm14 libpq5 libtypes-serialiser-perl postgresql postgresql-14 postgresql-client-14
postgresql-client-common postgresql-common postgresql-contrib sysstat
0 upgraded, 13 newly installed, 0 to remove and 30 not upgraded.
Need to get 42,5 MB of archives.
After this operation, 162 MB of additional disk space will be used.
Get:1 http://id.archive.ubuntu.com/ubuntu jammy/main amd64 libcommon-sense-perl amd64 3.75-2build1 [21,1 kB]
Get:2 http://id.archive.ubuntu.com/ubuntu jammy/main amd64 libjson-perl all 4.04000-1 [81,8 kB]
Get:3 http://id.archive.ubuntu.com/ubuntu jammy/main amd64 libtypes-serialiser-perl all 1.01-1 [11,6 kB]
Get:4 http://id.archive.ubuntu.com/ubuntu jammy/main amd64 libjson-xs-perl amd64 4.030-1build3 [87,2 kB]
Get:5 http://id.archive.ubuntu.com/ubuntu jammy-updates/main amd64 libllvm14 amd64 1:14.0.0-1ubuntu1.1 [24,0 MB]
Get:6 http://id.archive.ubuntu.com/ubuntu jammy-updates/main amd64 libpq5 amd64 14.19-0ubuntu0.22.04.1 [152 kB]
Get:7 http://id.archive.ubuntu.com/ubuntu jammy/main amd64 postgresql-client-common all 238 [29,6 kB]
Get:8 http://id.archive.ubuntu.com/ubuntu jammy-updates/main amd64 postgresql-client-14 amd64 14.19-0ubuntu0.22.04.1 [1.249 kB]
Get:9 http://id.archive.ubuntu.com/ubuntu jammy/main amd64 postgresql-common all 238 [169 kB]
Get:10 http://id.archive.ubuntu.com/ubuntu jammy-updates/main amd64 postgresql-14 amd64 14.19-0ubuntu0.22.04.1 [16,2 MB]
Get:11 http://id.archive.ubuntu.com/ubuntu jammy/main amd64 postgresql all 14+238 [3.288 B]
Get:12 http://id.archive.ubuntu.com/ubuntu jammy/main amd64 postgresql-contrib all 14+238 [3.292 B]
Get:13 http://id.archive.ubuntu.com/ubuntu jammy-updates/main amd64 sysstat amd64 12.5.2-2ubuntu0.2 [487 kB]
Fetched 42,5 MB in 13s (3.264 kB/s)
Preconfiguring packages ...
Selecting previously unselected package libcommon-sense-perl:amd64.
(Reading database ... 247175 files and directories currently installed.)
Preparing to unpack .../00-libcommon-sense-perl_3.75-2build1_amd64.deb ...
Unpacking libcommon-sense-perl:amd64 (3.75-2build1) ...
Selecting previously unselected package libjson-perl.
Preparing to unpack .../01-libjson-perl_4.04000-1_all.deb ...
Unpacking libjson-perl (4.04000-1) ...
Selecting previously unselected package libtypes-serialiser-perl.
Preparing to unpack .../02-libtypes-serialiser-perl_1.01-1_all.deb ...
Unpacking libtypes-serialiser-perl (1.01-1) ...
Selecting previously unselected package libjson-xs-perl.
Preparing to unpack .../03-libjson-xs-perl_4.030-1build3_amd64.deb ...
Unpacking libjson-xs-perl (4.030-1build3) ...
Selecting previously unselected package libllvm14:amd64.
Preparing to unpack .../04-libllvm14_1%3a14.0.0-1ubuntu1.1_amd64.deb ...
Unpacking libllvm14:amd64 (1:14.0.0-1ubuntu1.1) ...
Selecting previously unselected package libpq5:amd64.
Preparing to unpack .../05-libpq5_14.19-0ubuntu0.22.04.1_amd64.deb ...
Unpacking libpq5:amd64 (14.19-0ubuntu0.22.04.1) ...
Selecting previously unselected package postgresql-client-common.
Preparing to unpack .../06-postgresql-client-common_238_all.deb ...
Unpacking postgresql-client-common (238) ...
Selecting previously unselected package postgresql-client-14.
Preparing to unpack .../07-postgresql-client-14_14.19-0ubuntu0.22.04.1_amd64.deb ...
Unpacking postgresql-client-14 (14.19-0ubuntu0.22.04.1) ...
Selecting previously unselected package postgresql-common.
Preparing to unpack .../08-postgresql-common_238_all.deb ...
Adding 'diversion of /usr/bin/pg_config to /usr/bin/pg_config.libpq-dev by postgresql-common'
Unpacking postgresql-common (238) ...
Selecting previously unselected package postgresql-14.
Preparing to unpack .../09-postgresql-14_14.19-0ubuntu0.22.04.1_amd64.deb ...
Unpacking postgresql-14 (14.19-0ubuntu0.22.04.1) ...
Selecting previously unselected package postgresql.
Preparing to unpack .../10-postgresql_14+238_all.deb ...
Unpacking postgresql (14+238) ...
Selecting previously unselected package postgresql-contrib.
Preparing to unpack .../11-postgresql-contrib_14+238_all.deb ...
Unpacking postgresql-contrib (14+238) ...
Selecting previously unselected package sysstat.
Preparing to unpack .../12-sysstat_12.5.2-2ubuntu0.2_amd64.deb ...
Unpacking sysstat (12.5.2-2ubuntu0.2) ...
Setting up postgresql-client-common (238) ...
Setting up libpq5:amd64 (14.19-0ubuntu0.22.04.1) ...
Setting up libcommon-sense-perl:amd64 (3.75-2build1) ...
Setting up postgresql-client-14 (14.19-0ubuntu0.22.04.1) ...
update-alternatives: using /usr/share/postgresql/14/man/man1/psql.1.gz to provide /usr/share/man/man1/psql.1.gz (psql.1.gz) in auto mode
Setting up libllvm14:amd64 (1:14.0.0-1ubuntu1.1) ...
Setting up libtypes-serialiser-perl (1.01-1) ...
Setting up libjson-perl (4.04000-1) ...
Setting up sysstat (12.5.2-2ubuntu0.2) ...

Creating config file /etc/default/sysstat with new version
update-alternatives: using /usr/bin/sar.sysstat to provide /usr/bin/sar (sar) in auto mode
Created symlink /etc/systemd/system/sysstat.service.wants/sysstat-collect.timer → /lib/systemd/system/sysstat-collect.timer.
Created symlink /etc/systemd/system/sysstat.service.wants/sysstat-summary.timer → /lib/systemd/system/sysstat-summary.timer.
Created symlink /etc/systemd/system/multi-user.target.wants/sysstat.service → /lib/systemd/system/sysstat.service.
Setting up libjson-xs-perl (4.030-1build3) ...
Setting up postgresql-common (238) ...
Adding user postgres to group ssl-cert

Creating config file /etc/postgresql-common/createcluster.conf with new version
Building PostgreSQL dictionaries from installed myspell/hunspell packages...
en_us
Removing obsolete dictionary files:
Created symlink /etc/systemd/system/multi-user.target.wants/postgresql.service → /lib/systemd/system/postgresql.service.
Setting up postgresql-14 (14.19-0ubuntu0.22.04.1) ...
Creating new PostgreSQL cluster 14/main ...
/usr/lib/postgresql/14/bin/initdb -D /var/lib/postgresql/14/main --auth-local peer --auth-host scram-sha-256 --no-instructions
The files belonging to this database system will be owned by user "postgres".
This user must also own the server process.

The database cluster will be initialized with locales
COLLATE: en_US.UTF-8
CTYPE: en_US.UTF-8
MESSAGES: en_US.UTF-8
MONETARY: id_ID.UTF-8
NUMERIC: id_ID.UTF-8
TIME: id_ID.UTF-8
The default database encoding has accordingly been set to "UTF8".
The default text search configuration will be set to "english".

Data page checksums are disabled.

<<<<<<< HEAD
- Login Page
=======
fixing permissions on existing directory /var/lib/postgresql/14/main ... ok
creating subdirectories ... ok
selecting dynamic shared memory implementation ... posix
selecting default max_connections ... 100
selecting default shared_buffers ... 128MB
selecting default time zone ... Asia/Jakarta
creating configuration files ... ok
running bootstrap script ... ok
performing post-bootstrap initialization ... ok
syncing data to disk ... ok
update-alternatives: using /usr/share/postgresql/14/man/man1/postmaster.1.gz to provide /usr/share/man/man1/postmaster.1.gz (postmaster.1.gz) in auto mode
Setting up postgresql-contrib (14+238) ...
Setting up postgresql (14+238) ...
Processing triggers for man-db (2.10.2-1) ...
Processing triggers for libc-bin (2.35-0ubuntu3.10) ...
Synchronizing state of postgresql.service with SysV service script with /lib/systemd/systemd-sysv-install.
Executing: /lib/systemd/systemd-sysv-install enable postgresql
[SUCCESS] PostgreSQL installed and started successfully
[2025-09-11 10:27:08] Checking PM2 installation...
[SUCCESS] PM2 v6.0.8 is installed
[2025-09-11 10:27:08] Checking Nginx installation...
[SUCCESS] Nginx v1.18.0 is installed
[2025-09-11 10:27:08] Checking Mosquitto MQTT installation...
[SUCCESS] Mosquitto MQTT Broker is installed
[2025-09-11 10:27:08] === Checking Dependencies ===
Hit:1 http://id.archive.ubuntu.com/ubuntu jammy InRelease
Hit:2 http://id.archive.ubuntu.com/ubuntu jammy-updates InRelease
Hit:3 http://id.archive.ubuntu.com/ubuntu jammy-backports InRelease
Hit:4 https://deb.nodesource.com/node_22.x nodistro InRelease
Hit:5 https://packages.microsoft.com/ubuntu/22.04/prod jammy InRelease
Hit:6 http://security.ubuntu.com/ubuntu jammy-security InRelease
Hit:7 https://download.docker.com/linux/ubuntu jammy InRelease
Reading package lists... Done
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
ca-certificates is already the newest version (20240203~22.04.1).
curl is already the newest version (7.81.0-1ubuntu1.20).
software-properties-common is already the newest version (0.99.22.9).
sqlite3 is already the newest version (3.37.2-2ubuntu0.5).
wget is already the newest version (1.21.2-2ubuntu1.1).
apt-transport-https is already the newest version (2.4.14).
gnupg2 is already the newest version (2.2.27-3ubuntu2.4).
0 upgraded, 0 newly installed, 0 to remove and 30 not upgraded.
[2025-09-11 10:27:12] Checking Node.js installation...
[SUCCESS] Node.js v22.18.0 and npm 10.9.3 are installed
[2025-09-11 10:27:12] Checking PostgreSQL installation...
[SUCCESS] PostgreSQL 14.19 is installed
[2025-09-11 10:27:12] Checking PM2 installation...
[SUCCESS] PM2 v6.0.8 is installed
[2025-09-11 10:27:12] Checking Nginx installation...
[SUCCESS] Nginx v1.18.0 is installed
[2025-09-11 10:27:12] Checking Mosquitto MQTT installation...
[SUCCESS] Mosquitto MQTT Broker is installed
[SUCCESS] All dependencies are installed
[2025-09-11 10:27:12] === Setting Up PostgreSQL Database ===
CREATE DATABASE
CREATE ROLE
ALTER ROLE
GRANT
could not change directory to "/home/containment/newmodbitui": Permission denied
[SUCCESS] Database connection test successful
[SUCCESS] Database setup completed
[2025-09-11 10:27:17] === Configuring Environment ===
[SUCCESS] Environment configuration created
[2025-09-11 10:27:17] === Installing Application Dependencies ===
[2025-09-11 10:27:17] Installing npm dependencies...
npm warn deprecated @types/mqtt@2.5.0: This is a stub types definition for MQTT (https://github.com/mqttjs/MQTT.js). MQTT provides its own type definitions, so you don't need @types/mqtt installed!
npm warn deprecated inflight@1.0.6: This module is not supported, and leaks memory. Do not use it. Check out lru-cache if you want a good and tested way to coalesce async requests by a key value, which is much more comprehensive and powerful.
npm warn deprecated rimraf@2.7.1: Rimraf versions prior to v4 are no longer supported
npm warn deprecated lodash.isequal@4.5.0: This package is deprecated. Use require('node:util').isDeepStrictEqual instead.
npm warn deprecated @humanwhocodes/config-array@0.13.0: Use @eslint/config-array instead
npm warn deprecated rimraf@3.0.2: Rimraf versions prior to v4 are no longer supported
npm warn deprecated @humanwhocodes/object-schema@2.0.3: Use @eslint/object-schema instead
npm warn deprecated glob@7.2.3: Glob versions prior to v9 are no longer supported
npm warn deprecated glob@7.1.7: Glob versions prior to v9 are no longer supported
npm warn deprecated fstream@1.0.12: This package is no longer supported.
npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
npm warn deprecated @types/cookie@1.0.0: This is a stub types definition. cookie provides its own type definitions, so you do not need this installed.
npm warn deprecated @types/bcryptjs@3.0.0: This is a stub types definition. bcryptjs provides its own type definitions, so you do not need this installed.
npm warn deprecated eslint@8.57.1: This version is no longer supported. Please see https://eslint.org/version-support for other options.
>>>>>>> main

added 904 packages, and audited 905 packages in 2m

188 packages are looking for funding
run `npm fund` for details

2 vulnerabilities (1 low, 1 critical)

To address issues that do not require attention, run:
npm audit fix

To address all issues, run:
npm audit fix --force

Run `npm audit` for details.
[2025-09-11 10:29:22] Installing Prisma CLI globally...

added 33 packages in 17s

5 packages are looking for funding
run `npm fund` for details
[2025-09-11 10:29:39] Generating Prisma client...
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
┌─────────────────────────────────────────────────────────┐
│ Update available 6.14.0 -> 6.16.0 │
│ Run the following to update │
│ npm i --save-dev prisma@latest │
│ npm i @prisma/client@latest │
└─────────────────────────────────────────────────────────┘

✔ Generated Prisma Client (v6.14.0) to ./node_modules/@prisma/client in 319ms

Start by importing your Prisma Client (See: https://pris.ly/d/importing-client)

Tip: Need your database queries to be 1000x faster? Accelerate offers you that and more: https://pris.ly/tip-2-accelerate

[SUCCESS] Application dependencies installed
[2025-09-11 10:29:42] === Setting Up Database Schema ===
[2025-09-11 10:29:42] Running database migrations...
Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "iot_dashboard", schema "public" at "localhost:5432"

1 migration found in prisma/migrations

Error: P3019

The datasource provider `postgresql` specified in your schema does not match the one specified in the migration_lock.toml, `sqlite`. Please remove your current migration directory and start a new migration history with prisma migrate dev. Read more: https://pris.ly/d/migrate-provider-switch

Environment variables loaded from .env
Prisma schema loaded from prisma/schema.prisma
Datasource "db": PostgreSQL database "iot_dashboard", schema "public" at "localhost:5432"

🚀 Your database is now in sync with your Prisma schema. Done in 371ms

✔ Generated Prisma Client (v6.14.0) to ./node_modules/@prisma/client in 289ms

[2025-09-11 10:29:48] Seeding initial data...

> newmodbitui@0.1.0 db:seed
> npm run seed:users

> newmodbitui@0.1.0 seed:users
> node scripts/seed-users.js

🌱 Starting user seeding process...

✅ Users table is empty. Proceeding with seeding...

Creating admin user: admin@modbit.com
✅ User created successfully!
ID: cmfeuo72i0000y79vlb8p0swd
Email: admin@modbit.com
Role: ADMIN
Phone: +62123456789
Created: 9/11/2025, 10:29:49 AM

Creating user user: user@modbit.com
✅ User created successfully!
ID: cmfeuo7ch0001y79vr0ujpfv1
Email: user@modbit.com
Role: USER
Phone: +62987654321
Created: 9/11/2025, 10:29:49 AM

🎉 User seeding completed successfully!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 SUMMARY:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ 2 users created successfully

📝 DEFAULT LOGIN CREDENTIALS:
┌─────────────────────────────────────────────────┐
│ ADMIN USER │
├─────────────────────────────────────────────────┤
│ Email: admin@modbit.com │
│ Password: admin123 │
│ Role: ADMIN │
└─────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────┐
│ REGULAR USER │
├─────────────────────────────────────────────────┤
│ Email: user@modbit.com │
│ Password: user123 │
│ Role: USER │
└─────────────────────────────────────────────────┘

⚠️ IMPORTANT SECURITY NOTES:
• Please change these default passwords immediately after first login
• Consider implementing additional security measures in production
• Store sensitive credentials securely

[SUCCESS] Database schema setup completed
[2025-09-11 10:29:49] === Building Application ===
[2025-09-11 10:29:49] Building Next.js application...

> newmodbitui@0.1.0 build
> next build

▲ Next.js 14.0.0

- Environments: .env
- Experiments (use at your own risk):
  · instrumentationHook

⚠ Compiled with warnings

./node_modules/next/dist/esm/shared/lib/router/utils/app-paths.js
A Node.js module is loaded ('url' at line 3) which is not supported in the Edge Runtime.
Learn More: https://nextjs.org/docs/messages/node-module-in-edge-runtime

Import trace for requested module:
./node_modules/next/dist/esm/shared/lib/router/utils/app-paths.js

Skipping validation of types
Skipping linting
✓ Collecting page data
✓ Generating static pages (100/100)
✓ Collecting build traces
✓ Finalizing page optimization

Creating an optimized production build .Route (app) Size First Load JS
┌ ○ / 3.42 kB 110 kB
├ ○ /\_not-found 882 B 89.5 kB
├ ○ /alarms/alarm-log-reports 3.25 kB 131 kB
├ ○ /alarms/alarm-management 13.4 kB 170 kB
├ ○ /analytics/devices-log-report 4.9 kB 161 kB
├ λ /api/alarm-log 0 B 0 B
├ λ /api/alarms 0 B 0 B
├ λ /api/alarms/[id] 0 B 0 B
├ ○ /api/alarms/summary 0 B 0 B
├ λ /api/auth/login 0 B 0 B
├ λ /api/auth/logout 0 B 0 B
├ λ /api/auth/me 0 B 0 B
├ λ /api/auth/register 0 B 0 B
├ λ /api/auth/setup-admin 0 B 0 B
├ λ /api/bill-configs 0 B 0 B
├ λ /api/bill-configs/[id] 0 B 0 B
├ λ /api/bill-logs 0 B 0 B
├ λ /api/bill-logs/delete-all 0 B 0 B
├ λ /api/bill-logs/log-once 0 B 0 B
├ λ /api/cctv 0 B 0 B
├ λ /api/cctv/[id] 0 B 0 B
├ λ /api/cctv/[id]/monitors 0 B 0 B
├ λ /api/cctv/[id]/snapshot 0 B 0 B
├ λ /api/cctv/[id]/stream 0 B 0 B
├ λ /api/cctv/[id]/stream-url 0 B 0 B
├ λ /api/cctv/[id]/videos 0 B 0 B
├ λ /api/cron/bill-logger 0 B 0 B
├ ○ /api/cron/log-data 0 B 0 B
├ λ /api/dashboards 0 B 0 B
├ λ /api/dashboards/[id] 0 B 0 B
├ λ /api/dashboards/active 0 B 0 B
├ λ /api/devices-log-report 0 B 0 B
├ λ /api/devices/access-controllers 0 B 0 B
├ λ /api/devices/access-controllers/[id] 0 B 0 B
├ λ /api/devices/access-controllers/[id]/action 0 B 0 B
├ λ /api/devices/access-controllers/[id]/logs 0 B 0 B
├ λ /api/devices/access-controllers/[id]/remote-open 0 B 0 B
├ λ /api/devices/access-controllers/[id]/sync-logs 0 B 0 B
├ λ /api/devices/access-controllers/[id]/users 0 B 0 B
├ λ /api/devices/external 0 B 0 B
├ λ /api/devices/external/[id] 0 B 0 B
├ λ /api/devices/for-selection 0 B 0 B
├ λ /api/ec25 0 B 0 B
├ λ /api/ec25/commands 0 B 0 B
├ λ /api/ec25/config 0 B 0 B
├ λ /api/energy-targets 0 B 0 B
├ ○ /api/health 0 B 0 B
├ λ /api/historical/bill-chart-data 0 B 0 B
├ λ /api/historical/chart-data 0 B 0 B
├ λ /api/historical/energy-target-data 0 B 0 B
├ λ /api/historical/usage 0 B 0 B
├ ○ /api/ip-address 0 B 0 B
├ λ /api/logging-configs 0 B 0 B
├ λ /api/logging-configs/[id] 0 B 0 B
├ λ /api/logging-configs/batch-upload 0 B 0 B
├ λ /api/lorawan/applications 0 B 0 B
├ λ /api/lorawan/applications/[applicationId] 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices/[devEui] 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices/[devEui]/activation 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices/[devEui]/events 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices/[devEui]/flush-nonces 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices/[devEui]/frames 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices/[devEui]/keys 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices/[devEui]/queue 0 B 0 B
├ λ /api/lorawan/applications/[applicationId]/devices/[devEui]/reactivate 0 B 0 B
├ λ /api/lorawan/device-profiles 0 B 0 B
├ λ /api/lorawan/devices 0 B 0 B
├ λ /api/lorawan/devices/[id]/history 0 B 0 B
├ λ /api/lorawan/devices/[id]/latest 0 B 0 B
├ ○ /api/lorawan/gateways 0 B 0 B
├ λ /api/lorawan/gateways/[id] 0 B 0 B
├ λ /api/lorawan/gateways/[id]/stats 0 B 0 B
├ λ /api/maintenance 0 B 0 B
├ λ /api/menu-configuration 0 B 0 B
├ λ /api/network/configure 0 B 0 B
├ λ /api/notifications 0 B 0 B
├ λ /api/power-analyzer 0 B 0 B
├ λ /api/power-analyzer/[id] 0 B 0 B
├ λ /api/pue-configs 0 B 0 B
├ λ /api/pue-configs/[id] 0 B 0 B
├ λ /api/system-backup/create 0 B 0 B
├ λ /api/topics/by-uniqid/[uniqId] 0 B 0 B
├ λ /api/users 0 B 0 B
├ λ /api/users/[id] 0 B 0 B
├ λ /api/whatsapp/alarm 0 B 0 B
├ λ /api/whatsapp/bulk 0 B 0 B
├ λ /api/whatsapp/config 0 B 0 B
├ λ /api/whatsapp/maintenance 0 B 0 B
├ λ /api/whatsapp/send 0 B 0 B
├ λ /api/whatsapp/test 0 B 0 B
├ λ /api/zigbee/bridge 0 B 0 B
├ λ /api/zigbee/coordinator 0 B 0 B
├ λ /api/zigbee/devices 0 B 0 B
├ λ /api/zigbee/devices/[deviceId] 0 B 0 B
├ λ /api/zigbee/devices/[deviceId]/command 0 B 0 B
├ ○ /api/zigbee/stats 0 B 0 B
├ λ /api/zkteco/devices 0 B 0 B
├ λ /api/zkteco/devices/[id] 0 B 0 B
├ λ /api/zkteco/devices/[id]/users 0 B 0 B
├ λ /api/zkteco/devices/[id]/users/[uid]/command 0 B 0 B
├ ○ /automation/automated-scheduling 11.5 kB 169 kB
├ ○ /automation/automation-values 10.8 kB 168 kB
├ ○ /automation/dynamic-payload 13.4 kB 171 kB
├ ○ /automation/smart-logic-automation 12.1 kB 169 kB
├ ○ /automation/static-payload 11.4 kB 169 kB
├ ○ /automation/voice-command 11.3 kB 168 kB
├ λ /dashboard/[id] 69.3 kB 898 kB
├ ○ /devices/access-controllers 6.08 kB 117 kB
├ λ /devices/access-controllers/[id]/users 7.97 kB 119 kB
├ ○ /devices/devices-external 10.1 kB 167 kB
├ ○ /devices/devices-for-logging 10.8 kB 175 kB
├ ○ /devices/devices-internal 14.9 kB 176 kB
├ ○ /devices/zigbee 14.3 kB 172 kB
├ ○ /lo-ra-wan/applications 8.47 kB 146 kB
├ λ /lo-ra-wan/applications/[id] 10.8 kB 174 kB
├ λ /lo-ra-wan/applications/[id]/devices/[devEui] 11.6 kB 183 kB
├ ○ /lo-ra-wan/device-list 2.83 kB 109 kB
├ λ /lo-ra-wan/device-list/[id]/history 3.59 kB 125 kB
├ ○ /lo-ra-wan/device-profiles 8.47 kB 157 kB
├ ○ /lo-ra-wan/ec25-modem 135 kB 244 kB
├ ○ /lo-ra-wan/gateways 4.72 kB 133 kB
├ λ /lo-ra-wan/gateways/[id]/dashboard 6.3 kB 106 kB
├ ○ /login 3.16 kB 125 kB
├ ○ /maintenance/schedule-management 10.7 kB 195 kB
├ ○ /manage-dashboard 8.21 kB 139 kB
├ ○ /network/communication-setup 6.99 kB 164 kB
├ ○ /network/mqtt-broker 10.9 kB 168 kB
├ ○ /network/register-snmp 12.1 kB 169 kB
├ ○ /register 2.9 kB 131 kB
├ ○ /security-access/access-control 9.28 kB 146 kB
├ ○ /security-access/access-control/attendance 27.8 kB 165 kB
├ ○ /security-access/access-control/configuration 8.89 kB 156 kB
├ ○ /security-access/access-control/device 4.31 kB 149 kB
├ ○ /security-access/access-control/user 7.65 kB 164 kB
├ ○ /security-access/surveillance-cctv 10.9 kB 303 kB
├ ○ /system-config/menu-display 7.07 kB 170 kB
├ ○ /system-config/power-analyzer 48.1 kB 242 kB
├ ○ /system-config/system-backup 2.82 kB 109 kB
├ ○ /system-config/user-management 6.5 kB 184 kB
├ ○ /test 4.51 kB 126 kB
├ λ /view-dashboard/[id] 5.72 kB 807 kB
├ ○ /voice-recognition/relay-control 6.55 kB 170 kB
├ ○ /voice-recognition/relay-stt 4.41 kB 112 kB
└ ○ /whatsapp-test 5.64 kB 127 kB

- First Load JS shared by all 88.6 kB
  ├ chunks/2472-429c6eb2f9444de1.js 32.5 kB
  ├ chunks/fd9d1056-ac45af574cff5e5e.js 53.3 kB
  ├ chunks/main-app-f4831857a7fd7807.js 237 B
  └ chunks/webpack-a8eef2d616069ced.js 2.56 kB

ƒ Middleware 39 kB

○ (Static) prerendered as static HTML
λ (Dynamic) server-rendered on demand using Node.js

[SUCCESS] Application built successfully
[2025-09-11 10:31:04] Creating PM2 ecosystem configuration...
[SUCCESS] PM2 configuration created
[2025-09-11 10:31:04] === Starting Application with PM2 ===
[2025-09-11 10:31:05] Starting iot-dashboard on port 3001...
[PM2][WARN] Applications iot-dashboard not running, starting...
[PM2] App [iot-dashboard] launched (1 instances)
┌────┬────────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name │ namespace │ version │ mode │ pid │ uptime │ ↺ │ status │ cpu │ mem │ user │ watching │
├────┼────────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 1 │ Frontend/ │ default │ N/A │ fork │ 0 │ 0 │ 15 │ errored │ 0% │ 0b │ root │ disabled │
│ 0 │ camera │ default │ 2.0.0 │ fork │ 1213 │ 7D │ 0 │ online │ 0% │ 136.5mb │ root │ disabled │
│ 8 │ iot-dashboard │ default │ N/A │ cluster │ 1441843 │ 0s │ 0 │ online │ 0% │ 43.4mb │ root │ disabled │
│ 7 │ newcontainment-frontend │ default │ N/A │ fork │ 1431374 │ 47m │ 0 │ online │ 0% │ 65.1mb │ root │ disabled │
└────┴────────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[PM2] Saving current process list...
[PM2] Successfully saved in /root/.pm2/dump.pm2
[2025-09-11 10:31:05] Waiting for application to start...
[SUCCESS] Application is running with PM2
[SUCCESS] PM2 deployment completed
[2025-09-11 10:31:16] === Setting Up Nginx Reverse Proxy ===
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
[SUCCESS] Nginx configuration is valid
[SUCCESS] Nginx reloaded successfully
[2025-09-11 10:31:16] === Setting Up Firewall ===
Firewall is active and enabled on system startup
Skipping adding existing rule
Skipping adding existing rule (v6)
Rule added
Rule added (v6)
Rule added
Rule added (v6)
Rule added
Rule added (v6)
Rule added
Rule added (v6)
[SUCCESS] Firewall configured successfully
[2025-09-11 10:31:17] === Setting Up Backup Service ===
[SUCCESS] Backup service configured
[2025-09-11 10:31:17] === Verifying Deployment ===
[2025-09-11 10:31:17] Testing database connection...
[SUCCESS] Database connection test passed
[2025-09-11 10:31:17] Testing application health...
[SUCCESS] Application health test passed
[2025-09-11 10:31:18] Testing Nginx proxy...
[SUCCESS] Nginx proxy test passed
[2025-09-11 10:31:18] Testing MQTT broker...
[SUCCESS] MQTT broker test passed
[SUCCESS] All critical tests passed
[SUCCESS] Deployment verification passed
[2025-09-11 10:31:18] === Deployment Status ===

[2025-09-11 10:31:18] Application Status (PM2):
┌────┬────────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name │ namespace │ version │ mode │ pid │ uptime │ ↺ │ status │ cpu │ mem │ user │ watching │
├────┼────────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 1 │ Frontend/ │ default │ N/A │ fork │ 0 │ 0 │ 15 │ errored │ 0% │ 0b │ root │ disabled │
│ 0 │ camera │ default │ 2.0.0 │ fork │ 1213 │ 7D │ 0 │ online │ 0% │ 126.9mb │ root │ disabled │
│ 8 │ iot-dashboard │ default │ N/A │ cluster │ 1441843 │ 12s │ 0 │ online │ 0% │ 63.6mb │ root │ disabled │
│ 7 │ newcontainment-frontend │ default │ N/A │ fork │ 1431374 │ 47m │ 0 │ online │ 0% │ 65.1mb │ root │ disabled │
└────┴────────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘

[2025-09-11 10:31:18] System Services Status:
PostgreSQL: active
Nginx: active
Mosquitto: active

[2025-09-11 10:31:18] Application URLs:
Frontend (Nginx): http://localhost:80
Frontend (Direct): http://localhost:3001
Server IP: http://192.168.0.138:80

[2025-09-11 10:31:18] Database Information:
Database file: /home/containment/newmodbitui/prisma/iot_dashboard.db (336K)
PostgreSQL Database: iot_dashboard
Database User: root

[2025-09-11 10:31:18] MQTT Broker:
URL: mqtt://localhost:1883
Test: mosquitto_pub -h localhost -t test/topic -m 'Hello World'

[2025-09-11 10:31:18] Default Login Credentials:
Email: admin@admin.com
Password: admin123

[2025-09-11 10:31:18] Useful Commands:
View app logs: pm2 logs iot-dashboard
Restart app: pm2 restart iot-dashboard
Monitor PM2: pm2 monit
View system logs: sudo journalctl -u postgresql nginx mosquitto
Database backup: sudo /usr/local/bin/backup-iot-dashboard.sh

[SUCCESS] IoT Dashboard deployment completed successfully!
[WARNING] IMPORTANT: Change default login credentials after first login!
containment@containment:~/newmodbitui$
