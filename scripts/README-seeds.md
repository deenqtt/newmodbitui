# Database Seeding Scripts

This directory contains database seeding scripts for the IoT Dashboard application. Seeds are used to populate the database with initial/demo data for development and testing purposes.

## Available Scripts

### Individual Seed Scripts

#### `seed-tenants.js`
Seeds tenant data for multi-tenant functionality.
- **Data**: 7 sample tenants representing different companies/regions
- **Fields**: name, company, email, phone, address, status, notes

```bash
node scripts/seed-tenants.js
```

#### `seed-node-locations.js`
Seeds node tenant locations with geographical coordinates and MQTT topics.
- **Data**: 9 sample locations across Indonesia with real coordinates
- **Features**: Server locations, regional hubs, industrial zones
- **Tenant Assignment**: Some locations assigned to tenants, others standalone

```bash
node scripts/seed-node-locations.js
```

*Note: Requires tenants to be seeded first for proper tenant assignment.*

### Combined Seed Scripts

#### `seed-tenants-and-locations.js`
Comprehensive seeding script that handles both tenants and node locations in proper order.
- **Sequential Processing**: Seeds tenants first, then locations
- **Dependencies**: Automatically handles tenant-location relationships
- **Reporting**: Detailed statistics on seeded data

```bash
node scripts/seed-tenants-and-locations.js
```

*Recommended for initial setup or complete reseeding.*

## Sample Data Overview

### Tenants (7 total)
- **Active Tenants**: 6 (Jakarta, Surabaya, Bandung, Bali, Makassar, Server)
- **Inactive Tenants**: 1 (Medan)
- **Regions Covered**: Jakarta, Surabaya, Bandung, Medan, Bali, Makassar

### Node Locations (9 total)
- **Server Locations**: 1 (Main Jakarta data center)
- **Regional Hubs**: 4 (Bandung, Bali, Medan, Makassar - tenant assigned)
- **Standalone Nodes**: 4 (Batam, Papua, Pontianak, Balikpapan)
- **Active Status**: 7 active, 2 inactive (Batam, Balikpapan)

## Usage in Development

### Fresh Database Setup
```bash
# Full reseeding (recommended)
node scripts/seed-tenants-and-locations.js

# Or step-by-step
node scripts/seed-tenants.js
node scripts/seed-node-locations.js
```

### Update Existing Data
```bash
# Run combined script - uses upsert operations to update existing records
node scripts/seed-tenants-and-locations.js
```

### Selective Seeding
Use individual scripts based on what you need to test:
- Only tenants: `node scripts/seed-tenants.js`
- Only locations: `node scripts/seed-node-locations.js`

## Integration with Reset Script

The main `reset-db.sh` script automatically calls these seeds during full database reset. The seeding happens in this order:
1. `seed-tenants.js`
2. `seed-node-locations.js`
3. Other seed scripts (users, menu, devices, etc.)

## Data Relationships

### Tenant ↔ Node Location
- **One-to-Many**: One tenant can have multiple node locations
- **Optional Assignment**: Locations can exist without tenant assignment
- **Unique Names**: Each location has a unique name across all tenants

### Coordinate System
- **Longitude/Latitude**: Real Indonesian geographical coordinates
- **Region Coverage**: Major cities and industrial areas across Indonesia
- **Accuracy**: Precise coordinates for mapping/testing purposes

## Environment Variables

No special environment variables required. Scripts use the default Prisma configuration.

## Error Handling

- **Duplicate Prevention**: Uses `upsert` operations to avoid duplicates
- **Dependency Checks**: Validates prerequisites before seeding
- **Detailed Logging**: Comprehensive success/error reporting
- **Rollback Support**: Manual cleanup or re-run to fix issues

## Troubleshooting

### "No tenants found" Error
Run tenant seeding first: `node scripts/seed-tenants.js`

### Permission Errors
Ensure proper database access and file permissions in the project directory.

### Port Already in Use
Stop any running development servers before seeding if needed.

## Adding New Seed Data

To extend existing seeds or create new ones:

1. **Copy existing pattern** from similar scripts
2. **Use upsert operations** to prevent duplicates
3. **Include proper error handling** and logging
4. **Add validation** for required fields
5. **Document the data** in this README
6. **Test independently** before integration

## Related Scripts

- `reset-db.sh` - Full database reset and reseeding
- `seed-init.js` - Master seeding script used by reset-db.sh
- Other individual seed scripts in this directory
