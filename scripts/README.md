# Database Seeding Scripts

This directory contains scripts for seeding the database with initial data.

## User Seeding

### Overview

The user seeding functionality provides default user accounts for initial application setup. It includes both manual and automatic seeding options.

### Default Users

The seeding process creates two default users:

| Role  | Email              | Password | Phone Number    |
|-------|-------------------|----------|-----------------|
| ADMIN | admin@modbit.com  | admin123 | +62123456789   |
| USER  | user@modbit.com   | user123  | +62987654321   |

### Manual Seeding

#### Using NPM Scripts

```bash
# Seed default users
npm run seed:users

# Alternative command
npm run db:seed
```

#### Direct Execution

```bash
# Run the script directly
node scripts/seed-users.js
```

### Automatic Seeding

The application automatically seeds default users during startup if the users table is empty. This is handled by the `UserSeederService` in `lib/services/user-seeder-service.ts`.

The automatic seeding:
- Runs during application initialization
- Only executes if no users exist in the database
- Prevents duplicate seeding attempts
- Logs the process for monitoring

### Safety Features

1. **Empty Table Check**: Seeding only occurs when the users table is completely empty
2. **Duplicate Prevention**: Won't create users if any users already exist
3. **Error Handling**: Graceful error handling with detailed logging
4. **Unique Constraints**: Database constraints prevent duplicate emails
5. **Concurrent Protection**: Prevents multiple seeding processes from running simultaneously

### Security Considerations

⚠️ **Important Security Notes:**

1. **Change Default Passwords**: Always change the default passwords immediately after first login
2. **Production Environment**: Consider removing or modifying default credentials for production
3. **Environment Variables**: Consider using environment variables for sensitive default data
4. **Password Hashing**: Passwords are securely hashed using bcrypt with 12 salt rounds

### Customization

To customize the default users, modify the `DEFAULT_USERS` array in:
- `scripts/seed-users.js` (for manual seeding)
- `lib/services/user-seeder-service.ts` (for automatic seeding)

```javascript
const DEFAULT_USERS = [
  {
    email: 'your-admin@example.com',
    password: 'secure-password',
    role: 'ADMIN',
    phoneNumber: '+1234567890'
  },
  // ... more users
];
```

### Troubleshooting

#### Common Issues

1. **Database Connection Error (P1001)**
   - Check your `DATABASE_URL` environment variable
   - Ensure the database server is running
   - Verify network connectivity

2. **Unique Constraint Violation (P2002)**
   - Users with the same email already exist
   - Clear the users table or use different email addresses

3. **Permission Errors**
   - Ensure the database user has CREATE, INSERT permissions
   - Check file permissions for the script

#### Logs

The seeding process provides detailed logging:
- Success/failure status
- User creation details
- Error messages with codes
- Security reminders

### Integration with Application

The seeding functionality is integrated into the application startup process through:

1. **Instrumentation**: `instrumentation.ts` - Triggers during Next.js server startup
2. **Service Initialization**: `lib/init-services.ts` - Coordinates all background services
3. **User Seeder Service**: `lib/services/user-seeder-service.ts` - Handles automatic seeding logic

### Testing

To test the seeding functionality:

```bash
# 1. Clear existing users (BE CAREFUL IN PRODUCTION!)
# Run this in your database console or admin tool
DELETE FROM "User";

# 2. Run the seeder
npm run seed:users

# 3. Verify users were created
# Check your database or use the application login
```

### Best Practices

1. **Backup First**: Always backup your database before running seeding scripts
2. **Test Environment**: Test seeding scripts in development/staging before production
3. **Monitor Logs**: Check application logs for seeding status during deployment
4. **Security Review**: Regularly review and update default credentials
5. **Documentation**: Keep this documentation updated when modifying seeding logic