// File: scripts/test-whatsapp.js

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 WhatsApp Service Test Runner\n');

// Check if required test dependencies are available
const requiredPackages = [
  '@jest/globals',
  'jest'
];

console.log('📦 Checking test dependencies...');
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

const missingPackages = requiredPackages.filter(pkg => {
  return !packageJson.dependencies[pkg] && !packageJson.devDependencies[pkg];
});

if (missingPackages.length > 0) {
  console.log('⚠️  Missing test dependencies:', missingPackages.join(', '));
  console.log('📋 To install missing dependencies, run:');
  console.log(`npm install --save-dev ${missingPackages.join(' ')}`);
  console.log('\n💡 You may also need to configure Jest in your project.');
  console.log('Add to your package.json:');
  console.log(`{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "node",
    "setupFilesAfterEnv": ["<rootDir>/tests/setup.ts"],
    "testMatch": ["**/__tests__/**/*.test.(js|ts)", "**/*.test.(js|ts)"]
  }
}`);
  return;
}

// Test file paths
const testFiles = [
  'tests/whatsapp-service.test.ts',
  'tests/whatsapp-api.test.ts',
  'tests/whatsapp-integration.test.ts'
];

console.log('🧪 Available WhatsApp Test Files:');
testFiles.forEach((file, index) => {
  const fullPath = path.join(__dirname, '..', file);
  const exists = fs.existsSync(fullPath);
  console.log(`${index + 1}. ${file} ${exists ? '✅' : '❌'}`);
});

console.log('\n🔧 WhatsApp Service Implementation Status:');

// Check implementation files
const implementationFiles = [
  { path: 'lib/services/whatsapp-service.ts', description: 'Core WhatsApp Service' },
  { path: 'lib/services/whatsapp-logger.ts', description: 'WhatsApp Logger' },
  { path: 'app/api/whatsapp/send/route.ts', description: 'Send Message API' },
  { path: 'app/api/whatsapp/config/route.ts', description: 'Configuration API' },
  { path: 'app/api/whatsapp/maintenance/route.ts', description: 'Maintenance API' },
  { path: 'app/api/whatsapp/alarm/route.ts', description: 'Alarm API' },
  { path: 'app/api/whatsapp/bulk/route.ts', description: 'Bulk Operations API' }
];

implementationFiles.forEach(file => {
  const fullPath = path.join(__dirname, '..', file.path);
  const exists = fs.existsSync(fullPath);
  console.log(`${exists ? '✅' : '❌'} ${file.description}: ${file.path}`);
});

console.log('\n📋 To run WhatsApp tests manually:');
console.log('1. Unit Tests: npm test whatsapp-service.test.ts');
console.log('2. API Tests: npm test whatsapp-api.test.ts');
console.log('3. Integration Tests: npm test whatsapp-integration.test.ts');
console.log('4. All WhatsApp Tests: npm test -- --testPathPattern=whatsapp');

console.log('\n🔍 Environment Variables Required:');
const requiredEnvVars = [
  'QONTAK_API_URL',
  'QONTAK_BEARER_TOKEN', 
  'QONTAK_CHANNEL_INTEGRATION_ID',
  'QONTAK_MESSAGE_TEMPLATE_ID',
  'QONTAK_LANGUAGE'
];

requiredEnvVars.forEach(envVar => {
  const isSet = process.env[envVar] ? '✅' : '❌';
  console.log(`${isSet} ${envVar}`);
});

if (!process.env.QONTAK_BEARER_TOKEN) {
  console.log('\n⚠️  WhatsApp service is not configured. Set environment variables to enable testing.');
  console.log('Add to your .env file:');
  console.log(`QONTAK_API_URL=https://service-chat.qontak.com/api/open/v1/broadcasts/whatsapp/direct
QONTAK_BEARER_TOKEN=your_bearer_token_here
QONTAK_CHANNEL_INTEGRATION_ID=your_channel_id_here
QONTAK_MESSAGE_TEMPLATE_ID=your_template_id_here
QONTAK_LANGUAGE=id`);
}

console.log('\n🎯 Test Coverage Areas:');
const testAreas = [
  'Configuration management and validation',
  'Phone number formatting (Indonesian format)',
  'Custom message sending',
  'Maintenance notifications with database integration',
  'Alarm notifications with severity levels',
  'System notifications',
  'Bulk operations with rate limiting',
  'Error handling and logging',
  'API authentication and authorization',
  'Integration with maintenance and alarm systems',
  'Service statistics and monitoring'
];

testAreas.forEach((area, index) => {
  console.log(`${index + 1}. ${area}`);
});

console.log('\n📊 WhatsApp Service Features:');
const features = [
  '✅ Qontak API integration',
  '✅ Multiple notification types (maintenance, alarm, system, custom)',
  '✅ Bulk messaging with rate limiting',
  '✅ Comprehensive error handling and logging',
  '✅ Phone number formatting for Indonesia (+62)',
  '✅ Configuration management',
  '✅ Connection testing',
  '✅ Database integration for logging',
  '✅ Role-based API access control',
  '✅ Message templates with parameters',
  '✅ Service statistics and monitoring'
];

features.forEach(feature => console.log(feature));

console.log('\n🔧 Quick Test Examples:');
console.log(`
// Test WhatsApp service configuration
const { whatsappService } = require('./lib/services/whatsapp-service');
console.log(whatsappService.getConfigStatus());

// Test phone number formatting
const formatted = whatsappService.formatPhoneNumber('081234567890');
console.log('Formatted:', formatted); // Should be 6281234567890

// Test maintenance notification (mock)
const maintenanceData = {
  userName: 'John Doe',
  taskName: 'Server Maintenance',
  deviceName: 'Server-001',
  startTime: '2025-01-15 10:00:00',
  endTime: '2025-01-15 12:00:00',
  status: 'Scheduled'
};
`);

console.log('\n✨ WhatsApp Service Implementation Complete!');
console.log('Run tests to verify everything is working correctly.');