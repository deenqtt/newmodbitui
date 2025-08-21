<script setup>
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { onMounted, ref } from "vue";
import { Text } from "troika-three-text";
import axios from "axios";
import Paho from "paho-mqtt";

import { appState } from "../../main";
let camera, controls, renderer, scene;
let containerMesh;
let initialMaterials = [];
const isZoomedIn = ref(false); // Status apakah sedang zoom ke rack
const selectedRackMesh = ref(null); // Menyimpan rack yang sedang di-zoom
const originalCameraPosition = new THREE.Vector3(); // Menyimpan posisi awal kamera

const rackMeshes = ref([]);
let mappedRacks = []; // 🛠️ Pastikan ini dideklarasikan secara global
let resizeObserver;
const deviceStore = useDeviceStore();
const props = defineProps({
  widgetKey: String, // Menerima widgetKey sebagai prop unik
});
const raycasters = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const selectedRack = ref(null);

const joystickContainer = ref(null);
const selectedDeviceId = deviceStore.getSelectedDevice(props.widgetKey);
let rotation; // Jadikan rotation variabel global
const card = ref(null);

// Dimensi Kontainer dan Rack Server
const containerDimensions = {
  length: 1219.2, // Panjang dalam cm
  width: 243.8, // Lebar dalam cm
  height: 259.1, // Tinggi dalam cm
};

const rackDimensions = {
  height: 186.69, // Tinggi rack 42U dalam cm
  width: 100, // Lebar rack dalam cm
  depth: 60, // Kedalaman rack dalam cm
};

const mqttClients = {}; // Map untuk menyimpan klien MQTT berdasarkan rack dan arah

const connectClientForRack = (topic, rackIndex, direction) => {
  const client = new Paho.Client(
    mqttBrokerAddress,
    Number(mqttBrokerPort),
    `clientId-${direction}-${rackIndex}-${Math.random()
      .toString(16)
      .substring(2, 8)}`
  );

  client.onConnectionLost = (responseObject) => {
    if (responseObject.errorCode !== 0) {
      console.error(
        `MQTT Connection Lost for Rack ${rackIndex + 1} (${direction}):`,
        responseObject.errorMessage
      );
    }
  };

  client.onMessageArrived = (message) => {
    try {
      const payload = JSON.parse(message.payloadString);
      if (!payload.value) {
        console.warn(
          `🚨 [Rack ${rackIndex + 1} - ${direction}] Payload kosong.`
        );
        return;
      }

      const valueData = JSON.parse(payload.value);
      const temp = valueData.temp ?? "N/A";
      const humidity = valueData.hum ?? "N/A";

      // 🎨 **Atur warna berdasarkan nilai temperatur**
      const tempColor =
        temp === "N/A"
          ? 0xffffff
          : temp > 40
          ? 0xff0000
          : temp > 30
          ? 0xffff00
          : 0x00ff00;

      // 🎨 **Atur warna berdasarkan nilai kelembaban**
      const humColor =
        humidity === "N/A"
          ? 0xffffff
          : humidity > 60
          ? 0xff0000
          : humidity > 40
          ? 0xffff00
          : 0x00ff00;

      // 🔥 **Update Label Temperatur**
      const tempLabel = scene.getObjectByName(
        `rack-${rackIndex + 1}-${direction}-temp-label`
      );
      if (tempLabel) {
        tempLabel.text = `🌡${temp}°C`;
        tempLabel.color = tempColor; // ✅ Warna berubah sesuai suhu
        tempLabel.sync();
      }

      // 🔥 **Update Label Humidity**
      const humidityLabel = scene.getObjectByName(
        `rack-${rackIndex + 1}-${direction}-humidity-label`
      );
      if (humidityLabel) {
        humidityLabel.text = `💧${humidity}%`;
        humidityLabel.color = humColor; // ✅ Warna berubah sesuai kelembaban
        humidityLabel.sync();
      }
    } catch (error) {
      console.error(
        `❌ Failed to parse MQTT message for Rack ${
          rackIndex + 1
        } (${direction}):`,
        error
      );
    }
  };

  client.connect({
    onSuccess: () => {
      client.subscribe(topic);
    },
    onFailure: (error) => {
      console.error(
        `❌ MQTT connection failed for Rack ${rackIndex + 1} (${direction}):`,
        error.errorMessage
      );
    },
    userName: mqttUsername,
    password: mqttPassword,
  });

  mqttClients[`rack-${rackIndex + 1}-${direction}`] = client;
};

// 🔥 **Subscribe ke topicPower dan cari nilai pue_PDU-{rackNumber}**
const subscribeToPowerTopic = (mappedRacks) => {
  const powerTopic = mappedRacks.find((rack) => rack.powerTopic)?.powerTopic;
  if (!powerTopic) {
    console.warn("⚠️ Tidak ada topicPower untuk di-subscribe.");
    return;
  }

  const client = new Paho.Client(
    mqttBrokerAddress,
    Number(mqttBrokerPort),
    `clientId-power-${Math.random().toString(16).substring(2, 8)}`
  );

  client.onMessageArrived = (message) => {
    try {
      const payload = JSON.parse(message.payloadString);
      if (!payload.value) return;

      // 🔥 Parse value dari payload (karena value dikirim dalam bentuk string JSON)
      const valueData = JSON.parse(payload.value);

      if (!mappedRacks.length) {
        console.warn("⚠️ mappedRacks masih kosong, menunggu data rack...");
        return;
      }

      setTimeout(() => {
        mappedRacks.forEach((rack) => {
          const powerKey = `pue_PDU-${rack.rackNumber}`;
          let powerValue = valueData[powerKey] ?? "null";

          if (typeof powerValue === "string" && powerValue.includes("%")) {
            powerValue = parseFloat(powerValue.replace("%", ""));
          } else {
            powerValue = parseFloat(powerValue) * 100;
          }

          powerValue = Math.min(powerValue, 100); // ✅ Batas maksimum 100%

          updateObjectInRack(rack.rackNumber, powerValue);
        });
      }, 500); // ✅ Tambahkan delay 500ms
    } catch (error) {
      console.error("❌ Failed to parse power topic message:", error);
    }
  };

  client.connect({
    onSuccess: () => {
      client.subscribe(powerTopic);
    },
    onFailure: (error) => {
      console.error(`❌ Failed to subscribe to Power Topic:`, error);
    },
    userName: mqttUsername,
    password: mqttPassword,
  });

  mqttClients["powerTopic"] = client;
};

const createRackLabel = (
  rackData,
  positionX,
  positionY,
  positionZ,
  rackIndex,
  direction
) => {
  const group = new THREE.Group(); // Group untuk menyatukan semua label

  // 📦 Label untuk Nama Rack
  const rackNameLabel = new Text();
  rackNameLabel.name = `rack-${rackIndex + 1}-${direction}-rack-label`;
  rackNameLabel.text = `Rack${rackData.rackNumber}`;
  rackNameLabel.fontSize = 0.15;
  rackNameLabel.color = 0xffffff; // White text
  rackNameLabel.position.set(0, -0.05, 0); // **Lebih tinggi supaya tidak bertabrakan**
  rackNameLabel.anchorX = "center";
  rackNameLabel.anchorY = "middle";
  rackNameLabel.sync();
  group.add(rackNameLabel);

  // 🌡 Label untuk Temperatur
  const tempLabel = new Text();
  tempLabel.name = `rack-${rackIndex + 1}-${direction}-temp-label`;
  tempLabel.text = "🌡N/A";
  tempLabel.fontSize = 0.12;
  tempLabel.color = 0xffff00; // **Kuning agar mudah dibaca**
  tempLabel.position.set(0, -0.3, 0); // **Diletakkan di tengah**
  tempLabel.anchorX = "center";
  tempLabel.anchorY = "middle";
  tempLabel.sync();
  group.add(tempLabel);

  // 💧 Label untuk Humidity
  const humidityLabel = new Text();
  humidityLabel.name = `rack-${rackIndex + 1}-${direction}-humidity-label`;
  humidityLabel.text = "💧N/A";
  humidityLabel.fontSize = 0.12;
  humidityLabel.color = 0x87ceeb; // **Biru langit agar terlihat**
  humidityLabel.position.set(0, -0.5, 0); // **Lebih ke bawah agar tidak bertabrakan**
  humidityLabel.anchorX = "center";
  humidityLabel.anchorY = "middle";
  humidityLabel.sync();
  group.add(humidityLabel);

  // **Atur posisi utama dari group label**
  group.position.set(positionX, positionY + 0.75, positionZ + 1.35); // **Lebih tinggi dan maju sedikit**

  // **Jika ini sisi belakang, beri rotasi agar menghadap kamera**
  if (direction === "back") {
    group.rotation.y = Math.PI;
  }

  group.name = `rack-${rackIndex + 1}-${direction}-label-group`;
  return group;
};

let leftCoverVisible = true;
let containerCovers = []; // Array untuk menyimpan referensi objek cover
// Fungsi untuk toggle visibility cover kiri
const toggleLeftCover = () => {
  if (leftCoverVisible) {
    // Hapus bagian cover dan garis tepi dari scene
    containerCovers.forEach((cover) => {
      scene.remove(cover); // Hapus cover
      const edges = cover.userData.edges; // Ambil garis tepi dari `userData`
      if (edges) {
        scene.remove(edges); // Hapus garis tepi dari scene
      }
    });
  } else {
    // Tambahkan kembali bagian cover dan garis tepi ke scene
    containerCovers.forEach((cover) => {
      scene.add(cover); // Tambahkan cover
      if (cover.userData.edges) {
        scene.add(cover.userData.edges); // Tambahkan kembali garis tepi
      }
    });
  }

  leftCoverVisible = !leftCoverVisible; // Toggle status
};
// Fungsi untuk menambahkan garis tepi (border) pada sebuah objek
const addEdgesToObject = (object, color, yOffset = 0) => {
  const edges = new THREE.EdgesGeometry(object.geometry);
  const line = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color })
  );

  line.position.copy(object.position); // Salin posisi objek
  line.rotation.copy(object.rotation); // Salin rotasi objek
  line.scale.copy(object.scale); // Salin skala objek

  line.updateMatrixWorld(); // Pastikan matriks dunia diperbarui
  return line;
};

// Fungsi untuk membuat kontainer
const createContainer = () => {
  const geometry = new THREE.BoxGeometry(
    containerDimensions.length / 100,
    containerDimensions.height / 100,
    containerDimensions.width / 100
  );

  const materials = [
    new THREE.MeshStandardMaterial({ color: 0xe3e3e3, side: THREE.DoubleSide }), // Depan
    new THREE.MeshStandardMaterial({ color: 0xe3e3e3, side: THREE.DoubleSide }), // Belakang
    new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }), // Atas
    new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }), // Bawah
    null, // Kiri (terbuka)
    new THREE.MeshStandardMaterial({ color: 0xe3e3e3, side: THREE.DoubleSide }), // Kanan
  ];

  initialMaterials = materials.map((material) =>
    material ? material.clone() : null
  );

  containerMesh = new THREE.Mesh(geometry, materials);
  return containerMesh;
};

// Fungsi untuk menghapus semua panel kontainer, termasuk border
const removeAllPanels = () => {
  if (!containerMesh) return;

  // Iterasi melalui semua material pada kontainer
  for (let i = 0; i < containerMesh.material.length; i++) {
    if (i !== 3) {
      // Indeks 3 adalah bagian bawah (mengacu pada definisi material dalam `createContainer`)
      containerMesh.material[i] = null; // Hapus material pada bagian selain bawah
    }
  }

  // Hapus garis tepi kontainer jika ada
  if (containerMesh.userData.edges) {
    scene.remove(containerMesh.userData.edges); // Hapus garis tepi dari scene
    containerMesh.userData.edges = null; // Hapus referensi garis tepi
  }

  // Hapus cover dan garis tepi cover jika ada
  containerCovers.forEach((cover) => {
    scene.remove(cover); // Hapus cover dari scene
    const edges = cover.userData.edges; // Ambil garis tepi dari `userData`
    if (edges) {
      scene.remove(edges); // Hapus garis tepi dari scene
    }
  });

  leftCoverVisible = false; // Pastikan status cover kiri diperbarui
};

// Fungsi untuk memulihkan semua panel kontainer, termasuk border
const restoreAllPanels = () => {
  if (!containerMesh || !initialMaterials.length) return;

  for (let i = 0; i < containerMesh.material.length; i++) {
    containerMesh.material[i] = initialMaterials[i]
      ? initialMaterials[i].clone()
      : null;
  }

  // Pulihkan garis tepi kontainer
  if (!containerMesh.userData.edges) {
    const yOffset = 0.05; // Sesuaikan offset Y
    const border = addEdgesToObject(containerMesh, 0x000000, yOffset); // Warna hitam
    containerMesh.userData.edges = border; // Simpan referensi garis tepi
    scene.add(border); // Tambahkan kembali garis tepi ke scene
  }

  // Pulihkan cover dan garis tepi cover
  containerCovers.forEach((cover) => {
    scene.add(cover); // Tambahkan kembali cover ke scene

    // Tambahkan kembali garis tepi jika belum ada
    if (!cover.userData.edges) {
      const yOffset = 0.05; // Sesuaikan offset Y
      const edges = addEdgesToObject(cover, 0x000000, yOffset); // Warna garis hitam
      cover.userData.edges = edges; // Simpan referensi garis tepi di userData
    }
    scene.add(cover.userData.edges); // Tambahkan garis tepi ke scene
  });
};

// Fungsi untuk membuat sekat dalam kontainer
const createPartition = (positionX) => {
  const geometry = new THREE.PlaneGeometry(
    containerDimensions.width / 100,
    containerDimensions.height / 100
  );

  const material = new THREE.MeshStandardMaterial({
    color: 0xdcdcdc,
    side: THREE.DoubleSide,
  });

  const partition = new THREE.Mesh(geometry, material);
  partition.rotation.y = Math.PI / 2; // Rotasi menghadap sumbu X
  partition.position.set(positionX / 100, containerDimensions.height / 200, 0);

  return partition;
};

// Fungsi untuk membuat rack server
const createRec = (
  positionX,
  positionY,
  positionZ,
  color,
  customDimensions = null,
  opacity = 1
) => {
  const dimensions = customDimensions || rackDimensions;

  const geometry = new THREE.BoxGeometry(
    dimensions.width / 100,
    dimensions.height / 100,
    dimensions.depth / 100
  );

  const material = new THREE.MeshStandardMaterial({
    color,
    transparent: opacity < 1, // Aktifkan transparansi hanya jika opacity < 1
    opacity: opacity, // Atur opacity
  });
  const rack = new THREE.Mesh(geometry, material);
  rack.position.set(positionX, positionY, positionZ);
  rack.rotation.y = Math.PI / 2; // Rotasi menghadap sumbu Y
  return rack;
};

// Fungsi untuk membuat tabung
const createCylinder = (
  positionX,
  positionY,
  positionZ,
  color,
  dimensions = { radius: 10, height: 50 }
) => {
  const geometry = new THREE.CylinderGeometry(
    dimensions.radius / 100,
    dimensions.radius / 100,
    dimensions.height / 100,
    32
  );

  const material = new THREE.MeshStandardMaterial({ color });
  const cylinder = new THREE.Mesh(geometry, material);
  cylinder.position.set(positionX, positionY, positionZ);

  return cylinder;
};

const createCylinderWithFillet = (
  positionX,
  positionY,
  positionZ,
  color,
  dimensions = { radius: 20, height: 150 }
) => {
  const group = new THREE.Group();

  // Tabung utama (bagian tengah)
  const cylinderGeometry = new THREE.CylinderGeometry(
    dimensions.radius / 100, // Radius atas dan bawah sama
    dimensions.radius / 100, // Radius atas dan bawah sama
    dimensions.height / 2 / 100, // Tinggi tabung (setengah total tinggi)
    32 // Jumlah segmen
  );

  const material = new THREE.MeshStandardMaterial({ color });

  const cylinder = new THREE.Mesh(cylinderGeometry, material);
  cylinder.position.y = dimensions.height / 4 / 100; // Letakkan tabung di tengah grup
  group.add(cylinder);

  // Fillet atas (bagian bundar)
  const topFilletGeometry = new THREE.SphereGeometry(
    dimensions.radius / 100, // Radius fillet sama dengan radius tabung
    32, // Segmen horizontal
    16, // Segmen vertikal
    0, // Sudut horizontal awal
    Math.PI * 2, // Sudut horizontal akhir (lingkar penuh)
    0, // Sudut vertikal awal
    Math.PI / 2 // Sudut vertikal akhir (setengah bola)
  );

  const topFillet = new THREE.Mesh(topFilletGeometry, material);
  topFillet.position.y = dimensions.height / 2 / 100; // Letakkan di atas tabung
  group.add(topFillet);

  // Posisi seluruh grup
  group.position.set(positionX, positionY, positionZ);

  return group;
};

// Fungsi untuk membuat tabung horizontal
const createHorizontalCylinder = (
  positionX,
  positionY,
  positionZ,
  color,
  dimensions
) => {
  const cylinder = createCylinder(
    positionX,
    positionY,
    positionZ,
    color,
    dimensions
  );
  cylinder.rotation.z = Math.PI / 2; // Rotasi horizontal
  return cylinder;
};
// Fungsi untuk membuat tray berlubang
const createOpenTrayWithHoles = (
  positionX,
  positionY,
  positionZ,
  color,
  dimensions = { width: 30, height: 10, depth: 700 },
  holeRadius = 2,
  holeSpacing = 5
) => {
  const group = new THREE.Group();

  // Dimensi
  const width = dimensions.width / 100; // Konversi cm ke meter
  const height = dimensions.height / 100;
  const depth = dimensions.depth / 100;

  const material = new THREE.MeshStandardMaterial({
    color,
    side: THREE.DoubleSide,
  });

  // Bagian bawah dengan lubang
  const shape = new THREE.Shape();
  shape.moveTo(-width / 2, -depth / 2);
  shape.lineTo(-width / 2, depth / 2);
  shape.lineTo(width / 2, depth / 2);
  shape.lineTo(width / 2, -depth / 2);
  shape.lineTo(-width / 2, -depth / 2);

  // Tambahkan lubang pada tray
  const holes = [];
  for (let x = -width / 2 + holeSpacing; x < width / 2; x += holeSpacing) {
    for (let y = -depth / 2 + holeSpacing; y < depth / 2; y += holeSpacing) {
      const hole = new THREE.Path();
      hole.absarc(x, y, holeRadius / 100, 0, Math.PI * 2, false); // Lubang bulat
      holes.push(hole);
    }
  }
  shape.holes = holes;

  // Ekstrusi untuk membuat tray berlubang
  const extrudeSettings = { depth: 0.01, bevelEnabled: false };
  const bottomGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const bottom = new THREE.Mesh(bottomGeometry, material);
  bottom.rotation.x = -Math.PI / 2; // Rotasi agar menghadap ke atas
  bottom.position.y = -height / 2; // Posisi bagian bawah
  group.add(bottom);

  // Bagian belakang
  const backGeometry = new THREE.PlaneGeometry(width, height);
  const back = new THREE.Mesh(backGeometry, material);
  back.rotation.y = Math.PI; // Menghadap ke arah depan
  back.position.z = -depth / 2; // Posisi bagian belakang
  group.add(back);

  // Bagian depan
  const frontGeometry = new THREE.PlaneGeometry(width, height);
  const front = new THREE.Mesh(frontGeometry, material);
  front.position.z = depth / 2; // Posisi bagian depan
  group.add(front);

  // Posisi seluruh grup
  group.position.set(positionX, positionY, positionZ);

  return group;
};

const movement = {
  x: 0,
  y: 0,
};
let joystickActive = false;
const activateJoystick = () => {
  joystickActive = true; // Aktifkan joystick
};
const createObjectInsideRack = (
  positionX,
  positionY,
  positionZ,
  heightPercentage
) => {
  const maxHeight = rackDimensions.height / 100; // Tinggi maksimum rack dalam meter
  const objectHeight = (maxHeight * Math.max(heightPercentage, 0)) / 100; // Jika 0%, tetap di dasar

  const geometry = new THREE.BoxGeometry(
    0.55, // Lebar sesuai rack
    objectHeight, // Tinggi dihitung sesuai persen dari rack
    rackDimensions.depth / 100 + 0.02 // Kedalaman sama dengan rack
  );

  const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

  const objectMesh = new THREE.Mesh(geometry, material);

  // **Set posisi agar bertambah ke atas, bukan tengah**
  objectMesh.position.set(
    positionX,
    positionY - maxHeight / 2 + objectHeight / 2 - 0.02,
    positionZ + 1
  );
  objectMesh.name = `rack-${positionX}-${positionY}-power`;

  return objectMesh;
};

const interpolateColor = (value, minColor, midColor, maxColor) => {
  let color;
  if (value <= 50) {
    // Interpolasi dari Hijau (0x00FF00) ke Kuning (0xFFFF00)
    let ratio = value / 50;
    color = new THREE.Color().lerpColors(
      new THREE.Color(minColor),
      new THREE.Color(midColor),
      ratio
    );
  } else {
    // Interpolasi dari Kuning (0xFFFF00) ke Merah (0xFF0000)
    let ratio = (value - 50) / 50;
    color = new THREE.Color().lerpColors(
      new THREE.Color(midColor),
      new THREE.Color(maxColor),
      ratio
    );
  }
  return color;
};

const updateObjectInRack = (rackNumber, powerValue) => {
  const rackObject = scene.getObjectByName(`rack-${rackNumber}-power`);
  if (!rackObject) {
    console.warn(`⚠️ Rack ${rackNumber} tidak ditemukan di scene.`);
    return;
  }

  let newHeightPercentage = parseFloat(powerValue);
  if (isNaN(newHeightPercentage) || newHeightPercentage < 0) {
    newHeightPercentage = 0; // Default minimal 0%
  }

  newHeightPercentage = Math.min(newHeightPercentage, 100); // Batas maksimum tetap 100%

  const maxHeight = rackDimensions.height / 100; // Tinggi maksimal dalam meter
  const newHeight = (maxHeight * newHeightPercentage) / 100; // Hitung tinggi baru sesuai persentase

  if (isNaN(newHeight)) {
    console.error(
      `❌ Invalid height computed: ${newHeight} for Rack ${rackNumber}`
    );
    return;
  }

  // 🎨 **Dapatkan warna berdasarkan powerValue**
  const newColor = interpolateColor(
    newHeightPercentage,
    0x00ff00,
    0xffff00,
    0xff0000
  );

  // 🔥 **Update tinggi objek dan warna material**
  rackObject.geometry.dispose(); // Hapus geometry lama
  rackObject.geometry = new THREE.BoxGeometry(
    0.55, // Lebar tetap
    newHeight, // Tinggi baru yang sudah tervalidasi
    rackDimensions.depth / 100 + 0.02 // Kedalaman tetap
  );

  // **Ubah warna material**
  rackObject.material.color.set(newColor);

  // **Atur ulang posisi agar objek hanya tumbuh ke atas**
  rackObject.position.y =
    rackDimensions.height / 200 - maxHeight / 2 + newHeight / 2 - 0.02;
};

const renderScene = async () => {
  const mappedRacks = await fetchRackData();
  if (!mappedRacks.length || !card.value) {
    console.error("No mapped rack data or card element is not available.");
    return;
  }

  scene = new THREE.Scene();

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight); // Atur ukuran renderer
  card.value.appendChild(renderer.domElement);

  camera = new THREE.PerspectiveCamera(
    75,
    card.value.clientWidth / card.value.clientHeight,
    0.1,
    1000
  );
  camera.position.set(-5, 5, 8);
  camera.fov = 50;
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.1;
  card.value.appendChild(renderer.domElement);
  scene.background = new THREE.Color(0xffffff);
  // Observer untuk memantau perubahan ukuran elemen card
  const resizeObserver = new ResizeObserver(() => {
    if (card.value) {
      const { clientWidth, clientHeight } = card.value;
      renderer.setSize(clientWidth, clientHeight);
      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
    }
  });
  resizeObserver.observe(card.value);

  // Pencahayaan
  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
  directionalLight.position.set(0, 5, 5);
  directionalLight.castShadow = true;

  scene.add(ambientLight, directionalLight);

  const container = createContainer();
  container.position.y = containerDimensions.height / 200;
  scene.add(container);

  const border = addEdgesToObject(container, 0x000000); // Warna hitam
  container.userData.edges = border; // Simpan referensi garis tepi
  scene.add(border); // Tambahkan garis tepi ke scene

  const partitionFront = createPartition(-450);
  const partitionFront1 = createPartition(-609.6);
  const partitionBack = createPartition(450);
  const partitionBack1 = createPartition(609.6);
  scene.add(partitionFront, partitionBack, partitionBack1, partitionFront1);

  // Rack Server dan Panel
  const framePanelFSS = createRec(-5.5, 1.75, -1, 0x000000, {
    width: 21,
    height: 25,
    depth: 50,
  });
  const panelFSS = createRec(-5.5, 1.5, -1, 0xff0000, {
    width: 20,
    height: 80,
    depth: 60,
  });
  const framePanelPower = createRec(5.65, 1.01, 0.6, 0x000000, {
    width: 102,
    height: 190,
    depth: 70,
  });
  const panelPower = createRec(5.65, 1.01, 0.6, 0xc3c4c5, {
    width: 100,
    height: 200,
    depth: 80,
  });
  const accessControl = createRec(-4.55, 1.2, -0.3, 0x0d542e, {
    width: 30,
    height: 20,
    depth: 8,
  });
  const openTray = createOpenTrayWithHoles(
    0,
    2.4,
    0,
    0x0077ff,
    { width: 1100, height: 10, depth: 30 },
    1.5,
    5
  );
  const partitionDoorCover1 = createRec(-3.8, 1, -0.7, 0x000000, {
    width: 100,
    height: 189,
    depth: 8,
  });
  const partitionDoorCover2 = createRec(3.8, 1, -0.7, 0x000000, {
    width: 100,
    height: 189,
    depth: 8,
  });
  const Polycarbonat1 = createRec(
    -3.8,
    2.25,
    -0.7,
    0xffffff,
    { width: 100, height: 60, depth: 8 },
    0.5
  );
  const Polycarbonat2 = createRec(
    3.8,
    2.25,
    -0.7,
    0xffffff,
    { width: 100, height: 60, depth: 8 },
    0.5
  );
  const Polycarbonat3 = createRec(
    0,
    2.25,
    -0.2,
    0xffffff,
    { width: 8, height: 60, depth: 770 },
    0.5
  );
  const securityDoor = createRec(-4.5, 1, 0.5, 0xffffff, {
    width: 100,
    height: 200,
    depth: 8,
  });
  const frontDoor = createRec(-6.1, 1, 0.5, 0xffffff, {
    width: 100,
    height: 200,
    depth: 8,
  });
  const backDoor = createRec(6.1, 1, -0.5, 0xffffff, {
    width: 100,
    height: 200,
    depth: 8,
  });
  const hornAlarm = createRec(
    -4.5,
    2.25,
    0.75,
    0xff0000,
    { width: 40, height: 15, depth: 10 },
    0.5
  );
  const buzzerAlarm = createRec(
    -4.5,
    2.25,
    0.25,
    0xff0000,
    { width: 15, height: 15, depth: 10 },
    0.5
  );
  const baseFloor = createRec(0, -0.165, 0, 0x000000, {
    width: 243.8,
    height: 30,
    depth: 1219.2,
  });

  scene.add(
    baseFloor,
    framePanelFSS,
    panelFSS,
    buzzerAlarm,
    hornAlarm,
    panelPower,
    framePanelPower,
    accessControl,
    openTray,
    partitionDoorCover1,
    partitionDoorCover2,
    Polycarbonat1,
    Polycarbonat2,
    Polycarbonat3,
    securityDoor
  );

  const containerCoverRight = createRec(4.35, 1.295, 1.225, 0xffffff, {
    width: 1,
    height: 259.1,
    depth: 350,
  });
  const containerCoverLeft = createRec(-4.35, 1.295, 1.225, 0xffffff, {
    width: 1,
    height: 259.1,
    depth: 350,
  });
  const containerCoverBot = createRec(0, 0.15, 1.225, 0xffffff, {
    width: 1,
    height: 30,
    depth: 520,
  });
  const containerCoverMid = createRec(
    0,
    1.3,
    1.225,
    0xffffff,
    { width: 1, height: 198, depth: 519 },
    0.1
  );
  const containerCoverTop = createRec(0, 2.45, 1.225, 0xffffff, {
    width: 1,
    height: 30,
    depth: 520,
  });

  // Tambahkan cover ke scene
  containerCovers = [
    containerCoverRight,
    containerCoverLeft,
    containerCoverBot,
    containerCoverMid,
    containerCoverTop,
    frontDoor,
    backDoor,
  ];
  containerCovers.forEach((cover) => {
    scene.add(cover); // Tambahkan objek cover ke scene

    // Tambahkan garis tepi (border) untuk setiap cover
    const border = addEdgesToObject(cover, 0x000000); // Warna garis hitam
    cover.userData.edges = border; // Simpan referensi garis tepi di userData
    scene.add(border); // Tambahkan garis tepi ke scene
  });

  // Tabung
  const cylinderWithFillet = createCylinderWithFillet(
    -4.75,
    0.01,
    -0.75,
    0xff0000,
    { radius: 20, height: 250 }
  );
  const smallCylinder = createCylinder(-4.75, 1.5, -0.75, 0xff0000, {
    radius: 3,
    height: 150,
  });
  const nozzle1 = createCylinder(-2, 2.1, -0.75, 0xff0000, {
    radius: 3,
    height: 30,
  });
  const nozzle2 = createCylinder(2, 2.1, -0.75, 0xff0000, {
    radius: 3,
    height: 30,
  });
  const horizontalCylinder = createHorizontalCylinder(
    -0.75,
    2.25,
    -0.75,
    0xff0000,
    { radius: 3, height: 800 }
  );
  const smoke1 = createCylinder(-2.5, 2.555, 0.5, 0xffffff, {
    radius: 8,
    height: 7,
  });
  const smoke2 = createCylinder(-1, 2.555, 0.5, 0xffffff, {
    radius: 8,
    height: 7,
  });
  const smoke3 = createCylinder(0.5, 2.555, 0.5, 0xffffff, {
    radius: 8,
    height: 7,
  });
  const smoke4 = createCylinder(2, 2.555, 0.5, 0xffffff, {
    radius: 8,
    height: 7,
  });
  const sensorSmoke1 = createCylinder(-2.5, 2.55, 0.5, 0x000000, {
    radius: 3,
    height: 7,
  });
  const sensorSmoke2 = createCylinder(-1, 2.55, 0.5, 0x000000, {
    radius: 3,
    height: 7,
  });
  const sensorSmoke3 = createCylinder(0.5, 2.55, 0.5, 0x000000, {
    radius: 3,
    height: 7,
  });
  const sensorSmoke4 = createCylinder(2, 2.55, 0.5, 0x000000, {
    radius: 3,
    height: 7,
  });

  scene.add(
    cylinderWithFillet,
    smallCylinder,
    nozzle1,
    nozzle2,
    horizontalCylinder,
    smoke1,
    smoke2,
    smoke3,
    smoke4,
    sensorSmoke1,
    sensorSmoke2,
    sensorSmoke3,
    sensorSmoke4
  );

  mappedRacks.forEach((rack, i) => {
    const positionX = -3.5 + i * 0.7;
    const positionY = rackDimensions.height / 200;
    const positionZ = -rackDimensions.depth / 200 - 0.5;

    // 🎯 **Render Frame Rack**
    const rackMesh = createRec(positionX, positionY, 0, 0x000000);
    rackMesh.name = `rack-${rack.rackNumber}`; // ✅ Tambahkan nama unik
    rackMesh.userData = {
      id: rack.id, // **Tambahkan ID rack ke userData**
      rackNumber: rack.rackNumber, // Nomor rack
    };
    scene.add(rackMesh);

    // Simpan referensi rack dan objek
    rackMeshes.value.push({ mesh: rackMesh, data: rack });
    // 🎯 **Render Label Front**
    const frontLabel = createRackLabel(
      { rackNumber: rack.rackNumber },
      positionX,
      positionY,
      -rackDimensions.depth / 200 - 0.4,
      i,
      "front"
    );
    scene.add(frontLabel);

    // 🎯 **Render Label Back**
    const backLabel = createRackLabel(
      { rackNumber: rack.rackNumber },
      positionX,
      positionY,
      rackDimensions.depth / 200 - 2.25,
      i,
      "back"
    );
    scene.add(backLabel);

    // 🎯 **Render Label Power**
    if (rack.powerTopic) {
      const powerLabel = createRackLabel(
        { rackNumber: rack.rackNumber },
        positionX,
        positionY,
        -rackDimensions.depth / 200 - 1.5,
        i,
        "power"
      );
      scene.add(powerLabel);
    }

    // 🎯 **Render Material Hijau (Default 0%)**
    const objectInsideRack = createObjectInsideRack(
      positionX,
      positionY,
      positionZ,
      0
    );
    objectInsideRack.name = `rack-${rack.rackNumber}-power`; // ✅ Tambahkan nama unik untuk power
    scene.add(objectInsideRack);
  });

  // Inisialisasi rotasi kamera (global)
  rotation = {
    azimuthAngle: Math.atan2(camera.position.x, camera.position.z), // Sudut azimuth dari posisi awal
    polarAngle: Math.acos(camera.position.y / camera.position.length()), // Sudut polar dari posisi awal
  };

  const animate = () => {
    requestAnimationFrame(animate);
    // Jalankan logika joystick hanya jika joystick sedang aktif
    if (joystickActive) {
      // Update rotasi kamera jika joystick bergerak
      rotation.azimuthAngle += movement.x * 0.05;
      rotation.polarAngle -= movement.y * 0.05;

      // Batasi sudut polar agar kamera tidak terbalik
      rotation.polarAngle = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, rotation.polarAngle)
      );

      // Perbarui posisi kamera berdasarkan joystick
      const radius = camera.position.length(); // Jarak kamera dari pusat
      const x =
        radius *
        Math.sin(rotation.polarAngle) *
        Math.sin(rotation.azimuthAngle);
      const y = radius * Math.cos(rotation.polarAngle);
      const z =
        radius *
        Math.sin(rotation.polarAngle) *
        Math.cos(rotation.azimuthAngle);

      camera.position.set(x, y, z);
      camera.lookAt(0, 0, 0);
    }

    if (controls) {
      controls.update();
    }

    renderer.render(scene, camera);
  };

  animate();
};

const originalMaterials = new Map();
const detailRackGroup = new THREE.Group(); // Group untuk menyimpan rack yang muncul saat zoom

const resetView = () => {
  if (!isZoomedIn.value) return;

  isZoomedIn.value = false;

  // Hapus rack detail
  scene.remove(detailRackGroup);
  detailRackGroup.clear();

  // Kembalikan warna rack yang diklik ke warna semula
  if (selectedRack.value) {
    selectedRack.value.material.color.set(
      originalMaterials.get(selectedRack.value)
    );
  }

  // Hapus referensi rack yang dipilih
  selectedRack.value = null;

  // Nonaktifkan event listener sementara
  card.value.removeEventListener("click", onRackClick);

  // Animasi kamera kembali ke posisi awal
  animateCamera(originalCameraPosition, () => {
    // Tampilkan kembali semua objek setelah animasi selesai
    showAllObjects();

    // **Tambahkan kembali event listener setelah reset selesai**
    setTimeout(() => {
      card.value.addEventListener("click", onRackClick);
    }, 500); // Delay kecil untuk memastikan animasi selesai
  });
};

// Fungsi untuk menyembunyikan semua objek kecuali rack yang diklik
const hideAllObjectsExceptSelectedRack = (selectedRackMesh) => {
  scene.children.forEach((obj) => {
    if (obj !== selectedRackMesh) {
      obj.visible = false;
    }
  });
};

// Fungsi untuk menampilkan kembali semua objek
const showAllObjects = () => {
  scene.children.forEach((obj) => {
    obj.visible = true;
  });
};

// Fungsi untuk membuat rack 3D yang muncul saat zoom-in (Selalu di Tengah)
const createDetailedRack = (rackMesh) => {
  const rackWidth = 1;
  const rackHeight = 2.2;
  const rackDepth = 0.8;

  // Buat Rack 3D Baru
  const detailedRack = new THREE.Mesh(
    new THREE.BoxGeometry(rackWidth, rackHeight, rackDepth),
    new THREE.MeshStandardMaterial({ color: 0xff0000 })
  );

  // **Atur posisi rack ke tengah scene (0, 1.1, 0)**
  detailedRack.position.set(0, -0.5, 0);
  detailedRack.name = "detailed-rack";

  // Label di atas rack
  const rackLabel = new Text();
  rackLabel.text = `Rack ${rackMesh.userData.rackNumber}`;
  rackLabel.fontSize = 0.2;
  rackLabel.color = 0x000000;
  rackLabel.position.set(0, 2.3, 0);
  rackLabel.anchorX = "center";
  rackLabel.anchorY = "middle";
  rackLabel.sync();

  detailRackGroup.add(detailedRack);
  detailRackGroup.add(rackLabel);
  scene.add(detailRackGroup);
};

import { useRouter } from "vue-router";
// Fungsi saat rack diklik
const onRackClick = (event) => {
  if (isZoomedIn.value) return;

  const rect = card.value.getBoundingClientRect();
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects(
    rackMeshes.value.map((r) => r.mesh)
  );

  if (intersects.length > 0) {
    const clickedRack = intersects[0].object;
    const rackInfo = rackMeshes.value.find((r) => r.mesh === clickedRack)?.data;
    const rackId = clickedRack.userData.id; // Ambil ID dari userData
    if (rackInfo) {
      window.location.href = `#/rackdetail/${rackId}`; // Redirect ke halaman testpage/{id}
    }
  }
};
</script>
