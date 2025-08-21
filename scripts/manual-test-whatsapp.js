// File: scripts/manual-test-whatsapp.js

const { WhatsAppService } = require('../lib/services/whatsapp-service');

console.log('🧪 Manual WhatsApp Service Test\n');

// Test configuration
const testPhoneNumber = process.env.TEST_PHONE_NUMBER || '081234567890';
const testUserName = 'Test User';

async function runManualTests() {
  console.log('1️⃣ Testing Service Configuration...');
  
  try {
    const whatsappService = new WhatsAppService();
    const configStatus = whatsappService.getConfigStatus();
    
    console.log('Configuration Status:', JSON.stringify(configStatus, null, 2));
    
    if (!configStatus.configured) {
      console.log('❌ WhatsApp service is not properly configured.');
      console.log('Please set the following environment variables:');
      console.log('- QONTAK_API_URL');
      console.log('- QONTAK_BEARER_TOKEN');
      console.log('- QONTAK_CHANNEL_INTEGRATION_ID');
      console.log('- QONTAK_MESSAGE_TEMPLATE_ID');
      console.log('- QONTAK_LANGUAGE');
      return;
    }
    
    console.log('✅ Service is properly configured\n');
    
    // Test 2: Phone number formatting
    console.log('2️⃣ Testing Phone Number Formatting...');
    const testNumbers = ['081234567890', '6281234567890', '+6281234567890', '021234567890'];
    
    testNumbers.forEach(number => {
      const formatted = whatsappService.formatPhoneNumber(number);
      console.log(`${number} → ${formatted}`);
    });
    console.log('✅ Phone number formatting working\n');
    
    // Test 3: Service statistics
    console.log('3️⃣ Testing Service Statistics...');
    const stats = whatsappService.getServiceStats();
    console.log('Service Stats:', JSON.stringify(stats, null, 2));
    console.log('✅ Service statistics working\n');
    
    // Test 4: Message template generation
    console.log('4️⃣ Testing Message Templates...');
    
    const maintenanceData = {
      userName: 'John Technician',
      taskName: 'Server Maintenance',
      deviceName: 'Server-001',
      startTime: '2025-01-15 10:00:00',
      endTime: '2025-01-15 12:00:00',
      status: 'Scheduled',
      description: 'Monthly server check'
    };
    
    console.log('Maintenance Message Template:');
    const maintenanceMessage = whatsappService.generateMaintenanceMessageText(maintenanceData);
    console.log(maintenanceMessage);
    console.log('✅ Message template generation working\n');
    
    // Test 5: Alarm message template
    console.log('5️⃣ Testing Alarm Message Templates...');
    
    const alarmData = {
      userName: 'Security Team',
      deviceName: 'Temperature Sensor 01',
      alarmType: 'High Temperature',
      severity: 'HIGH',
      message: 'Temperature exceeded 80°C threshold',
      timestamp: '2025-01-20 14:30:00',
      location: 'Server Room A'
    };
    
    console.log('Alarm Message Template:');
    const alarmMessage = whatsappService.generateAlarmMessageText(alarmData);
    console.log(alarmMessage);
    console.log('✅ Alarm message template working\n');
    
    // Test 6: Connection test (if configured)
    if (process.env.QONTAK_BEARER_TOKEN && process.env.TEST_PHONE_NUMBER) {
      console.log('6️⃣ Testing WhatsApp Connection...');
      console.log(`Sending test message to: ${testPhoneNumber}`);
      console.log('⚠️  This will send a real WhatsApp message!');
      
      // Uncomment the line below to actually send a test message
      // const testResult = await whatsappService.testConnection(testPhoneNumber, 'manual-test');
      // console.log('Test Result:', testResult);
      
      console.log('📝 Connection test skipped (uncomment code to run)\n');
    } else {
      console.log('6️⃣ Connection test skipped (missing TEST_PHONE_NUMBER or QONTAK_BEARER_TOKEN)\n');
    }
    
    console.log('✅ All manual tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Test helper functions
console.log('🔧 WhatsApp Service Test Helpers Available:');
console.log('- testConfiguration(): Test service configuration');
console.log('- testPhoneFormatting(): Test phone number formatting');
console.log('- testMessageTemplates(): Test message template generation');
console.log('- testServiceStats(): Test service statistics');

function testConfiguration() {
  const whatsappService = new WhatsAppService();
  return whatsappService.getConfigStatus();
}

function testPhoneFormatting() {
  const whatsappService = new WhatsAppService();
  const testNumbers = ['081234567890', '6281234567890', '+6281234567890'];
  return testNumbers.map(number => ({
    original: number,
    formatted: whatsappService.formatPhoneNumber(number)
  }));
}

function testMessageTemplates() {
  const whatsappService = new WhatsAppService();
  
  const maintenanceData = {
    userName: 'Test User',
    taskName: 'Test Maintenance',
    deviceName: 'Test Device',
    startTime: '2025-01-15 10:00:00',
    endTime: '2025-01-15 12:00:00',
    status: 'Scheduled'
  };
  
  const alarmData = {
    userName: 'Test User',
    deviceName: 'Test Device',
    alarmType: 'Test Alarm',
    severity: 'HIGH',
    message: 'Test alarm message',
    timestamp: '2025-01-20 14:30:00'
  };
  
  return {
    maintenance: whatsappService.generateMaintenanceMessageText(maintenanceData),
    alarm: whatsappService.generateAlarmMessageText(alarmData)
  };
}

function testServiceStats() {
  const whatsappService = new WhatsAppService();
  return whatsappService.getServiceStats();
}

// Make functions available globally for manual testing
global.testConfiguration = testConfiguration;
global.testPhoneFormatting = testPhoneFormatting;
global.testMessageTemplates = testMessageTemplates;
global.testServiceStats = testServiceStats;

console.log('\n🎯 To run specific tests in Node.js REPL:');
console.log('node -e "require(\'./scripts/manual-test-whatsapp.js\'); console.log(testConfiguration());"');
console.log('\n🚀 Running all manual tests...\n');

runManualTests().catch(console.error);