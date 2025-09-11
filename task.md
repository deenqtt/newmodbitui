buatkan halaman baru untuk subscribe topic ini menggunkana mqtt accessControl/attendance/live

dan ini data messagenya, untuk failed dan success
Via 1 = Fingerprint
{"status": "failed", "data": {"deviceId": "device_1", "via": 1, "uid": null, "name": "Unregistered", "message": "Access Denied - Front Door", "device_name": "Front Door", "access_action": "Access", "timestamp": "2025-09-10T08:36:12Z", "verify_code": 1, "punch_code": 201}, "event_type": "realtime_access"}

Via 3 = PIN
{"status": "success", "data": {"deviceId": "device_1", "via": 3, "uid": "1", "name": "Alfi Maul", "message": "Open Front Door", "device_name": "Front Door", "access_action": "Access", "timestamp": "2025-09-10T08:36:07Z", "verify_code": 3, "punch_code": 255}, "event_type": "realtime_access"}

Via 4 = Card
{"status": "success", "data": {"deviceId": "device_1", "via": 4, "uid": "2", "name": "Deden", "message": "Open Front Door", "device_name": "Front Door", "access_action": "Access", "timestamp": "2025-09-10T08:35:59Z", "verify_code": 4, "punch_code": 255}, "event_type": "realtime_access"}

buatkan sebuah file script shell untuk memudahkan instalasi di server local

1. lakukan pengecekan apakah instalasi untuk pakacge yang dibtuhkan untuk instalasi server sudah ada? seperti node, npm, pm2, nginx, prosgree dll
2. jika belum ada maka buatkan otomatis installasi untuk package yang diperlukan seperti node, npm, pm2, nginx, prosgree, primsa, database dll yang dibutuhkan
3. tapi jika sudah ada lanjutkan melakukan configurasi selutuh frontend npm install, lalu npm build
4. running pm2
5. lalu lakukan juga setup configurasi backend untuk supabase local menggunakan posgree
