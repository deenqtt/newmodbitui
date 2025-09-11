# Quick Start Guide - PostgreSQL dengan Root User

## Setup Cepat untuk Development

### 1. Install PostgreSQL
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
```

### 2. Setup Database dengan Root User (No Password)
```bash
# Login sebagai postgres
sudo -u postgres psql

# Buat database dan user root
CREATE DATABASE iot_dashboard;
CREATE USER root;
ALTER USER root WITH SUPERUSER;
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO root;
\q

# Edit authentication untuk root user (tanpa password)
sudo nano /etc/postgresql/*/main/pg_hba.conf

# Tambahkan baris ini di bagian atas (sebelum baris lain):
local   iot_dashboard   root                            trust
host    iot_dashboard   root    127.0.0.1/32            trust

# Restart PostgreSQL
sudo systemctl restart postgresql

# Test koneksi
psql -h localhost -U root -d iot_dashboard
```

### 3. Install Node.js dan Setup Aplikasi
```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone dan setup aplikasi
git clone <repository-url> iot-dashboard
cd iot-dashboard

# Copy environment file
cp .env.local .env

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Jalankan migrasi database
npx prisma migrate dev --name init

# Seed initial data
npm run db:seed

# Development mode
npm run dev
```

### 4. Environment Configuration (.env.local)
```env
DATABASE_URL="postgresql://root:@localhost:5432/iot_dashboard"
JWT_SECRET="dev-secret-key"
NODE_ENV="development"
NEXT_RUNTIME="nodejs"
ENABLE_CLOUD_SYNC="false"
MQTT_BROKER_URL="mqtt://localhost:1883"
PORT=3000
HOST="localhost"
```

### 5. Akses Aplikasi
- **URL**: http://localhost:3000
- **Default Login**: admin@admin.com / admin123

## Troubleshooting Cepat

### Jika ada error koneksi database:
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test koneksi manual
psql -h localhost -U root -d iot_dashboard

# Jika gagal, cek pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
# Pastikan ada: local iot_dashboard root trust

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### Jika ada error Prisma:
```bash
# Reset Prisma
npx prisma generate
npx prisma db push
```

### Reset Database (jika diperlukan):
```bash
# Drop dan buat ulang database
sudo -u postgres psql
DROP DATABASE iot_dashboard;
CREATE DATABASE iot_dashboard;
GRANT ALL PRIVILEGES ON DATABASE iot_dashboard TO root;
\q

# Migrate ulang
npx prisma migrate dev --name init
npm run db:seed
```

## Commands Berguna

```bash
# Development
npm run dev          # Start development server
npm run build        # Build untuk production  
npm start            # Start production server

# Database
npx prisma studio    # GUI database browser
npx prisma generate  # Generate Prisma client
npx prisma db push   # Push schema changes
npm run db:seed      # Seed initial data

# Production dengan PM2
npm install -g pm2
pm2 start npm --name "iot-dashboard" -- start
pm2 monit           # Monitor processes
pm2 logs            # View logs
```

Selamat! Aplikasi IoT Dashboard sudah siap digunakan dengan PostgreSQL dan user root tanpa password.