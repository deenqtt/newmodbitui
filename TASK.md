gspe@gspe-TEKNO:~/newmodbitui$ 
gspe@gspe-TEKNO:~/newmodbitui$ sudo rm deploy.sh 
gspe@gspe-TEKNO:~/newmodbitui$ sudo nano deploy.sh
gspe@gspe-TEKNO:~/newmodbitui$ sudo chmod +x deploy.sh 
gspe@gspe-TEKNO:~/newmodbitui$ sudo ./deploy.sh 

╔════════════════════════════════════════════════════════════════╗
║           NEXUS DASHBOARD COMPLETE DEPLOYMENT                ║
║     Deploy + Seed IoT Devices + Start Services              ║
╚════════════════════════════════════════════════════════════════╝

Starting Complete Deployment Process... 🚀


╔════════════════════════════════════════════════════════════════╗
║                    NEXUS DASHBOARD DEPLOYMENT                   ║
║            Advanced IoT Monitoring & Control Platform         ║
╚════════════════════════════════════════════════════════════════╝

Welcome to the interactive deployment setup! 🚀


Select Deployment Profile:
1) Development   - For testing and development
2) Staging      - Pre-production environment
3) Production   - Live production environment

Enter choice (1-3) [3]: 3
[SUCCESS] Selected profile: production

Port Configuration:
Configure custom ports for the application.

Frontend Port (default: 3001): 3500
Backend/Next.js Port (default: 3002): 3501
[SUCCESS] Frontend Port: 3500
[SUCCESS] Backend Port: 3501

MQTT Configuration:
Configure MQTT broker settings for IoT communication.

MQTT Broker Host/IP (default: localhost): 
MQTT Broker Port (default: 9000): 
MQTT Username (leave empty if none): 
[SUCCESS] MQTT Broker: localhost:9000
[SUCCESS] MQTT Authentication: Disabled

Security Configuration:
Generate secure secrets for JWT and webhooks.

[SUCCESS] JWT Secret: Generated (32 characters)
[SUCCESS] Webhook Secret: Generated (32 characters)

═══════════════════════════════════════════════════════════════════
                 DEPLOYMENT CONFIGURATION SUMMARY
═══════════════════════════════════════════════════════════════════

Environment: production (production)
Frontend Port: 3500
Backend Port: 3501
MQTT Broker: localhost:9000
MQTT Auth: Disabled
JWT Secret: bxNXGsAT...
Webhook Secret: ERUWVuvY...

Continue with this configuration? (y/N): y
[2025-10-16 10:19:58] === Starting production Deployment Process ===
[2025-10-16 10:19:58] Project Root: /home/gspe/newmodbitui
[2025-10-16 10:19:58] Environment: production
[2025-10-16 10:19:58] Frontend Port: 3500
[2025-10-16 10:19:58] Backend Port: 3501
[2025-10-16 10:19:58] === Checking Dependencies ===
Hit:1 https://deb.nodesource.com/node_18.x nodistro InRelease
Hit:2 https://download.docker.com/linux/ubuntu noble InRelease                                                                                                                 
Hit:3 https://ppa.launchpadcontent.net/deadsnakes/ppa/ubuntu noble InRelease                                                                                                   
Hit:4 http://archive.ubuntu.com/ubuntu noble InRelease                                    
Hit:5 https://ppa.launchpadcontent.net/mozillateam/ppa/ubuntu noble InRelease             
Hit:6 http://archive.ubuntu.com/ubuntu noble-updates InRelease                            
Hit:7 http://security.ubuntu.com/ubuntu noble-security InRelease    
Hit:8 http://archive.ubuntu.com/ubuntu noble-backports InRelease    
Hit:9 https://developer.download.nvidia.com/compute/cuda/repos/ubuntu2204/x86_64  InRelease
Reading package lists... Done
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
curl is already the newest version (8.5.0-2ubuntu10.6).
wget is already the newest version (1.21.4-1ubuntu4.1).
gnupg2 is already the newest version (2.4.4-2ubuntu17.3).
software-properties-common is already the newest version (0.99.49.3).
apt-transport-https is already the newest version (2.8.3).
ca-certificates is already the newest version (20240203).
The following package was automatically installed and is no longer required:
  python3-netifaces
Use 'sudo apt autoremove' to remove it.
0 upgraded, 0 newly installed, 0 to remove and 44 not upgraded.
[2025-10-16 10:20:00] Checking Node.js installation...
[SUCCESS] Node.js v18.20.8 and npm 10.8.2 are installed
[2025-10-16 10:20:00] Checking PM2 installation...
[SUCCESS] PM2 v6.0.13 is installed
[2025-10-16 10:20:01] Checking Nginx installation...
[SUCCESS] Nginx v1.24.0 is installed
[SUCCESS] All dependencies are installed
[2025-10-16 10:20:01] === Generating Custom Environment Configuration ===
[SUCCESS] Custom environment file created: .env
[2025-10-16 10:20:01] === Installing Application Dependencies ===
[2025-10-16 10:20:01] Installing npm dependencies...

up to date, audited 898 packages in 1s

186 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
[SUCCESS] Application dependencies installed
[2025-10-16 10:20:02] === Building Application ===
[2025-10-16 10:20:02] Cleaned previous build
[2025-10-16 10:20:02] Building Next.js application...

> newmodbitui@0.1.0 build
> next build

  ▲ Next.js 14.2.32
  - Environments: .env

   Creating an optimized production build ...
 ✓ Compiled successfully
   Skipping validation of types
   Skipping linting
 ✓ Collecting page data    
   Generating static pages (28/122)  [=   ]Error fetching menu: B [Error]: Dynamic server usage: Route /api/menu couldn't be rendered statically because it used `request.headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error
    at V (/home/gspe/newmodbitui/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:21778)
    at Object.get (/home/gspe/newmodbitui/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:29465)
    at a (/home/gspe/newmodbitui/.next/server/app/api/bill-logs/delete-all/route.js:1:1748)
    at d (/home/gspe/newmodbitui/.next/server/app/api/menu/route.js:1:629)
    at /home/gspe/newmodbitui/node_modules/next/dist/compiled/next-server/app-route.runtime.prod.js:6:38417
    at /home/gspe/newmodbitui/node_modules/next/dist/server/lib/trace/tracer.js:140:36
    at NoopContextManager.with (/home/gspe/newmodbitui/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:7062)
    at ContextAPI.with (/home/gspe/newmodbitui/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:518)
    at NoopTracer.startActiveSpan (/home/gspe/newmodbitui/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:18093)
    at ProxyTracer.startActiveSpan (/home/gspe/newmodbitui/node_modules/next/dist/compiled/@opentelemetry/api/index.js:1:18854) {
  description: "Route /api/menu couldn't be rendered statically because it used `request.headers`. See more info here: https://nextjs.org/docs/messages/dynamic-server-error",
  digest: 'DYNAMIC_SERVER_USAGE'
}
 ✓ Generating static pages (122/122)
 ✓ Collecting build traces    
 ✓ Finalizing page optimization    

Route (app)                                                                  Size     First Load JS
┌ ○ /                                                                        5.09 kB         121 kB
├ ○ /_not-found                                                              143 B            88 kB
├ ○ /alarms/alarm-log-reports                                                3.22 kB         128 kB
├ ○ /alarms/alarm-management                                                 10.2 kB         166 kB
├ ○ /analytics/devices-log-report                                            4.87 kB         156 kB
├ ƒ /api/alarm-log                                                           0 B                0 B
├ ƒ /api/alarms                                                              0 B                0 B
├ ƒ /api/alarms/[id]                                                         0 B                0 B
├ ○ /api/alarms/summary                                                      0 B                0 B
├ ƒ /api/auth/login                                                          0 B                0 B
├ ƒ /api/auth/logout                                                         0 B                0 B
├ ƒ /api/auth/me                                                             0 B                0 B
├ ƒ /api/auth/register                                                       0 B                0 B
├ ƒ /api/auth/setup-admin                                                    0 B                0 B
├ ƒ /api/bill-configs                                                        0 B                0 B
├ ƒ /api/bill-configs/[id]                                                   0 B                0 B
├ ƒ /api/bill-logs                                                           0 B                0 B
├ ƒ /api/bill-logs/delete-all                                                0 B                0 B
├ ƒ /api/bill-logs/log-once                                                  0 B                0 B
├ ƒ /api/cctv                                                                0 B                0 B
├ ƒ /api/cctv/[id]                                                           0 B                0 B
├ ƒ /api/cctv/[id]/monitors                                                  0 B                0 B
├ ƒ /api/cctv/[id]/snapshot                                                  0 B                0 B
├ ƒ /api/cctv/[id]/stream                                                    0 B                0 B
├ ƒ /api/cctv/[id]/stream-url                                                0 B                0 B
├ ƒ /api/cctv/[id]/videos                                                    0 B                0 B
├ ƒ /api/cron/bill-logger                                                    0 B                0 B
├ ○ /api/cron/log-data                                                       0 B                0 B
├ ƒ /api/dashboards                                                          0 B                0 B
├ ƒ /api/dashboards/[id]                                                     0 B                0 B
├ ƒ /api/dashboards/active                                                   0 B                0 B
├ ƒ /api/devices-internal                                                    0 B                0 B
├ ƒ /api/devices-internal/[id]                                               0 B                0 B
├ ƒ /api/devices-log-report                                                  0 B                0 B
├ ƒ /api/devices/access-controllers                                          0 B                0 B
├ ƒ /api/devices/access-controllers/[id]                                     0 B                0 B
├ ƒ /api/devices/access-controllers/[id]/action                              0 B                0 B
├ ƒ /api/devices/access-controllers/[id]/logs                                0 B                0 B
├ ƒ /api/devices/access-controllers/[id]/remote-open                         0 B                0 B
├ ƒ /api/devices/access-controllers/[id]/sync-logs                           0 B                0 B
├ ƒ /api/devices/access-controllers/[id]/users                               0 B                0 B
├ ƒ /api/devices/external                                                    0 B                0 B
├ ƒ /api/devices/external/[id]                                               0 B                0 B
├ ƒ /api/devices/for-selection                                               0 B                0 B
├ ƒ /api/devices/thermal                                                     0 B                0 B
├ ƒ /api/ec25                                                                0 B                0 B
├ ƒ /api/ec25/commands                                                       0 B                0 B
├ ƒ /api/ec25/config                                                         0 B                0 B
├ ƒ /api/energy-targets                                                      0 B                0 B
├ ○ /api/health                                                              0 B                0 B
├ ƒ /api/historical/bill-chart-data                                          0 B                0 B
├ ƒ /api/historical/chart-data                                               0 B                0 B
├ ƒ /api/historical/energy-target-data                                       0 B                0 B
├ ƒ /api/historical/usage                                                    0 B                0 B
├ ○ /api/ip-address                                                          0 B                0 B
├ ƒ /api/layout2d                                                            0 B                0 B
├ ƒ /api/layout2d/[id]                                                       0 B                0 B
├ ƒ /api/layout2d/[id]/datapoints                                            0 B                0 B
├ ƒ /api/layout2d/[id]/datapoints/[datapointId]                              0 B                0 B
├ ƒ /api/layout2d/[id]/flowindicators                                        0 B                0 B
├ ƒ /api/layout2d/[id]/flowindicators/[indicatorId]                          0 B                0 B
├ ƒ /api/layout2d/[id]/flowindicators/[indicatorId]/copy                     0 B                0 B
├ ƒ /api/layout2d/active                                                     0 B                0 B
├ ƒ /api/logging-configs                                                     0 B                0 B
├ ƒ /api/logging-configs/[id]                                                0 B                0 B
├ ƒ /api/logging-configs/batch-upload                                        0 B                0 B
├ ƒ /api/lorawan/applications                                                0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]                                0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices                        0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices/[devEui]               0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices/[devEui]/activation    0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices/[devEui]/events        0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices/[devEui]/flush-nonces  0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices/[devEui]/frames        0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices/[devEui]/keys          0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices/[devEui]/queue         0 B                0 B
├ ƒ /api/lorawan/applications/[applicationId]/devices/[devEui]/reactivate    0 B                0 B
├ ƒ /api/lorawan/device-profiles                                             0 B                0 B
├ ƒ /api/lorawan/devices                                                     0 B                0 B
├ ƒ /api/lorawan/devices/[id]/history                                        0 B                0 B
├ ƒ /api/lorawan/devices/[id]/latest                                         0 B                0 B
├ ○ /api/lorawan/gateways                                                    0 B                0 B
├ ƒ /api/lorawan/gateways/[id]                                               0 B                0 B
├ ƒ /api/lorawan/gateways/[id]/stats                                         0 B                0 B
├ ƒ /api/maintenance                                                         0 B                0 B
├ ƒ /api/menu                                                                0 B                0 B
├ ƒ /api/menu-groups                                                         0 B                0 B
├ ƒ /api/menu-groups/[id]                                                    0 B                0 B
├ ƒ /api/menu-items                                                          0 B                0 B
├ ƒ /api/menu-items/[id]                                                     0 B                0 B
├ ƒ /api/network/configure                                                   0 B                0 B
├ ƒ /api/notifications                                                       0 B                0 B
├ ƒ /api/power-analyzer                                                      0 B                0 B
├ ƒ /api/power-analyzer/[id]                                                 0 B                0 B
├ ƒ /api/pue-configs                                                         0 B                0 B
├ ƒ /api/pue-configs/[id]                                                    0 B                0 B
├ ƒ /api/racks                                                               0 B                0 B
├ ƒ /api/racks/[id]                                                          0 B                0 B
├ ƒ /api/role-menu-permissions                                               0 B                0 B
├ ƒ /api/role-menu-permissions/[id]                                          0 B                0 B
├ ƒ /api/role-menu-permissions/batch                                         0 B                0 B
├ ƒ /api/roles                                                               0 B                0 B
├ ƒ /api/roles/[id]                                                          0 B                0 B
├ ƒ /api/system-backup/backup                                                0 B                0 B
├ ƒ /api/system-backup/create                                                0 B                0 B
├ ƒ /api/system-backup/files                                                 0 B                0 B
├ ƒ /api/system-backup/monitor                                               0 B                0 B
├ ƒ /api/system-backup/restore                                               0 B                0 B
├ ƒ /api/topics/by-uniqid/[uniqId]                                           0 B                0 B
├ ƒ /api/users                                                               0 B                0 B
├ ƒ /api/users/[id]                                                          0 B                0 B
├ ƒ /api/whatsapp/alarm                                                      0 B                0 B
├ ƒ /api/whatsapp/bulk                                                       0 B                0 B
├ ƒ /api/whatsapp/config                                                     0 B                0 B
├ ƒ /api/whatsapp/maintenance                                                0 B                0 B
├ ƒ /api/whatsapp/send                                                       0 B                0 B
├ ƒ /api/whatsapp/test                                                       0 B                0 B
├ ƒ /api/zigbee/bridge                                                       0 B                0 B
├ ƒ /api/zigbee/coordinator                                                  0 B                0 B
├ ƒ /api/zigbee/devices                                                      0 B                0 B
├ ƒ /api/zigbee/devices/[deviceId]                                           0 B                0 B
├ ƒ /api/zigbee/devices/[deviceId]/command                                   0 B                0 B
├ ○ /api/zigbee/stats                                                        0 B                0 B
├ ƒ /api/zkteco/devices                                                      0 B                0 B
├ ƒ /api/zkteco/devices/[id]                                                 0 B                0 B
├ ƒ /api/zkteco/devices/[id]/users                                           0 B                0 B
├ ƒ /api/zkteco/devices/[id]/users/[uid]/command                             0 B                0 B
├ ○ /control/logic                                                           13.9 kB         161 kB
├ ○ /control/manual                                                          7.81 kB         122 kB
├ ○ /control/schedule                                                        8.9 kB          156 kB
├ ○ /control/unified                                                         16.4 kB         163 kB
├ ○ /control/value                                                           14.2 kB         169 kB
├ ○ /control/voice                                                           10.5 kB         252 kB
├ ƒ /dashboard/[id]                                                          69.8 kB           1 MB
├ ○ /devices/access-controllers                                              10.4 kB         133 kB
├ ƒ /devices/access-controllers/[id]/users                                   7.48 kB         116 kB
├ ○ /devices/devices-external                                                12.1 kB         150 kB
├ ○ /devices/devices-for-logging                                             11.2 kB         169 kB
├ ○ /devices/devices-internal                                                10.4 kB         144 kB
├ ○ /devices/zigbee                                                          14.8 kB         168 kB
├ ○ /info                                                                    10.8 kB         138 kB
├ ○ /layout2d                                                                3.55 kB         170 kB
├ ○ /lo-ra-wan/applications                                                  6.92 kB         145 kB
├ ƒ /lo-ra-wan/applications/[id]                                             7.95 kB         171 kB
├ ƒ /lo-ra-wan/applications/[id]/devices/[devEui]                            11.4 kB         179 kB
├ ○ /lo-ra-wan/device-list                                                   5.57 kB         138 kB
├ ƒ /lo-ra-wan/device-list/[id]/history                                      3.61 kB         121 kB
├ ○ /lo-ra-wan/device-profiles                                               9.48 kB         143 kB
├ ○ /lo-ra-wan/ec25-modem                                                    25.7 kB         238 kB
├ ○ /lo-ra-wan/gateways                                                      6.15 kB         133 kB
├ ƒ /lo-ra-wan/gateways/[id]/dashboard                                       6.26 kB         104 kB
├ ○ /login                                                                   11.4 kB         181 kB
├ ○ /maintenance/schedule-management                                         34.5 kB         201 kB
├ ○ /manage-dashboard                                                        5.15 kB         134 kB
├ ○ /manage-menu                                                             15.6 kB         366 kB
├ ○ /monitoring/layout-2d                                                    3.58 kB         179 kB
├ ○ /network/communication-setup                                             6.17 kB         158 kB
├ ○ /network/mqtt-broker                                                     7.01 kB         162 kB
├ ○ /network/register-snmp                                                   8.29 kB         164 kB
├ ○ /payload/discover                                                        10.9 kB         262 kB
├ ○ /payload/remapping                                                       32.3 kB         274 kB
├ ○ /payload/static                                                          14.3 kB         262 kB
├ ○ /racks                                                                   9.07 kB         126 kB
├ ƒ /racks/[id]                                                              8.12 kB         143 kB
├ ○ /register                                                                2.89 kB         129 kB
├ ○ /security-access/access-control                                          7.67 kB         143 kB
├ ○ /security-access/access-control/attendance                               23.9 kB         159 kB
├ ○ /security-access/access-control/configuration                            10.4 kB         153 kB
├ ○ /security-access/access-control/device                                   10.4 kB         146 kB
├ ○ /security-access/access-control/user                                     13.2 kB         165 kB
├ ○ /security-access/surveillance-cctv                                       10.7 kB         303 kB
├ ○ /snmp-data-get                                                           9.04 kB         256 kB
├ ○ /system-config/power-analyzer                                            49 kB           237 kB
├ ○ /system-config/system-backup                                             2.76 kB         109 kB
├ ○ /system-config/user-management                                           12.9 kB         172 kB
├ ○ /test                                                                    280 B          88.2 kB
├ ƒ /view-dashboard/[id]                                                     6.11 kB         910 kB
├ ○ /vpn                                                                     6.82 kB         246 kB
├ ○ /vpn/config                                                              17.4 kB         264 kB
└ ○ /whatsapp-test                                                           5.53 kB         123 kB
+ First Load JS shared by all                                                87.9 kB
  ├ chunks/2117-2e5474a7949e31c1.js                                          31.8 kB
  ├ chunks/fd9d1056-2cfa95adc0565b0e.js                                      53.6 kB
  └ other shared chunks (total)                                              2.51 kB


ƒ Middleware                                                                 32.5 kB

○  (Static)   prerendered as static content
ƒ  (Dynamic)  server-rendered on demand

[SUCCESS] Application built successfully
[2025-10-16 10:20:50] Creating PM2 ecosystem configuration...
[SUCCESS] PM2 configuration created for production environment
[2025-10-16 10:20:50] === Starting Application with PM2 ===
[2025-10-16 10:20:51] Starting nexus-dashboard on port 3501...
[PM2] Applying action restartProcessId on app [nexus-dashboard-production](ids: [ 0 ])
[PM2] [nexus-dashboard-production](0) ✓
┌────┬───────────────────────────────┬─────────────┬─────────┬─────────┬──────────┬────────┬──────┬───────────┬──────────┬──────────┬──────────┬──────────┐
│ id │ name                          │ namespace   │ version │ mode    │ pid      │ uptime │ ↺    │ status    │ cpu      │ mem      │ user     │ watching │
├────┼───────────────────────────────┼─────────────┼─────────┼─────────┼──────────┼────────┼──────┼───────────┼──────────┼──────────┼──────────┼──────────┤
│ 0  │ nexus-dashboard-production    │ default     │ N/A     │ cluster │ 498771   │ 0s     │ 1    │ online    │ 0%       │ 41.9mb   │ root     │ disabled │
└────┴───────────────────────────────┴─────────────┴─────────┴─────────┴──────────┴────────┴──────┴───────────┴──────────┴──────────┴──────────┴──────────┘
[PM2] Saving current process list...
[PM2] Successfully saved in /root/.pm2/dump.pm2
[2025-10-16 10:20:51] Waiting for application to start...
[SUCCESS] Application is running with PM2
[SUCCESS] PM2 deployment completed
[2025-10-16 10:21:01] === Setting Up Nginx Reverse Proxy ===
2025/10/16 10:21:01 [emerg] 498913#498913: invalid value "must-revalidate" in /etc/nginx/sites-enabled/nexus-dashboard:20
nginx: configuration file /etc/nginx/nginx.conf test failed
[ERROR] Nginx configuration test failed
[WARNING] Attempting to restore previous configuration...
2025/10/16 10:21:01 [emerg] 498916#498916: invalid value "must-revalidate" in /etc/nginx/sites-enabled/nexus-dashboard:20
gspe@gspe-TEKNO:~/newmodbitui$ 
