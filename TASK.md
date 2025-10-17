 GET /api/maintenance 200 in 1370ms
 GET /api/menu 200 in 1388ms
Auth from cookie: {
  userId: 'cmgsx5s8d0004gvt6i5hyf5wz',
  role: 'ADMIN',
  email: 'admin@gmail.com',
  iat: 1760608871,
  exp: 1760695271
}
 GET /api/users 200 in 56ms
 GET /api/maintenance 200 in 64ms
 GET /api/devices/for-selection 200 in 67ms
[Maintenance POST] Auth found: admin@gmail.com
[Maintenance POST] Starting POST request
[Maintenance POST] Received body: {
  targetType: 'Device',
  status: 'Scheduled',
  assignTo: 'cmgsx5s8n0006gvt60mixtwjl',
  targetId: 'cmgsx5t3d00a9gvt6n54a91r2',
  name: 'asdas',
  description: 'asda',
  startTask: '2025-10-17T14:25',
  endTask: '2025-10-17T14:26'
}
[Maintenance POST] Parsed fields: {
  name: 'asdas',
  assignTo: 'cmgsx5s8n0006gvt60mixtwjl',
  targetType: 'Device',
  targetId: 'cmgsx5t3d00a9gvt6n54a91r2',
  status: 'Scheduled'
}
 POST /api/maintenance 400 in 27ms

page.tsx:389  POST http://localhost:3000/api/maintenance 400 (Bad Request) 

analisa kenapa failed untuk create data maintenance di halaman 

http://localhost:3000/maintenance/schedule-management

tolong cek dan perbaiki