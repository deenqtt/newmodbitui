sHalaman ini menganalisis dan mengubah dokumen tentang topik dan struktur pesan MQTT dari Zigbee2MQTT ke dalam Bahasa Indonesia. 🇮🇩

---

## Topik dan Struktur Pesan MQTT

Halaman ini menjelaskan topik-topik MQTT yang digunakan oleh Zigbee2MQTT. Perlu diingat bahwa topik dasar (secara _default_ `zigbee2mqtt`) dapat diubah di berkas **`configuration.yaml`** Zigbee2MQTT.

### zigbee2mqtt/bridge/state

Zigbee2MQTT memublikasikan status _bridge_ ke topik ini. Pesan yang mungkin adalah:

- **`"online"`**: Dipublikasikan saat _bridge_ berjalan (pada saat _startup_).
- **`"offline"`**: Dipublikasikan tepat sebelum _bridge_ berhenti.

---

### zigbee2mqtt/bridge/config

Zigbee2MQTT memublikasikan konfigurasinya ke topik ini, yang berisi `log_level` dan `permit_join`.

---

### zigbee2mqtt/bridge/log

Zigbee2MQTT akan mengeluarkan _log_ ke _endpoint_ ini. Pesan selalu dalam bentuk `{"type":"TYPE","message":"MESSAGE"}`. Tipe pesan yang mungkin adalah:

- **`"pairing"`**: Tercatat saat perangkat sedang terhubung ke jaringan.
- **`"device_connected"`**: Dikirim saat perangkat baru terhubung ke jaringan.
- **`"device_ban"`**: Dikirim saat perangkat dilarang dari jaringan.
- **`"device_ban_failed"`**: Dikirim saat permintaan untuk melarang perangkat gagal.
- **`"device_announced"`**: Dikirim saat perangkat mengumumkan dirinya di jaringan.
- **`"device_removed"`**: Dikirim saat perangkat dihapus dari jaringan.
- **`"device_removed_failed"`**: Dikirim saat permintaan untuk menghapus perangkat gagal.
- **`"device_force_removed"`**: Dikirim saat perangkat dihapus dari jaringan menggunakan mode paksa (_forced_).
- **`"device_force_removed_failed"`**: Dikirim saat permintaan untuk menghapus perangkat gagal menggunakan mode paksa.
- **`"device_banned"`**: Dikirim saat perangkat dilarang dari jaringan.
- **`"device_whitelisted"`**: Dikirim saat perangkat dimasukkan ke daftar putih (_whitelisted_) di jaringan.
- **`"device_renamed"`**: Dikirim saat nama perangkat diganti.
- **`"group_renamed"`**: Dikirim saat nama grup diganti.
- **`"group_added"`**: Dikirim saat grup ditambahkan.
- **`"group_removed"`**: Dikirim saat grup dihapus.
- **`"device_bind"`**: Dikirim saat perangkat terikat (_bind_).
- **`"device_unbind"`**: Dikirim saat perangkat tidak terikat (_unbind_).
- **`"device_group_add"`**: Dikirim saat perangkat ditambahkan ke grup.
- **`"device_group_add_failed"`**: Dikirim saat permintaan untuk menambahkan perangkat ke grup gagal.
- **`"device_group_remove"`**: Dikirim saat perangkat dihapus dari grup.
- **`"device_group_remove_failed"`**: Dikirim saat permintaan untuk menghapus perangkat dari grup gagal.
- **`"device_group_remove_all"`**: Dikirim saat perangkat dihapus dari semua grup.
- **`"device_group_remove_all_failed"`**: Dikirim saat permintaan untuk menghapus perangkat dari semua grup gagal.
- **`"devices"`**: Daftar semua perangkat, pesan ini dapat dipicu dengan mengirim pesan ke `zigbee2mqtt/bridge/config/devices` (muatan (_payload_) tidak masalah).
- **`"groups"`**: Daftar semua grup, pesan ini dapat dipicu dengan mengirim pesan ke `zigbee2mqtt/bridge/config/groups` (muatan tidak masalah).
- **`"zigbee_publish_error"`**: Tercatat saat terjadi kesalahan penerbitan Zigbee, berisi kesalahan dan metadata yang berisi perangkat dan perintah.
- **`"ota_update"`**: _Log_ terkait dengan pembaruan OTA.
- **`"touchlink"`**: _Log_ terkait dengan TouchLink.

---

### zigbee2mqtt/bridge/config/devices/get

Memungkinkan Anda mengambil semua perangkat yang terhubung. Terbitkan muatan kosong ke topik ini. Respons akan dipublikasikan ke `zigbee2mqtt/bridge/config/devices`.

---

### zigbee2mqtt/bridge/config/permit_join

Memungkinkan Anda mengizinkan perangkat baru untuk bergabung melalui MQTT. Ini tidak persisten (tidak akan disimpan ke `configuration.yaml`). Pesan yang mungkin adalah:

- **`"true"`**: Mengizinkan perangkat baru untuk bergabung.
- **`"false"`**: Menonaktifkan bergabungnya perangkat baru.

---

### zigbee2mqtt/bridge/config/last_seen

Memungkinkan Anda untuk mengatur opsi konfigurasi `advanced` -\> `last_seen`.

---

### zigbee2mqtt/bridge/config/elapsed

Memungkinkan Anda untuk mengatur opsi konfigurasi `advanced` -\> `elapsed`.

---

### zigbee2mqtt/bridge/config/reset

Mengatur ulang ZNP (CC2530/CC2531).

---

### zigbee2mqtt/bridge/config/touchlink/factory_reset

Lihat [Touchlink](https://www.google.com/search?q=./touchlink.md).

---

### zigbee2mqtt/bridge/ota_update/+

Lihat [Pembaruan OTA](https://www.google.com/search?q=./ota_updates.md).

---

### zigbee2mqtt/bridge/config/log_level

Memungkinkan Anda mengganti `log_level` saat _runtime_. Ini tidak persisten (tidak akan disimpan ke `configuration.yaml`). Muatan yang mungkin adalah: `"debug"`, `"info"`, `"warn"`, `"error"`.

---

### zigbee2mqtt/bridge/config/device_options

Memungkinkan Anda mengubah opsi spesifik perangkat saat _runtime_. Opsi hanya bisa diubah, tidak bisa ditambahkan atau dihapus. Muatan harus berupa pesan JSON, contoh:

```json
{
  "friendly_name": "motion_sensor_toilet",
  "options": {
    "occupancy_timeout": 100
  }
}
```

---

### zigbee2mqtt/bridge/config/remove

Memungkinkan Anda menghapus perangkat dari jaringan. Muatan harus berupa `friendly_name`, contoh: `0x00158d0001b79111`. Setelah berhasil dihapus, pesan [`device_removed`](<https://www.google.com/search?q=%5Bhttps://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html%23zigbee2mqttbridgelog%5D(https://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html%23zigbee2mqttbridgelog)>) akan dikirim.

Di Zigbee, koordinator hanya dapat **meminta** perangkat untuk menghapus dirinya sendiri dari jaringan. Ini berarti jika perangkat menolak untuk merespons permintaan ini, perangkat tersebut tidak akan dihapus dari jaringan. Ini bisa terjadi pada perangkat bertenaga baterai yang sedang tidur dan tidak menerima permintaan ini. Dalam kasus ini, Anda akan melihat pesan berikut di _log_ Zigbee2MQTT:

```
Zigbee2MQTT:info  2019-11-03T13:39:30: Removing 'dimmer'
Zigbee2MQTT:error 2019-11-03T13:39:40: Failed to remove dimmer (Error: AREQ - ZDO - mgmtLeaveRsp after 10000ms)
```

Cara alternatif untuk menghapus perangkat adalah dengan mengatur ulang pabrik (_factory reset_), tetapi ini mungkin tidak berhasil untuk semua perangkat karena tergantung pada perangkat itu sendiri. Jika perangkat berhasil menghapus dirinya dari jaringan, Anda akan melihat:

```
Zigbee2MQTT:warn  2019-11-03T13:36:18: Device '0x00158d00024a5e57' left the network
```

Jika semua cara di atas gagal, Anda dapat **memaksa** penghapusan perangkat. Perlu diperhatikan bahwa penghapusan paksa **hanya** akan menghapus perangkat dari basis data. Sampai perangkat ini diatur ulang pabrik, perangkat tersebut masih akan memegang kunci enkripsi jaringan dan dengan demikian masih dapat berkomunikasi melalui jaringan\!

Untuk menghapus perangkat secara paksa, gunakan topik berikut: `zigbee2mqtt/bridge/config/force_remove`.

---

### zigbee2mqtt/bridge/config/ban

Memungkinkan Anda melarang perangkat dari jaringan. Muatan harus berupa `friendly_name`, contoh: `0x00158d0001b79111`. Setelah berhasil dilarang, pesan [`device_banned`](<https://www.google.com/search?q=%5Bhttps://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html%23zigbee2mqttbridgelog%5D(https://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html%23zigbee2mqttbridgelog)>) akan dikirim.

---

### zigbee2mqtt/bridge/config/whitelist

Memungkinkan Anda memasukkan perangkat ke daftar putih (_whitelist_) di jaringan. Muatan harus berupa `friendly_name`, contoh: `0x00158d0001b79111`. Setelah berhasil dimasukkan ke daftar putih, pesan [`device_whitelisted`](<https://www.google.com/search?q=%5Bhttps://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html%23zigbee2mqttbridgelog%5D(https://www.zigbee2mqtt.io/information/mqtt_topics_and_message_structure.html%23zigbee2mqttbridgelog)>) akan dikirim. Perlu diperhatikan bahwa saat perangkat dimasukkan ke daftar putih, semua perangkat yang tidak terdaftar akan dihapus dari jaringan.

---

### zigbee2mqtt/bridge/config/rename

Memungkinkan Anda mengubah `friendly_name` dari perangkat atau grup secara langsung (_on the fly_). Formatnya harus: `{"old": "OLD_FRIENDLY_NAME", "new": "NEW_FRIENDLY_NAME"}`.

---

### zigbee2mqtt/bridge/config/rename_last

Memungkinkan Anda mengganti nama perangkat yang terakhir bergabung. Muatan harus berupa nama baru, contoh: `my_new_device_name`.

---

### zigbee2mqtt/bridge/config/add_group

Memungkinkan Anda menambahkan grup, muatan harus berupa nama grup, contoh: `my_group`. Jika Anda juga ingin menentukan ID grup, berikan muatan berikut `{"friendly_name": "my_group", "id": 42}`.

---

### zigbee2mqtt/bridge/config/remove_group

Memungkinkan Anda menghapus grup, muatan harus berupa nama grup, contoh: `my_group`. Jika penghapusan grup gagal karena salah satu perangkat tidak dapat dihapus dari grup, Anda dapat memaksanya melalui `zigbee2mqtt/bridge/config/remove_group`.

---

### zigbee2mqtt/bridge/networkmap

**PERINGATAN: Selama pemindaian peta jaringan, jaringan Anda akan tidak/kurang responsif. Tergantung pada ukuran jaringan Anda, ini bisa memakan waktu antara 10 detik hingga 2 menit. Oleh karena itu, disarankan untuk hanya memicu pemindaian ini secara manual\!**

Memungkinkan Anda mengambil peta jaringan Zigbee Anda. Muatan yang mungkin adalah `raw`, `graphviz`, dan `plantuml`. Zigbee2MQTT akan mengirim peta jaringan ke topik `zigbee2mqtt/bridge/networkmap/[raw|graphviz|plantuml]`.

Gunakan [webgraphviz.com](http://www.webgraphviz.com/) (untuk `graphviz`), [planttext.com](https://www.planttext.com/) (untuk `plantuml`), atau alat lain untuk menghasilkan Grafik Jaringan. **CATATAN:** Diperlukan Zigbee2MQTT versi 1.2.1 atau lebih tinggi.

Untuk meminta peta jaringan dengan **rute**, gunakan `zigbee2mqtt/bridge/networkmap/routes` sebagai topik.

#### graphviz

Peta graphviz menunjukkan perangkat sebagai berikut:

- **Koordinator**: Persegi panjang dengan garis luar tebal.
- **Router**: Persegi panjang dengan sudut membulat.
- **Perangkat akhir (_End device_)**: Persegi panjang dengan sudut membulat dan garis luar putus-putus.

Tautan diberi label dengan kualitas tautan (0..255) dan rute aktif (dicantumkan berdasarkan alamat tujuan 16 bit pendek). Panah menunjukkan arah pengiriman pesan. Koordinator dan router biasanya akan memiliki dua garis untuk setiap koneksi yang menunjukkan jalur pesan dua arah. Gaya garisnya adalah:

- Ke **perangkat akhir**: Garis normal.
- Ke dan antara **koordinator** dan **router**: Garis tebal untuk rute aktif atau garis tipis untuk rute tidak aktif.

---

### zigbee2mqtt/bridge/group/[friendly_name]/(add|remove|remove_all)

Lihat [Grup](https://www.google.com/search?q=groups.md).

---

### zigbee2mqtt/bridge/(bind|unbind)/[friendly_name]

Lihat [Pengikatan (_Binding_)](https://www.google.com/search?q=binding.md).

---

### zigbee2mqtt/bridge/device/[friendly_name]/get_group_membership

Mengembalikan daftar grup tempat perangkat berada, dan kapasitas grupnya.

---

### zigbee2mqtt/bridge/configure

Memungkinkan untuk secara manual memicu konfigurasi ulang perangkat. Seharusnya hanya digunakan saat perangkat tidak berfungsi seperti yang diharapkan, dan tidak semua perangkat memerlukan ini. Muatan harus berupa _friendly name_ perangkat, contoh: `my_remote`.

---

### zigbee2mqtt/[FRIENDLY_NAME]

Di mana `[FRIENDLY_NAME]` adalah contoh `0x00158d0001b79111`. Pesan yang dipublikasikan ke topik ini **selalu** dalam format JSON. Setiap perangkat menghasilkan pesan JSON yang berbeda, **beberapa** contoh:

**Sensor suhu & kelembaban Xiaomi MiJia (WSDCGQ01LM)**

```json
{
  "temperature": 27.34,
  "humidity": 44.72
}
```

**Sakelar nirkabel Xiaomi MiJia (WXKG01LM)**

```json
{
  "click": "double"
}
```

**Sensor gerakan tubuh manusia Xiaomi MiJia (RTCGQ01LM)**

```json
{
  "occupancy": true
}
```

**Bohlam LED IKEA TRADFRI E27 980 lumen, dapat diredupkan, spektrum putih, putih opal (LED1545G12)**

```json
{
  "state": "ON",
  "brightness": 215,
  "color_temp": 325
}
```

**Motor tirai Xiaomi Aqara (ZNCLDJ11LM)**

```js
{
  "position": 60,       // Nilai antara 0 dan 100, (0 - tertutup / 100 - terbuka)
  "running": true,      // Tirai sedang bergerak
}
```

---

### zigbee2mqtt/[FRIENDLY_NAME]/set

Memublikasikan pesan ke topik ini memungkinkan Anda mengontrol perangkat Zigbee Anda melalui MQTT. Hanya menerima pesan JSON. Contoh untuk mengontrol Philips Hue Go (7146060PH).

```js
{
  "state": "ON", // Atau "OFF", "TOGGLE"
  "brightness": 255, // Nilai antara 0 dan 255

  // Suhu warna dalam Reciprocal MegaKelvin, alias skala Mirek.
  // Mirek = 1,000,000 / Suhu Warna dalam Kelvin
  // Nilai biasanya antara 50 dan 400. Semakin tinggi nilainya, semakin hangat warnanya.
  "color_temp": 155,

  "color": {
    // Warna XY
    "x": 0.123,
    "y": 0.123

    // ATAU

    // Warna RGB
    "r": 46,
    "g": 102,
    "b": 193

    // ATAU

    // Warna RGB
    "rgb": "46,102,193"

    // ATAU

    // Warna HEX
    "hex": "#547CFF",

    // ATAU

    // Warna Hue dan/atau saturation
    "hue": 360,
    "saturation": 100

    // ATAU

    // Warna Hue, saturation, brightness (dalam ruang HSB)
    "h": 360,
    "s": 100,
    "b": 100

    // ATAU

    // Warna Hue, saturation, brightness (dalam ruang HSB)
    "hsb": "360,100,100"

    // ATAU

    // Warna Hue, saturation, brightness (dalam ruang HSV)
    "h": 360,
    "s": 100,
    "v": 100

    // ATAU

    // Warna Hue, saturation, brightness (dalam ruang HSV)
    "hsv": "360,100,100"

    // ATAU

    // Warna Hue, saturation, lightness (dalam ruang HSL)
    "h": 360,
    "s": 100,
    "l": 100

    // ATAU

    // Warna Hue, saturation, lightness (dalam ruang HSL)
    "hsl": "360,100,100"
  },

  // Memicu efek pada perangkat (contoh: bohlam berkedip)
  // Didukung: blink, breathe, okay, channel_change, finish_effect dan stop_effect
  "effect": "blink",

  // Menentukan jumlah detik yang dibutuhkan untuk transisi ke status ini (standarnya 0).
  "transition": 3,

  // Selain mengatur brightness, color_temp, hue atau saturation, juga dimungkinkan untuk:
  // - move: ini akan secara otomatis memindahkan nilai seiring waktu, untuk menghentikan kirim nilai "stop" atau "0".
  // - step: ini akan menambah/mengurangi nilai saat ini dengan nilai yang diberikan.
  // Arah move dan step bisa ke atas atau ke bawah, berikan nilai negatif untuk move/step ke bawah, nilai positif untuk move/step ke atas.
  // CATATAN: brightness move/step akan berhenti pada kecerahan minimum dan tidak akan menyalakan lampu saat mati. Dalam kasus ini, gunakan "brightness_move_onoff"/"brightness_step_onoff"
  // Contoh:
  "brightness_move": -40, // Mulai memindahkan kecerahan ke bawah pada 40 unit per detik
  "brightness_move": 0, // Hentikan memindahkan kecerahan
  "brightness_step": 40 // Meningkatkan kecerahan sebesar 40
  "color_temp_move": 60, // Mulai memindahkan suhu warna ke atas pada 60 unit per detik
  "color_temp_move": "stop", // Hentikan memindahkan suhu warna
  "color_temp_step": 99, // Meningkatkan suhu warna sebesar 99
  "hue_move": 40, // Mulai memindahkan hue ke atas pada 40 unit per detik, akan berulang tanpa batas (rentang nilai yang diizinkan: -255 hingga 255)
  "hue_step": -90, // Mengurangi hue sebesar 90 (rentang nilai yang diizinkan: -255 hingga 255)
  "saturation_move": -55, // Mulai memindahkan saturation ke bawah pada -55 unit per detik (rentang nilai yang diizinkan: -255 hingga 255)
  "saturation_step": 66, // Meningkatkan saturation sebesar 66 (rentang nilai yang diizinkan: -255 hingga 255)
}
```

`transition` menentukan jumlah detik yang dibutuhkan untuk transisi ke status ini (standarnya 0).

Hapus atribut yang tidak didukung untuk perangkat Anda. Contoh, untuk steker listrik Xiaomi Mi ZigBee (ZNCZ02LM), kirimkan hanya atribut `"state"`.

#### Tanpa JSON

Jika Anda tidak ingin menggunakan JSON, memublikasikan ke `zigbee2mqtt/[FRIENDLY_NAME]/set/state` dengan muatan `ON` sama dengan memublikasikan ke `zigbee2mqtt/[FRIENDLY_NAME]/set` dengan:

```js
{
  "state": "ON"
}
```

---

### zigbee2mqtt/[FRIENDLY_NAME]/get

Ini adalah pasangan dari perintah `set`. Ini memungkinkan Anda membaca nilai dari perangkat. Untuk membaca contoh status perangkat, kirim muatan:

```js
{
  "state": ""
}
```

---

### homeassistant/[DEVICE_TYPE]/[IEEEADDR]/[OBJECT_ID]/config

Hanya digunakan saat `homeassistant: true` di `configuration.yaml`. Diperlukan untuk [Home Assistant MQTT discovery](https://www.home-assistant.io/docs/mqtt/discovery/).

---

### Perintah Khusus Perangkat

Beberapa perangkat menawarkan perintah khusus perangkat. Contoh: untuk sensor getaran Xiaomi DJT11LM Aqara Anda dapat mengatur `sensitivity`. Untuk mengetahui apakah perangkat Anda mendukung perintah khusus, lihat halaman perangkat (yang dapat diakses melalui halaman perangkat yang didukung).

---

## Panduan Mendalam Konfigurasi MQTT untuk Zigbee2MQTT

### 1. Arsitektur MQTT dalam Zigbee2MQTT

Zigbee2MQTT menggunakan protokol MQTT sebagai jembatan komunikasi antara perangkat Zigbee dan sistem IoT lainnya. Berikut adalah diagram alur komunikasi:

```
[Perangkat Zigbee] ←→ [Koordinator Zigbee] ←→ [Zigbee2MQTT] ←→ [MQTT Broker] ←→ [Klien MQTT/Home Assistant/Node-RED]
```

### 2. Konfigurasi MQTT Broker

#### Konfigurasi Mosquitto (Rekomendasi)

```yaml
# /etc/mosquitto/mosquitto.conf
listener 1883
allow_anonymous false
password_file /etc/mosquitto/passwd
acl_file /etc/mosquitto/acl

# Untuk koneksi WebSocket (opsional)
listener 9001
protocol websockets
```

#### Membuat User dan Password

```bash
# Membuat user untuk Zigbee2MQTT
mosquitto_passwd -c /etc/mosquitto/passwd zigbee2mqtt

# Membuat user untuk Home Assistant
mosquitto_passwd /etc/mosquitto/passwd homeassistant
```

#### Konfigurasi ACL (Access Control List)

```
# /etc/mosquitto/acl
user zigbee2mqtt
topic readwrite zigbee2mqtt/#
topic read $SYS/#

user homeassistant
topic readwrite homeassistant/#
topic read zigbee2mqtt/#
```

### 3. Konfigurasi Zigbee2MQTT untuk MQTT

#### File configuration.yaml Lengkap

```yaml
# Konfigurasi MQTT
mqtt:
  # URL MQTT Broker
  server: 'mqtt://localhost:1883'
  # Jika menggunakan SSL/TLS
  # server: 'mqtts://localhost:8883'
  
  # Autentikasi
  user: 'zigbee2mqtt'
  password: 'password_aman_anda'
  
  # Topik dasar (dapat disesuaikan)
  base_topic: zigbee2mqtt
  
  # Opsi koneksi lanjutan
  keepalive: 60
  clean: true
  reconnect_period: 5000
  connect_timeout: 30000
  
  # QoS Level (0, 1, atau 2)
  qos: 1
  
  # Retain messages
  retain: false
  
  # Client ID unik
  client_id: 'zigbee2mqtt_main'
  
  # Sertifikat untuk SSL/TLS
  # ca: '/path/to/ca.crt'
  # cert: '/path/to/client.crt'  
  # key: '/path/to/client.key'
  
  # Reject unauthorized SSL certificates
  # reject_unauthorized: true

# Konfigurasi Serial Port
serial:
  port: /dev/ttyUSB0
  adapter: zstack

# Konfigurasi lanjutan
advanced:
  # Channel Zigbee (11-26)
  channel: 11
  
  # Pan ID (0x1a62 - default)
  pan_id: 0x1a62
  
  # Network key (32 hex characters)
  network_key: GENERATE
  
  # Log level
  log_level: info
  
  # Last seen
  last_seen: 'ISO_8601'
  
  # Elapsed time
  elapsed: true
  
  # Cache state
  cache_state: true
  
  # Publish availability
  availability_blocklist: []
  availability_passlist: []
  
# Pengaturan perangkat
device_options:
  # Retain messages untuk perangkat tertentu
  retain: false
  
  # Legacy API
  legacy_api: false
  
  # Optimistic updates
  optimistic: true

# Frontend (opsional)
frontend:
  port: 8080
  host: 0.0.0.0
  auth_token: 'token_rahasia_anda'

# Home Assistant Integration
homeassistant:
  legacy_entity_attributes: false
  legacy_triggers: false
  discovery_topic: 'homeassistant'
  status_topic: 'homeassistant/status'
  
# Groups (opsional)
groups:
  # Contoh grup
  '1':
    friendly_name: lampu_ruang_tamu
    devices:
      - 0x00158d0001a2b3c4
      - 0x00158d0001a2b3c5
```

### 4. Quality of Service (QoS) dalam MQTT

#### Level QoS:

- **QoS 0 (At most once)**: Pesan dikirim maksimal sekali, tidak ada jaminan sampai
  ```yaml
  mqtt:
    qos: 0  # Tercepat, untuk sensor yang sering update
  ```

- **QoS 1 (At least once)**: Pesan dijamin sampai minimal sekali
  ```yaml
  mqtt:
    qos: 1  # Rekomendasi untuk kontrol perangkat
  ```

- **QoS 2 (Exactly once)**: Pesan dijamin sampai tepat sekali
  ```yaml
  mqtt:
    qos: 2  # Untuk perintah kritis (jarang digunakan)
  ```

### 5. Struktur Topik MQTT yang Optimal

#### Hierarki Topik yang Disarankan:

```
zigbee2mqtt/
├── bridge/
│   ├── state                    # Status bridge
│   ├── config/                  # Konfigurasi runtime
│   ├── log                      # Log sistem
│   └── networkmap              # Peta jaringan
├── [friendly_name]/            # Data perangkat
│   ├── (data sensor)           # Pembacaan sensor
│   ├── set                     # Kontrol perangkat
│   ├── get                     # Permintaan data
│   └── availability           # Status online/offline
└── [grup_name]/               # Kontrol grup
    ├── set                    # Kontrol grup
    └── get                    # Status grup
```

### 6. Monitoring dan Debugging MQTT

#### Tools untuk Monitoring:

1. **MQTT Explorer** - GUI untuk browsing topik
2. **mosquitto_sub/mosquitto_pub** - Command line tools
3. **MQTTX** - Modern MQTT client

#### Perintah Debugging:

```bash
# Subscribe ke semua topik Zigbee2MQTT
mosquitto_sub -h localhost -t "zigbee2mqtt/#" -v

# Subscribe hanya ke log bridge
mosquitto_sub -h localhost -t "zigbee2mqtt/bridge/log" -v

# Publish perintah untuk menyalakan lampu
mosquitto_pub -h localhost -t "zigbee2mqtt/lampu_tamu/set" -m '{"state":"ON"}'

# Cek status bridge
mosquitto_sub -h localhost -t "zigbee2mqtt/bridge/state" -v
```

### 7. Optimisasi Performa MQTT

#### Tips Optimisasi:

1. **Gunakan Retain dengan Bijak**:
```yaml
mqtt:
  retain: false  # Default false untuk menghemat memori broker
```

2. **Atur Keepalive yang Optimal**:
```yaml
mqtt:
  keepalive: 60  # 60 detik untuk koneksi yang stabil
```

3. **Clean Session**:
```yaml
mqtt:
  clean: true  # Bersihkan session lama saat reconnect
```

4. **Batasi Log Level**:
```yaml
advanced:
  log_level: info  # Gunakan 'warn' atau 'error' untuk produksi
```

### 8. Keamanan MQTT

#### Best Practices Keamanan:

1. **Gunakan Autentikasi**:
```yaml
mqtt:
  user: 'zigbee2mqtt_user'
  password: 'Password_Kuat_123!'
```

2. **Implementasikan SSL/TLS**:
```yaml
mqtt:
  server: 'mqtts://broker.example.com:8883'
  ca: '/etc/ssl/certs/ca.crt'
  reject_unauthorized: true
```

3. **Gunakan ACL yang Ketat**:
```
# Hanya izinkan topik yang diperlukan
user zigbee2mqtt
topic readwrite zigbee2mqtt/#
topic read $SYS/broker/uptime
```

4. **Network Segmentation**:
- Pisahkan jaringan IoT dari jaringan utama
- Gunakan VLAN untuk isolasi
- Implementasikan firewall rules

### 9. Troubleshooting MQTT

#### Masalah Umum dan Solusi:

1. **Koneksi Terputus Sering**:
```yaml
mqtt:
  keepalive: 30
  reconnect_period: 5000
  connect_timeout: 30000
```

2. **Message Loss**:
```yaml
mqtt:
  qos: 1  # Naikkan QoS level
  clean: false  # Simpan session
```

3. **High CPU Usage**:
```yaml
advanced:
  log_level: warn  # Kurangi logging
mqtt:
  retain: false  # Matikan retain jika tidak perlu
```

### 10. Integrasi dengan Home Assistant

#### Konfigurasi Home Assistant:

```yaml
# configuration.yaml
mqtt:
  broker: localhost
  port: 1883
  username: homeassistant
  password: ha_password
  discovery: true
  discovery_prefix: homeassistant
  
# Sensor manual jika discovery tidak bekerja  
sensor:
  - platform: mqtt
    name: "Suhu Ruang Tamu"
    state_topic: "zigbee2mqtt/sensor_suhu_tamu"
    unit_of_measurement: "°C"
    value_template: "{{ value_json.temperature }}"
    
switch:
  - platform: mqtt
    name: "Lampu Tamu"
    state_topic: "zigbee2mqtt/lampu_tamu"
    command_topic: "zigbee2mqtt/lampu_tamu/set"
    payload_on: '{"state":"ON"}'
    payload_off: '{"state":"OFF"}'
    state_on: "ON"
    state_off: "OFF"
    value_template: "{{ value_json.state }}"
```

### 11. Backup dan Recovery

#### Backup Konfigurasi:
```bash
# Backup konfigurasi Zigbee2MQTT
cp /opt/zigbee2mqtt/data/configuration.yaml /backup/z2m_config_$(date +%Y%m%d).yaml

# Backup database koordinator
cp /opt/zigbee2mqtt/data/database.db /backup/z2m_database_$(date +%Y%m%d).db
```

#### Script Monitoring:
```bash
#!/bin/bash
# mqtt_monitor.sh
while true; do
    if ! mosquitto_sub -h localhost -t "zigbee2mqtt/bridge/state" -W 1 | grep -q "online"; then
        echo "$(date): Zigbee2MQTT offline!" >> /var/log/z2m_monitor.log
        # Restart service jika diperlukan
        # systemctl restart zigbee2mqtt
    fi
    sleep 60
done
```

---

## Contoh Implementasi Praktis MQTT

### 1. Setup Lengkap Node.js Client

#### Package.json
```json
{
  "name": "zigbee2mqtt-client",
  "version": "1.0.0",
  "description": "MQTT Client untuk Zigbee2MQTT",
  "main": "index.js",
  "dependencies": {
    "mqtt": "^4.3.7",
    "winston": "^3.8.2",
    "dotenv": "^16.0.3"
  }
}
```

#### .env Configuration
```env
MQTT_HOST=localhost
MQTT_PORT=1883
MQTT_USERNAME=zigbee2mqtt
MQTT_PASSWORD=password_aman
MQTT_BASE_TOPIC=zigbee2mqtt
LOG_LEVEL=info
```

#### Main Application (index.js)
```javascript
const mqtt = require('mqtt');
const winston = require('winston');
require('dotenv').config();

// Konfigurasi Logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.printf(({ timestamp, level, message }) => {
      return `${timestamp} [${level.toUpperCase()}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'zigbee2mqtt-client.log' })
  ]
});

class Zigbee2MQTTClient {
  constructor() {
    this.client = null;
    this.baseTopic = process.env.MQTT_BASE_TOPIC || 'zigbee2mqtt';
    this.devices = new Map();
    this.isConnected = false;
  }

  connect() {
    const options = {
      host: process.env.MQTT_HOST || 'localhost',
      port: parseInt(process.env.MQTT_PORT) || 1883,
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      keepalive: 60,
      clean: true,
      reconnectPeriod: 5000,
      clientId: `zigbee2mqtt_client_${Math.random().toString(16).substr(2, 8)}`
    };

    this.client = mqtt.connect(`mqtt://${options.host}:${options.port}`, options);
    
    this.client.on('connect', () => {
      logger.info('Terhubung ke MQTT Broker');
      this.isConnected = true;
      this.subscribe();
    });

    this.client.on('message', (topic, message) => {
      this.handleMessage(topic, message.toString());
    });

    this.client.on('error', (error) => {
      logger.error(`MQTT Error: ${error.message}`);
    });

    this.client.on('offline', () => {
      logger.warn('MQTT Offline');
      this.isConnected = false;
    });

    this.client.on('reconnect', () => {
      logger.info('MQTT Reconnecting...');
    });
  }

  subscribe() {
    const topics = [
      `${this.baseTopic}/bridge/state`,
      `${this.baseTopic}/bridge/log`,
      `${this.baseTopic}/bridge/config`,
      `${this.baseTopic}/+`,           // Semua device data
      `${this.baseTopic}/+/availability`
    ];

    topics.forEach(topic => {
      this.client.subscribe(topic, { qos: 1 }, (err) => {
        if (err) {
          logger.error(`Gagal subscribe ke ${topic}: ${err.message}`);
        } else {
          logger.info(`Subscribe ke topik: ${topic}`);
        }
      });
    });
  }

  handleMessage(topic, message) {
    try {
      const topicParts = topic.split('/');
      
      if (topic === `${this.baseTopic}/bridge/state`) {
        this.handleBridgeState(message);
      } else if (topic === `${this.baseTopic}/bridge/log`) {
        this.handleBridgeLog(JSON.parse(message));
      } else if (topicParts.length === 2) {
        // Device data: zigbee2mqtt/[device_name]
        this.handleDeviceData(topicParts[1], message);
      } else if (topic.endsWith('/availability')) {
        // Device availability: zigbee2mqtt/[device_name]/availability
        this.handleDeviceAvailability(topicParts[1], message);
      }
    } catch (error) {
      logger.error(`Error handling message untuk ${topic}: ${error.message}`);
    }
  }

  handleBridgeState(state) {
    logger.info(`Bridge State: ${state}`);
    if (state === 'online') {
      // Bridge online, request device list
      this.requestDeviceList();
    }
  }

  handleBridgeLog(logData) {
    const { type, message } = logData;
    
    switch(type) {
      case 'device_connected':
        logger.info(`Perangkat terhubung: ${message}`);
        break;
      case 'device_removed':
        logger.info(`Perangkat dihapus: ${message}`);
        break;
      case 'pairing':
        logger.info(`Pairing mode: ${message}`);
        break;
      default:
        logger.debug(`Bridge log [${type}]: ${message}`);
    }
  }

  handleDeviceData(deviceName, data) {
    try {
      const parsedData = JSON.parse(data);
      
      // Update device data cache
      if (!this.devices.has(deviceName)) {
        this.devices.set(deviceName, {});
      }
      
      const deviceInfo = this.devices.get(deviceName);
      Object.assign(deviceInfo, parsedData);
      deviceInfo.lastSeen = new Date().toISOString();
      
      logger.debug(`Data dari ${deviceName}:`, parsedData);
      
      // Process specific device types
      this.processDeviceData(deviceName, parsedData);
      
    } catch (error) {
      logger.error(`Error parsing data dari ${deviceName}: ${error.message}`);
    }
  }

  processDeviceData(deviceName, data) {
    // Temperature sensor
    if (data.temperature !== undefined) {
      logger.info(`🌡️ ${deviceName}: ${data.temperature}°C`);
      
      // Alert jika suhu ekstrem
      if (data.temperature > 35) {
        logger.warn(`⚠️ Suhu tinggi detected di ${deviceName}: ${data.temperature}°C`);
      }
    }

    // Motion sensor
    if (data.occupancy !== undefined) {
      logger.info(`🚶 ${deviceName}: ${data.occupancy ? 'Motion detected' : 'No motion'}`);
    }

    // Light state
    if (data.state !== undefined) {
      logger.info(`💡 ${deviceName}: ${data.state} (brightness: ${data.brightness || 'N/A'})`);
    }

    // Battery level
    if (data.battery !== undefined) {
      logger.info(`🔋 ${deviceName}: ${data.battery}%`);
      
      // Alert jika baterai lemah
      if (data.battery < 20) {
        logger.warn(`⚠️ Baterai lemah di ${deviceName}: ${data.battery}%`);
      }
    }
  }

  handleDeviceAvailability(deviceName, availability) {
    logger.info(`📶 ${deviceName} availability: ${availability}`);
  }

  // Control Methods
  controlLight(deviceName, state, options = {}) {
    const payload = {
      state: state.toUpperCase(),
      ...options
    };

    this.publish(`${deviceName}/set`, payload);
  }

  requestDeviceList() {
    this.publish('bridge/config/devices/get', '');
  }

  permitJoin(enable = true, duration = 60) {
    this.publish('bridge/config/permit_join', enable.toString());
    if (enable) {
      logger.info(`Pairing mode enabled untuk ${duration} detik`);
      setTimeout(() => {
        this.publish('bridge/config/permit_join', 'false');
        logger.info('Pairing mode disabled');
      }, duration * 1000);
    }
  }

  renameDevice(oldName, newName) {
    const payload = {
      old: oldName,
      new: newName
    };
    this.publish('bridge/config/rename', payload);
  }

  removeDevice(deviceName) {
    this.publish('bridge/config/remove', deviceName);
  }

  publish(topic, payload) {
    if (!this.isConnected) {
      logger.error('MQTT tidak terhubung, tidak dapat publish');
      return;
    }

    const fullTopic = `${this.baseTopic}/${topic}`;
    const message = typeof payload === 'object' ? JSON.stringify(payload) : payload;
    
    this.client.publish(fullTopic, message, { qos: 1 }, (err) => {
      if (err) {
        logger.error(`Gagal publish ke ${fullTopic}: ${err.message}`);
      } else {
        logger.debug(`Published ke ${fullTopic}: ${message}`);
      }
    });
  }

  getDeviceInfo(deviceName) {
    return this.devices.get(deviceName);
  }

  getAllDevices() {
    return Array.from(this.devices.entries());
  }
}

// Usage Example
const zigbeeClient = new Zigbee2MQTTClient();
zigbeeClient.connect();

// CLI Commands
process.stdin.setEncoding('utf8');
console.log('\n=== Zigbee2MQTT Client Started ===');
console.log('Commands:');
console.log('  light <device> on/off [brightness] - Control light');
console.log('  pair [duration] - Enable pairing mode');
console.log('  devices - List all devices');
console.log('  rename <old> <new> - Rename device');
console.log('  remove <device> - Remove device');
console.log('  exit - Keluar aplikasi\n');

process.stdin.on('readable', () => {
  const chunk = process.stdin.read();
  if (chunk !== null) {
    const command = chunk.trim().split(' ');
    
    switch(command[0]) {
      case 'light':
        if (command.length >= 3) {
          const options = {};
          if (command[3]) options.brightness = parseInt(command[3]);
          zigbeeClient.controlLight(command[1], command[2], options);
        } else {
          console.log('Usage: light <device> on/off [brightness]');
        }
        break;
        
      case 'pair':
        const duration = parseInt(command[1]) || 60;
        zigbeeClient.permitJoin(true, duration);
        break;
        
      case 'devices':
        const devices = zigbeeClient.getAllDevices();
        console.log('\n=== Device List ===');
        devices.forEach(([name, info]) => {
          console.log(`${name}:`, info);
        });
        console.log('==================\n');
        break;
        
      case 'rename':
        if (command.length >= 3) {
          zigbeeClient.renameDevice(command[1], command[2]);
        } else {
          console.log('Usage: rename <old_name> <new_name>');
        }
        break;
        
      case 'remove':
        if (command[1]) {
          zigbeeClient.removeDevice(command[1]);
        } else {
          console.log('Usage: remove <device_name>');
        }
        break;
        
      case 'exit':
        process.exit(0);
        break;
        
      default:
        console.log('Unknown command. Type exit to quit.');
    }
  }
});

module.exports = Zigbee2MQTTClient;
```

### 2. Python MQTT Client Example

#### requirements.txt
```
paho-mqtt==1.6.1
python-dotenv==0.20.0
colorlog==6.7.0
```

#### zigbee2mqtt_client.py
```python
import json
import time
import threading
import logging
from datetime import datetime
from paho.mqtt.client import Client
from dotenv import load_dotenv
import os
import colorlog

load_dotenv()

# Setup colored logging
handler = colorlog.StreamHandler()
handler.setFormatter(colorlog.ColoredFormatter(
    '%(log_color)s%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
))

logger = colorlog.getLogger()
logger.addHandler(handler)
logger.setLevel(getattr(logging, os.getenv('LOG_LEVEL', 'INFO').upper()))

class Zigbee2MQTTClient:
    def __init__(self):
        self.client = Client()
        self.base_topic = os.getenv('MQTT_BASE_TOPIC', 'zigbee2mqtt')
        self.devices = {}
        self.is_connected = False
        
        # MQTT Callbacks
        self.client.on_connect = self._on_connect
        self.client.on_message = self._on_message
        self.client.on_disconnect = self._on_disconnect
        
        # Authentication
        username = os.getenv('MQTT_USERNAME')
        password = os.getenv('MQTT_PASSWORD')
        if username and password:
            self.client.username_pw_set(username, password)
    
    def connect(self):
        host = os.getenv('MQTT_HOST', 'localhost')
        port = int(os.getenv('MQTT_PORT', '1883'))
        
        try:
            self.client.connect(host, port, 60)
            self.client.loop_start()
            logger.info(f"Connecting to MQTT broker at {host}:{port}")
        except Exception as e:
            logger.error(f"Failed to connect to MQTT: {e}")
    
    def _on_connect(self, client, userdata, flags, rc):
        if rc == 0:
            self.is_connected = True
            logger.info("✅ Connected to MQTT broker")
            self._subscribe_topics()
        else:
            logger.error(f"❌ Failed to connect to MQTT broker: {rc}")
    
    def _on_disconnect(self, client, userdata, rc):
        self.is_connected = False
        logger.warning("📡 Disconnected from MQTT broker")
    
    def _subscribe_topics(self):
        topics = [
            f"{self.base_topic}/bridge/state",
            f"{self.base_topic}/bridge/log", 
            f"{self.base_topic}/bridge/config",
            f"{self.base_topic}/+",
            f"{self.base_topic}/+/availability"
        ]
        
        for topic in topics:
            self.client.subscribe(topic, qos=1)
            logger.debug(f"📩 Subscribed to: {topic}")
    
    def _on_message(self, client, userdata, msg):
        topic = msg.topic
        payload = msg.payload.decode()
        
        try:
            if topic == f"{self.base_topic}/bridge/state":
                self._handle_bridge_state(payload)
            elif topic == f"{self.base_topic}/bridge/log":
                self._handle_bridge_log(json.loads(payload))
            elif topic.endswith('/availability'):
                device_name = topic.split('/')[-2]
                self._handle_device_availability(device_name, payload)
            elif '/' in topic and not topic.endswith(('/set', '/get')):
                device_name = topic.split('/')[-1]
                if device_name != 'bridge':
                    self._handle_device_data(device_name, payload)
        except Exception as e:
            logger.error(f"❌ Error handling message for {topic}: {e}")
    
    def _handle_bridge_state(self, state):
        logger.info(f"🌉 Bridge state: {state}")
        if state == 'online':
            self.request_device_list()
    
    def _handle_bridge_log(self, log_data):
        log_type = log_data.get('type', 'unknown')
        message = log_data.get('message', '')
        
        emoji_map = {
            'device_connected': '🔌',
            'device_removed': '🗑️',
            'pairing': '🔄',
            'device_announced': '📢',
            'device_banned': '🚫'
        }
        
        emoji = emoji_map.get(log_type, '📝')
        logger.info(f"{emoji} [{log_type}] {message}")
    
    def _handle_device_data(self, device_name, data):
        try:
            parsed_data = json.loads(data)
            
            # Update device cache
            if device_name not in self.devices:
                self.devices[device_name] = {}
            
            self.devices[device_name].update(parsed_data)
            self.devices[device_name]['last_seen'] = datetime.now().isoformat()
            
            # Process specific data types
            self._process_device_data(device_name, parsed_data)
            
        except json.JSONDecodeError:
            logger.error(f"❌ Invalid JSON from {device_name}: {data}")
    
    def _process_device_data(self, device_name, data):
        # Temperature
        if 'temperature' in data:
            temp = data['temperature']
            logger.info(f"🌡️ {device_name}: {temp}°C")
            if temp > 35:
                logger.warning(f"🔥 High temperature alert: {device_name} ({temp}°C)")
        
        # Humidity
        if 'humidity' in data:
            logger.info(f"💧 {device_name}: {data['humidity']}% humidity")
        
        # Motion
        if 'occupancy' in data:
            status = "detected" if data['occupancy'] else "clear"
            logger.info(f"🚶 {device_name}: Motion {status}")
        
        # Light state
        if 'state' in data:
            brightness = f" ({data['brightness']}%)" if 'brightness' in data else ""
            logger.info(f"💡 {device_name}: {data['state']}{brightness}")
        
        # Battery
        if 'battery' in data:
            battery = data['battery']
            logger.info(f"🔋 {device_name}: {battery}% battery")
            if battery < 20:
                logger.warning(f"🪫 Low battery alert: {device_name} ({battery}%)")
        
        # Click events
        if 'click' in data:
            logger.info(f"👆 {device_name}: {data['click']} click")
    
    def _handle_device_availability(self, device_name, availability):
        status_emoji = "🟢" if availability == "online" else "🔴"
        logger.info(f"{status_emoji} {device_name}: {availability}")
    
    def publish(self, topic, payload):
        if not self.is_connected:
            logger.error("❌ Not connected to MQTT broker")
            return False
        
        full_topic = f"{self.base_topic}/{topic}"
        message = json.dumps(payload) if isinstance(payload, dict) else str(payload)
        
        result = self.client.publish(full_topic, message, qos=1)
        if result.rc == 0:
            logger.debug(f"📤 Published to {full_topic}: {message}")
            return True
        else:
            logger.error(f"❌ Failed to publish to {full_topic}")
            return False
    
    # Control methods
    def control_light(self, device_name, state, **options):
        """Control a light device"""
        payload = {'state': state.upper(), **options}
        return self.publish(f"{device_name}/set", payload)
    
    def request_device_list(self):
        """Request list of all devices"""
        return self.publish("bridge/config/devices/get", "")
    
    def permit_join(self, enable=True, duration=60):
        """Enable/disable device pairing"""
        result = self.publish("bridge/config/permit_join", str(enable).lower())
        if enable:
            logger.info(f"🔄 Pairing enabled for {duration} seconds")
            threading.Timer(duration, lambda: self.permit_join(False)).start()
        return result
    
    def rename_device(self, old_name, new_name):
        """Rename a device"""
        payload = {"old": old_name, "new": new_name}
        return self.publish("bridge/config/rename", payload)
    
    def remove_device(self, device_name):
        """Remove a device from the network"""
        return self.publish("bridge/config/remove", device_name)
    
    def get_device_info(self, device_name):
        """Get cached device information"""
        return self.devices.get(device_name)
    
    def get_all_devices(self):
        """Get all cached device information"""
        return self.devices.copy()

def main():
    client = Zigbee2MQTTClient()
    client.connect()
    
    print("\n=== Zigbee2MQTT Python Client ===")
    print("Commands:")
    print("  light <device> on/off [brightness=<val>] - Control light")
    print("  pair [duration] - Enable pairing mode")
    print("  devices - List all devices") 
    print("  rename <old> <new> - Rename device")
    print("  remove <device> - Remove device")
    print("  exit - Exit application\n")
    
    try:
        while True:
            command = input("> ").strip().split()
            
            if not command:
                continue
                
            cmd = command[0].lower()
            
            if cmd == "exit":
                break
            elif cmd == "light" and len(command) >= 3:
                device, state = command[1], command[2]
                options = {}
                for arg in command[3:]:
                    if '=' in arg:
                        key, value = arg.split('=')
                        options[key] = int(value) if value.isdigit() else value
                client.control_light(device, state, **options)
            elif cmd == "pair":
                duration = int(command[1]) if len(command) > 1 else 60
                client.permit_join(True, duration)
            elif cmd == "devices":
                devices = client.get_all_devices()
                print("\n=== Device List ===")
                for name, info in devices.items():
                    print(f"{name}: {info}")
                print("==================\n")
            elif cmd == "rename" and len(command) == 3:
                client.rename_device(command[1], command[2])
            elif cmd == "remove" and len(command) == 2:
                client.remove_device(command[1])
            else:
                print("❌ Unknown command or incorrect arguments")
                
    except KeyboardInterrupt:
        pass
    finally:
        client.client.loop_stop()
        client.client.disconnect()
        logger.info("👋 Goodbye!")

if __name__ == "__main__":
    main()
```

### 3. Docker Compose untuk Development

#### docker-compose.yml
```yaml
version: '3.8'

services:
  mosquitto:
    image: eclipse-mosquitto:2.0
    container_name: zigbee_mosquitto
    ports:
      - "1883:1883"
      - "9001:9001"
    volumes:
      - ./mosquitto/config:/mosquitto/config:ro
      - ./mosquitto/data:/mosquitto/data
      - ./mosquitto/log:/mosquitto/log
    restart: unless-stopped

  zigbee2mqtt:
    image: koenkk/zigbee2mqtt:latest
    container_name: zigbee2mqtt
    depends_on:
      - mosquitto
    volumes:
      - ./zigbee2mqtt/data:/app/data
      - /run/udev:/run/udev:ro
    devices:
      - /dev/ttyUSB0:/dev/ttyUSB0
    environment:
      - TZ=Asia/Jakarta
    restart: unless-stopped

  mqtt-explorer:
    image: smeagolworms4/mqtt-explorer
    container_name: mqtt_explorer
    ports:
      - "4000:4000"
    restart: unless-stopped

  node-red:
    image: nodered/node-red:latest
    container_name: node_red
    ports:
      - "1880:1880"
    volumes:
      - ./node-red/data:/data
    environment:
      - TZ=Asia/Jakarta
    restart: unless-stopped
```

#### mosquitto/config/mosquitto.conf
```
persistence true
persistence_location /mosquitto/data/
log_dest file /mosquitto/log/mosquitto.log

# Port configuration
listener 1883
listener 9001
protocol websockets

# Security
allow_anonymous false
password_file /mosquitto/config/passwd
acl_file /mosquitto/config/acl
```
