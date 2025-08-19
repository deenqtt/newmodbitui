// File: components/widgets/Container3d/Container3dWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
// --- Gantilah path ini dengan path yang benar ke hook useMqtt kamu ---
import { useMqtt } from "@/contexts/MqttContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Eye,
  EyeOff,
  Move3D,
  RotateCcw,
  Loader2,
  AlertTriangle,
  Wifi,
  WifiOff,
  Maximize2,
  Minimize2,
  Thermometer,
  Zap,
  DoorOpen,
  DoorClosed,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Text } from "troika-three-text";
import gsap from "gsap";

// --- Tipe Data untuk Konfigurasi ---
interface ConfigData {
  customName: string;
  topicsTemp: [string[], string[]]; // [ [frontTopics], [backTopics] ]
  topicPower: string;
}

interface Props {
  config: ConfigData;
}

interface RackData {
  temp: string;
  hum: string;
}

export const Container3dWidget = ({ config }: Props) => {
  // --- Gunakan Context MQTT ---
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();

  // --- State untuk UI dan Status ---
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  // --- State untuk kontrol fisik (dari MQTT) ---
  const [frontDoorStatus, setFrontDoorStatus] = useState<boolean>(true); // true = closed
  const [backDoorStatus, setBackDoorStatus] = useState<boolean>(true); // true = closed
  const [solenoidStatus, setSolenoidStatus] = useState<boolean>(false); // true = activated (open ceiling)

  // --- Refs untuk Three.js dan DOM ---
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // --- Refs untuk objek Three.js yang dinamis ---
  const frontDoorsRef = useRef<THREE.Mesh[]>([]);
  const backDoorsRef = useRef<THREE.Mesh[]>([]);
  const ceilingPartsRef = useRef<THREE.Group[]>([]);
  const rackLabelsRef = useRef<{ front: Text; back: Text; power: Text }[]>([]);
  const powerRackMeshRef = useRef<THREE.Mesh | null>(null);
  const containerMeshRef = useRef<THREE.Mesh | null>(null);
  const containerCoversRef = useRef<THREE.Mesh[]>([]);
  const initialMaterialsRef = useRef<(THREE.Material | null)[]>([]); // Untuk reset panel

  // --- State untuk data dari MQTT ---
  const [rackValues, setRackValues] = useState<Record<number, RackData>>({});
  const powerValueRef = useRef<string | number>("N/A");

  // --- Dimensi (dari kode Vue) ---
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

  // --- Validasi config awal ---
  useEffect(() => {
    if (
      !config.customName ||
      !Array.isArray(config.topicsTemp) ||
      config.topicsTemp.length < 1 ||
      !Array.isArray(config.topicsTemp[0])
    ) {
      setStatus("error");
      setErrorMessage("Configuration is incomplete or invalid.");
      return;
    }
    setStatus("ok");
  }, [config]);

  // --- MQTT Subscription dan Message Handling ---
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        console.log(
          `[Container3D] Received MQTT message on ${receivedTopic}:`,
          payload
        );

        // --- Handle Power Topic ---
        if (receivedTopic === config.topicPower) {
          if (payload.value !== undefined) {
            const powerValue = parseFloat(payload.value);
            if (!isNaN(powerValue)) {
              powerValueRef.current = powerValue.toFixed(2);
              updatePowerRackVisualization(powerValue);
            } else {
              powerValueRef.current = payload.value; // Simpan string jika tidak bisa di-parse
            }
          }
          return; // Selesai untuk topik power
        }

        // --- Handle Temperature/Humidity Topics ---
        const [frontTopics, backTopics] = config.topicsTemp;
        let rackIndex = -1;
        let isFront = false;

        // Cek apakah topik ini adalah topik front
        const frontIndex = frontTopics.indexOf(receivedTopic);
        if (frontIndex !== -1) {
          rackIndex = frontIndex;
          isFront = true;
        } else {
          // Cek apakah topik ini adalah topik back
          const backIndex = backTopics.indexOf(receivedTopic);
          if (backIndex !== -1) {
            rackIndex = backIndex;
            isFront = false;
          }
        }

        // Jika topik cocok dengan salah satu rack
        if (rackIndex !== -1) {
          try {
            // Asumsi payload.value adalah string JSON
            const rackData =
              typeof payload.value === "string"
                ? JSON.parse(payload.value)
                : payload.value || {};

            const temp = rackData.temp ?? "N/A";
            const hum = rackData.hum ?? "N/A";

            setRackValues((prev) => ({
              ...prev,
              [rackIndex + 1]: { temp, hum },
            }));

            // Update label teks dan warna
            updateRackLabel(rackIndex, temp, hum);
          } catch (parseError) {
            console.error(
              `[Container3D] Failed to parse rack data for rack ${
                rackIndex + 1
              }:`,
              parseError,
              payload.value
            );
          }
        }
      } catch (error) {
        console.error(
          "[Container3D] Failed to parse MQTT payload:",
          error,
          payloadString
        );
      }
    },
    [config.topicPower, config.topicsTemp] // Dependency hanya pada config topics
  );

  useEffect(() => {
    if (status !== "ok" || !isReady || connectionStatus !== "Connected") return;

    const [frontTopics, backTopics] = config.topicsTemp;
    const allTopics = [
      ...frontTopics.filter((t) => t),
      ...backTopics.filter((t) => t),
      config.topicPower,
    ].filter((t) => t); // Filter out empty strings

    console.log("[Container3D] Subscribing to topics:", allTopics);

    allTopics.forEach((topic) => {
      if (topic) {
        subscribe(topic, handleMqttMessage);
      }
    });

    return () => {
      console.log("[Container3D] Unsubscribing from topics:", allTopics);
      allTopics.forEach((topic) => {
        if (topic) {
          unsubscribe(topic, handleMqttMessage);
        }
      });
    };
  }, [
    config.topicsTemp,
    config.topicPower,
    status,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // --- Fungsi bantuan Three.js ---
  const addEdgesToObject = useCallback(
    (object: THREE.Object3D, color: number, yOffset: number = 0) => {
      if (!(object as THREE.Mesh).isMesh) return null;
      const mesh = object as THREE.Mesh;
      const edgesGeometry = new THREE.EdgesGeometry(mesh.geometry);
      const line = new THREE.LineSegments(
        edgesGeometry,
        new THREE.LineBasicMaterial({ color, transparent: true, opacity: 1 })
      );
      line.position.copy(mesh.position);
      line.position.y += yOffset;
      line.rotation.copy(mesh.rotation);
      line.scale.copy(mesh.scale);
      line.userData.parentMesh = mesh;
      return line;
    },
    []
  );

  const createContainer = useCallback(() => {
    const geometry = new THREE.BoxGeometry(
      containerDimensions.length / 100,
      containerDimensions.height / 100,
      containerDimensions.width / 100
    );
    const materials: (THREE.Material | null)[] = [
      new THREE.MeshStandardMaterial({
        color: 0xe3e3e3,
        side: THREE.DoubleSide,
      }), // Depan
      new THREE.MeshStandardMaterial({
        color: 0xe3e3e3,
        side: THREE.DoubleSide,
      }), // Belakang
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      }), // Atas
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      }), // Bawah
      null, // Kiri (akan dibuka/ditutup)
      new THREE.MeshStandardMaterial({
        color: 0xe3e3e3,
        side: THREE.DoubleSide,
      }), // Kanan
    ];
    // @ts-ignore - Simpan material awal untuk reset
    initialMaterialsRef.current = materials.map((m) => (m ? m.clone() : null));
    const containerMesh = new THREE.Mesh(geometry, materials);
    containerMesh.position.y = containerDimensions.height / 200;
    containerMesh.name = "container";
    return containerMesh;
  }, [containerDimensions]);

  const createRack = useCallback(
    (
      positionX: number,
      positionY: number,
      positionZ: number,
      index: number
    ) => {
      const geometry = new THREE.BoxGeometry(
        rackDimensions.width / 100,
        rackDimensions.height / 100,
        rackDimensions.depth / 100
      );
      const material = new THREE.MeshStandardMaterial({ color: 0x000000 });
      const rackMesh = new THREE.Mesh(geometry, material);
      rackMesh.position.set(positionX, positionY, positionZ);
      rackMesh.rotation.y = Math.PI / 2;
      rackMesh.name = `rack-${index + 1}`;
      rackMesh.castShadow = true;
      rackMesh.receiveShadow = true;
      return rackMesh;
    },
    [rackDimensions]
  );

  const createRackLabel = useCallback(
    (
      rackNumber: number,
      positionX: number,
      positionY: number,
      positionZ: number
    ) => {
      const createText = (
        text: string,
        fontSize: number = 0.15,
        color: number = 0xffffff
      ) => {
        const label = new Text();
        label.text = text;
        label.fontSize = fontSize;
        label.color = color;
        label.anchorX = "center";
        label.anchorY = "middle";
        // @ts-ignore - sync akan dipanggil setelah ditambahkan
        label.sync();
        return label;
      };

      const rackNameLabel = createText(`Rack ${rackNumber}`, 0.15);
      const valueLabel = createText("Temp: N/A\nHum: N/A", 0.1);
      const powerLabel = createText(`Power: ${powerValueRef.current}`, 0.1);

      const group = new THREE.Group();
      group.position.set(positionX, positionY, positionZ);
      group.name = `rack-${rackNumber}-label-group`;

      rackNameLabel.position.set(0, 0.1, 0);
      valueLabel.position.set(0, -0.1, 0);
      powerLabel.position.set(0, -0.3, 0);

      group.add(rackNameLabel);
      group.add(valueLabel);
      group.add(powerLabel);

      sceneRef.current?.add(group); // Tambahkan grup ke scene

      return { group, rackNameLabel, valueLabel, powerLabel };
    },
    []
  );

  const createObjectInsideRack = useCallback(
    (positionX: number, positionY: number, positionZ: number) => {
      const geometry = new THREE.BoxGeometry(0.8, 0.1, 0.4); // Tinggi awal 0.1
      const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const object = new THREE.Mesh(geometry, material);
      object.position.set(positionX, positionY - 0.8, positionZ);
      object.name = `power-rack-object`;
      object.castShadow = true;
      return object;
    },
    []
  );

  const createContainerCovers = useCallback(() => {
    const covers: THREE.Mesh[] = [];
    const commonMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

    const containerCoverRight = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 2.59, 1.22),
      commonMaterial
    );
    containerCoverRight.position.set(6.1, 1.3, 0);
    containerCoverRight.name = "cover-right";
    covers.push(containerCoverRight);

    const containerCoverLeft = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 2.59, 1.22),
      commonMaterial
    );
    containerCoverLeft.position.set(-6.1, 1.3, 0);
    containerCoverLeft.name = "cover-left";
    covers.push(containerCoverLeft);

    const containerCoverBot = new THREE.Mesh(
      new THREE.BoxGeometry(12.19, 0.3, 1.225),
      commonMaterial
    );
    containerCoverBot.position.set(0, 0.15, 0);
    containerCoverBot.name = "cover-bottom";
    covers.push(containerCoverBot);

    const containerCoverMid = new THREE.Mesh(
      new THREE.BoxGeometry(12.19, 1.98, 1.225),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.1,
      })
    );
    containerCoverMid.position.set(0, 1.3, 0);
    containerCoverMid.name = "cover-middle";
    covers.push(containerCoverMid);

    const containerCoverTop = new THREE.Mesh(
      new THREE.BoxGeometry(12.19, 0.3, 1.225),
      commonMaterial
    );
    containerCoverTop.position.set(0, 2.45, 0);
    containerCoverTop.name = "cover-top";
    covers.push(containerCoverTop);

    const frontDoor = new THREE.Mesh(
      new THREE.BoxGeometry(12.19, 2.59, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0xadd8e6,
        transparent: true,
        opacity: 0.5,
      })
    );
    frontDoor.position.set(0, 1.3, 0.62);
    frontDoor.name = "door-front";
    covers.push(frontDoor);

    const backDoor = new THREE.Mesh(
      new THREE.BoxGeometry(12.19, 2.59, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0xadd8e6,
        transparent: true,
        opacity: 0.5,
      })
    );
    backDoor.position.set(0, 1.3, -0.62);
    backDoor.name = "door-back";
    covers.push(backDoor);

    return covers;
  }, []);

  // --- Fungsi Update Visual dari Data ---
  const updateRackLabel = useCallback(
    (rackIndex: number, temp: string | number, hum: string | number) => {
      const labels = rackLabelsRef.current[rackIndex];
      if (labels && labels.valueLabel) {
        labels.valueLabel.text = `Temp: ${temp}\nHum: ${hum}`;
        // @ts-ignore
        labels.valueLabel.sync();

        // Update warna teks berdasarkan nilai
        let textColor = 0xffffff; // Default putih
        const tempNum = Number(temp);
        if (!isNaN(tempNum)) {
          if (tempNum > 40) {
            textColor = 0xff0000; // Merah
          } else if (tempNum > 30) {
            textColor = 0xffff00; // Kuning
          }
        }
        labels.valueLabel.color = textColor;
        // @ts-ignore
        labels.valueLabel.sync();
      }
    },
    []
  );

  const updatePowerRackVisualization = useCallback((powerValue: number) => {
    const maxHeight = 0.1; // Tinggi maksimal objek dalam meter
    const minHeight = 0.01; // Tinggi minimal
    const normalizedValue = Math.min(100, Math.max(0, powerValue)); // Clamp antara 0-100
    const scaleZ =
      minHeight + (normalizedValue / 100) * (maxHeight - minHeight);

    if (powerRackMeshRef.current) {
      gsap.to(powerRackMeshRef.current.scale, {
        z: scaleZ,
        duration: 0.5,
        ease: "power2.out",
      });
    }
  }, []);

  const updatePowerLabel = useCallback(() => {
    // Update label power di semua rack (asumsi hanya satu)
    rackLabelsRef.current.forEach((labels) => {
      if (labels.powerLabel) {
        labels.powerLabel.text = `Power: ${powerValueRef.current}`;
        // @ts-ignore
        labels.powerLabel.sync();
      }
    });
  }, []);

  useEffect(() => {
    updatePowerLabel();
  }, [updatePowerLabel]); // Jalankan saat powerValueRef berubah (tidak otomatis, jadi perlu trigger manual jika perlu)

  // --- Fungsi Interaksi dan Animasi ---
  const showAlert = (message: string) => {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(""), 3000);
  };

  const animateDoors = useCallback(() => {
    const targetFrontX = frontDoorStatus ? 0.0 : 0.5;
    const targetBackX = backDoorStatus ? 0.0 : -0.5;

    frontDoorsRef.current.forEach((door) => {
      if (Math.abs(door.position.x - targetFrontX) > 0.01) {
        door.position.x += (targetFrontX - door.position.x) * 0.1;
      }
    });

    backDoorsRef.current.forEach((door) => {
      if (Math.abs(door.position.x - targetBackX) > 0.01) {
        door.position.x += (targetBackX - door.position.x) * 0.1;
      }
    });
  }, [frontDoorStatus, backDoorStatus]);

  const animateCeiling = useCallback(() => {
    const targetRotation = solenoidStatus ? Math.PI / 2 : 0;
    ceilingPartsRef.current.forEach((pivot) => {
      if (Math.abs(pivot.rotation.z - targetRotation) > 0.01) {
        pivot.rotation.z += (targetRotation - pivot.rotation.z) * 0.05;
      }
    });
  }, [solenoidStatus]);

  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
    const { clientWidth, clientHeight } = mountRef.current;
    cameraRef.current.aspect = clientWidth / clientHeight;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(clientWidth, clientHeight);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, []);

  // --- Fungsi untuk mengontrol tampilan panel ---
  const toggleLeftCover = useCallback(() => {
    if (!containerMeshRef.current) return;
    // @ts-ignore
    if (
      containerMeshRef.current.material &&
      containerMeshRef.current.material[4]
    ) {
      // @ts-ignore
      const leftMaterial = containerMeshRef.current.material[4];
      leftMaterial.visible = !leftMaterial.visible;
    }
    const leftCover = containerCoversRef.current.find(
      (c) => c.name === "cover-left"
    );
    if (leftCover) {
      leftCover.visible = !leftCover.visible;
      if (leftCover.userData.edges) {
        leftCover.userData.edges.visible = leftCover.visible;
      }
    }
  }, []);

  const removeAllPanels = useCallback(() => {
    if (!containerMeshRef.current) return;
    // @ts-ignore
    containerMeshRef.current.material.forEach(
      (mat: THREE.Material | null, index: number) => {
        if (mat && index !== 3) {
          // Jangan sembunyikan bagian bawah
          mat.visible = false;
        }
      }
    );
    if (containerMeshRef.current.userData.edges) {
      sceneRef.current?.remove(containerMeshRef.current.userData.edges);
    }
    containerCoversRef.current.forEach((cover) => {
      cover.visible = false;
      if (cover.userData.edges) {
        sceneRef.current?.remove(cover.userData.edges);
      }
    });
  }, []);

  const restoreAllPanels = useCallback(() => {
    if (!containerMeshRef.current || initialMaterialsRef.current.length === 0)
      return;
    // @ts-ignore
    containerMeshRef.current.material = initialMaterialsRef.current.map((m) =>
      m ? m.clone() : null
    );

    if (containerMeshRef.current.userData.edges) {
      sceneRef.current?.remove(containerMeshRef.current.userData.edges);
    }
    const border = addEdgesToObject(containerMeshRef.current, 0x000000, 0.05);
    if (border) {
      sceneRef.current?.add(border);
      containerMeshRef.current.userData.edges = border;
    }

    containerCoversRef.current.forEach((cover) => {
      cover.visible = true;
      if (!cover.userData.edges) {
        const edges = addEdgesToObject(cover, 0x000000, 0.05);
        if (edges) {
          sceneRef.current?.add(edges);
          cover.userData.edges = edges;
        }
      } else {
        sceneRef.current?.add(cover.userData.edges);
        cover.userData.edges.visible = true;
      }
    });
  }, [addEdgesToObject]);

  // --- Fungsi untuk mengatur kamera ---
  const setView = useCallback(
    (view: "front" | "back" | "top" | "side") => {
      if (!cameraRef.current || !controlsRef.current || isAnimating) return;

      setIsAnimating(true);
      let targetPosition: THREE.Vector3;

      switch (view) {
        case "front":
          targetPosition = new THREE.Vector3(-5, 0, 0);
          break;
        case "back":
          targetPosition = new THREE.Vector3(5, 0, 0);
          break;
        case "top":
          targetPosition = new THREE.Vector3(0, 4, 0);
          break;
        case "side":
          targetPosition = new THREE.Vector3(0, 0, -5);
          break;
        default:
          setIsAnimating(false);
          return;
      }

      const startPosition = cameraRef.current.position.clone();
      const startTime = Date.now();
      const duration = 1000;

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const easeInOutCubic =
          t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

        cameraRef.current!.position.lerpVectors(
          startPosition,
          targetPosition,
          easeInOutCubic
        );
        cameraRef.current!.lookAt(0, 0, 0);

        if (rendererRef.current && sceneRef.current && cameraRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current);
        }

        if (t < 1) {
          requestAnimationFrame(animate);
        } else {
          controlsRef.current!.target.set(0, 0, 0);
          controlsRef.current!.update();
          setIsAnimating(false);
        }
      };

      animate();
    },
    [isAnimating]
  );

  const resetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || isAnimating) return;

    setIsAnimating(true);
    const startPosition = cameraRef.current.position.clone();
    const targetPosition = new THREE.Vector3(-5, 4, 2); // Posisi awal dari Vue
    const startTime = Date.now();
    const duration = 1000;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const easeInOutCubic =
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

      cameraRef.current!.position.lerpVectors(
        startPosition,
        targetPosition,
        easeInOutCubic
      );
      cameraRef.current!.lookAt(0, 0, 0);

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        controlsRef.current!.target.set(0, 0, 0);
        controlsRef.current!.update();
        setIsAnimating(false);
      }
    };

    animate();
  }, [isAnimating]);

  // --- Fungsi untuk membuat scene Three.js ---
  const createScene = useCallback(() => {
    if (!mountRef.current || status !== "ok") return () => {};

    console.log("[Container3D] Initializing 3D scene...");

    // Bersihkan scene sebelumnya jika ada
    if (sceneRef.current) {
      console.warn("[Container3D] Scene already exists, cleaning up...");
      // Implementasi pembersihan penuh jika diperlukan
    }

    // Reset refs
    frontDoorsRef.current = [];
    backDoorsRef.current = [];
    ceilingPartsRef.current = [];
    rackLabelsRef.current = [];

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const { clientWidth, clientHeight } = mountRef.current;
    const camera = new THREE.PerspectiveCamera(
      50,
      clientWidth / clientHeight,
      0.1,
      1000
    );
    camera.position.set(-5, 4, 2); // Posisi awal dari Vue
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(clientWidth, clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // 2. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    // 3. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(0, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // 4. Objek 3D - Container
    const containerMesh = createContainer();
    scene.add(containerMesh);
    containerMeshRef.current = containerMesh;

    const border = addEdgesToObject(containerMesh, 0x000000, 0.05);
    if (border) {
      scene.add(border);
      containerMesh.userData.edges = border;
    }

    // 5. Objek 3D - Container Covers
    const containerCovers = createContainerCovers();
    containerCoversRef.current = containerCovers;
    containerCovers.forEach((cover) => {
      scene.add(cover);
      const coverBorder = addEdgesToObject(cover, 0x000000, 0.05);
      if (coverBorder) {
        scene.add(coverBorder);
        cover.userData.edges = coverBorder;
      }
    });

    // 6. Objek 3D - Racks & Labels
    const [frontTopics] = config.topicsTemp;
    const totalRacks = frontTopics.length;

    for (let i = 0; i < totalRacks; i++) {
      const positionX = -5.5 + i * 1.2; // Sesuaikan spacing
      const positionY = rackDimensions.height / 200;
      const positionZ = 0;

      // Rack
      const rackMesh = createRack(positionX, positionY, positionZ, i);
      scene.add(rackMesh);

      // Front Door (bagian dari rack untuk animasi)
      const frontDoorGeometry = new THREE.BoxGeometry(
        rackDimensions.width / 100 - 0.02,
        rackDimensions.height / 100,
        0.03
      );
      const frontDoor = new THREE.Mesh(
        frontDoorGeometry,
        new THREE.MeshStandardMaterial({
          color: 0x4444ff,
          opacity: 0.7,
          transparent: true,
        })
      );
      frontDoor.position.set(positionX, positionY, 0.1);
      frontDoor.userData = { position: "front", rackIndex: i };
      scene.add(frontDoor);
      frontDoorsRef.current.push(frontDoor);

      // Back Door
      const backDoorGeometry = new THREE.BoxGeometry(
        rackDimensions.width / 100 - 0.02,
        rackDimensions.height / 100,
        0.03
      );
      const backDoor = new THREE.Mesh(
        backDoorGeometry,
        new THREE.MeshStandardMaterial({
          color: 0x4444ff,
          opacity: 0.7,
          transparent: true,
        })
      );
      backDoor.position.set(positionX, positionY, -1.2);
      backDoor.userData = { position: "back", rackIndex: i };
      scene.add(backDoor);
      backDoorsRef.current.push(backDoor);

      // Labels
      const frontLabelPosZ = -rackDimensions.depth / 200 - 0.4;
      const backLabelPosZ = rackDimensions.depth / 200 + 0.4;
      const powerLabelPosZ = -rackDimensions.depth / 200 - 0.8;

      const frontLabelObj = createRackLabel(
        i + 1,
        positionX,
        positionY + 0.8,
        frontLabelPosZ
      );
      const backLabelObj = createRackLabel(
        i + 1,
        positionX,
        positionY + 0.8,
        backLabelPosZ
      );
      const powerLabelObj = createRackLabel(
        i + 1,
        positionX,
        positionY + 0.8,
        powerLabelPosZ
      );

      rackLabelsRef.current.push({
        front: {
          rackNameLabel: frontLabelObj.rackNameLabel,
          valueLabel: frontLabelObj.valueLabel,
          powerLabel: frontLabelObj.powerLabel,
        },
        back: {
          rackNameLabel: backLabelObj.rackNameLabel,
          valueLabel: backLabelObj.valueLabel,
          powerLabel: backLabelObj.powerLabel,
        },
        power: {
          rackNameLabel: powerLabelObj.rackNameLabel,
          valueLabel: powerLabelObj.valueLabel,
          powerLabel: powerLabelObj.powerLabel,
        },
      });

      // Object Inside Rack (Power Visualization) - hanya untuk rack pertama sebagai contoh
      if (i === 0) {
        const powerObject = createObjectInsideRack(
          positionX,
          positionY,
          powerLabelPosZ - 0.3
        );
        scene.add(powerObject);
        powerRackMeshRef.current = powerObject;
      }
    }

    // 7. Objek 3D - Ceiling
    const createSplitCeiling = () => {
      const ceilingGroup = new THREE.Group();
      const topCoverWidth = totalRacks * 0.68; // Sesuaikan
      const topCoverDepth = 2.8; // Sesuaikan
      const lineSpacing = topCoverWidth / totalRacks;

      for (let i = 0; i < totalRacks; i++) {
        const partWidth = lineSpacing - 0.02;
        const geometry = new THREE.BoxGeometry(partWidth, 0.02, topCoverDepth);
        const material = new THREE.MeshStandardMaterial({
          color: 0x333333,
          opacity: 0.8,
          transparent: true,
        });

        const ceilingPart = new THREE.Mesh(geometry, material);
        const pivot = new THREE.Group();
        pivot.add(ceilingPart);

        ceilingPart.position.x = partWidth / 2;
        pivot.position.set(-topCoverWidth / 2 + i * lineSpacing, 1.0, 0);

        ceilingGroup.add(pivot);
        ceilingPartsRef.current.push(pivot);
      }
      return ceilingGroup;
    };
    const ceilingGroup = createSplitCeiling();
    scene.add(ceilingGroup);

    // --- Event Listeners ---
    const handleResizeInternal = () => handleResize();
    if (mountRef.current) {
      resizeObserverRef.current = new ResizeObserver(handleResizeInternal);
      resizeObserverRef.current.observe(mountRef.current);
    }

    // --- Animation Loop ---
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      updatePowerLabel(); // Update power label setiap frame
      animateDoors();
      animateCeiling();

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    window.addEventListener("resize", handleResizeInternal);

    // --- Cleanup Function ---
    return () => {
      console.log("[Container3D] Cleaning up 3D scene...");
      window.removeEventListener("resize", handleResizeInternal);
      if (resizeObserverRef.current && mountRef.current) {
        resizeObserverRef.current.unobserve(mountRef.current);
      }
      cancelAnimationFrame(animationRef.current);

      // Dispose Three.js objects
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      sceneRef.current?.traverse((child) => {
        // Gunakan optional chaining untuk keamanan tambahan
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose();

          // --- PERBAIKAN DI SINI ---
          if (mesh.material) {
            if (Array.isArray(mesh.material)) {
              // Iterasi dan dispose setiap material yang bukan null/undefined
              mesh.material.forEach((m) => {
                if (m && typeof (m as any).dispose === "function") {
                  // <-- Cek keberadaan m dan method dispose
                  (m as any).dispose();
                }
              });
            } else {
              // Dispose material tunggal jika bukan null/undefined
              if (typeof (mesh.material as any).dispose === "function") {
                // <-- Cek method dispose
                (mesh.material as any).dispose();
              }
            }
          }
        }
        // --- AKHIR PERBAIKAN ---

        // Dispose Text objects
        if (child instanceof Text) {
          child.dispose();
        }
      });
    };
  }, [
    status,
    config.topicsTemp,
    handleResize,
    addEdgesToObject,
    createContainer,
    createContainerCovers,
    createRack,
    createRackLabel,
    createObjectInsideRack,
    updatePowerLabel,
    animateDoors,
    animateCeiling,
  ]);

  // --- Inisialisasi Scene ---
  useEffect(() => {
    const cleanupFn = createScene();
    return cleanupFn;
  }, [createScene]);

  // --- UI Components ---
  const getConnectionStatus = () => {
    const isConnected = connectionStatus === "Connected";
    return {
      icon: isConnected ? Wifi : WifiOff,
      color: isConnected ? "text-emerald-500" : "text-red-500",
      bgColor: isConnected ? "bg-emerald-50" : "bg-red-50",
      text: isConnected ? "Connected" : "Disconnected",
    };
  };

  const renderLoadingSkeleton = () => (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden">
      <div className="flex flex-col items-center space-y-6 z-10">
        <div className="relative">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-ping opacity-30 w-20 h-20" />
          <div className="relative bg-white rounded-full p-4 shadow-xl border-4 border-blue-100">
            <Move3D className="h-12 w-12 text-blue-500 animate-bounce" />
          </div>
        </div>
        <div className="text-center space-y-3">
          <div className="flex items-center space-x-2">
            <div className="h-3 w-3 bg-blue-400 rounded-full animate-bounce" />
            <div
              className="h-3 w-3 bg-purple-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="h-3 w-3 bg-pink-400 rounded-full animate-bounce"
              style={{ animationDelay: "0.4s" }}
            />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-40 bg-slate-200 rounded-full animate-pulse" />
            <div className="h-3 w-32 bg-slate-200 rounded-full animate-pulse mx-auto" />
          </div>
        </div>
      </div>
    </div>
  );

  const renderErrorState = () => (
    <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center p-6">
      <div className="text-center space-y-6 max-w-sm">
        <div className="relative mx-auto w-20 h-20">
          <div className="absolute inset-0 bg-red-200 rounded-full animate-ping opacity-50" />
          <div className="relative bg-white rounded-full p-4 shadow-xl border-4 border-red-200">
            <AlertTriangle className="h-12 w-12 text-red-500 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          <h3 className="text-xl font-bold text-red-800">
            Configuration Error
          </h3>
          <p className="text-sm text-red-600 leading-relaxed">{errorMessage}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="border-red-300 text-red-700 hover:bg-red-50"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (status === "loading") {
      return renderLoadingSkeleton();
    }

    if (status === "error") {
      return renderErrorState();
    }

    const connectionInfo = getConnectionStatus();
    const ConnectionIcon = connectionInfo.icon;

    return (
      <div className="relative w-full h-full group">
        {/* 3D Viewport */}
        <div
          ref={mountRef}
          className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner"
        />

        {/* Alert Message */}
        {alertMessage && (
          <div className="absolute bottom-0 left-0 m-3 z-20">
            <div className="alert alert-info bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg">
              {alertMessage}
            </div>
          </div>
        )}

        {/* Controls */}
        {showControls && (
          <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
            <div className="flex gap-1 bg-white/80 backdrop-blur-md rounded-lg p-1 shadow-lg border border-white/20">
              {[
                { label: "Front", action: () => setView("front") },
                { label: "Back", action: () => setView("back") },
                { label: "Top", action: () => setView("top") },
                { label: "Side", action: () => setView("side") },
              ].map((item) => (
                <Button
                  key={item.label}
                  size="sm"
                  variant="ghost"
                  onClick={item.action}
                  disabled={isAnimating}
                  className="h-8 px-3 text-xs font-medium hover:bg-white/60 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                >
                  {item.label}
                </Button>
              ))}
              <div className="w-px bg-gray-300 mx-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={resetView}
                disabled={isAnimating}
                className="h-8 w-8 p-0 hover:bg-white/60 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                title="Reset View"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
              <div className="w-px bg-gray-300 mx-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={removeAllPanels}
                className="h-8 px-3 text-xs font-medium text-red-500 hover:bg-red-50 transition-all duration-200 hover:scale-105"
                title="Remove All Panels"
              >
                Remove Cover
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute top-4 right-4 flex gap-2 z-10">
          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 bg-white/90 backdrop-blur-xl hover:bg-white/95 transition-all duration-200 hover:scale-110 shadow-xl border border-white/30 rounded-xl"
            onClick={() => setShowControls(!showControls)}
            title={showControls ? "Hide Controls" : "Show Controls"}
          >
            {showControls ? (
              <EyeOff className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="h-10 w-10 p-0 bg-white/90 backdrop-blur-xl hover:bg-white/95 transition-all duration-200 hover:scale-110 shadow-xl border border-white/30 rounded-xl"
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Status Panel */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/30">
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <Thermometer className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-600">Temp</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-4 w-4 text-yellow-500" />
                <span className="text-xs text-gray-600">Power</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    frontDoorStatus && backDoorStatus
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-xs text-gray-600">Doors</span>
              </div>
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    solenoidStatus ? "bg-orange-500" : "bg-gray-400"
                  }`}
                />
                <span className="text-xs text-gray-600">Ceiling</span>
              </div>
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-xl px-4 py-3 rounded-xl shadow-xl border border-white/30 flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse shadow-lg" />
            <div>
              <div className="text-sm font-semibold text-gray-800">
                {config.customName}
              </div>
              <div className="text-xs text-gray-500">
                {config.topicsTemp[0].length} Racks
              </div>
            </div>
          </div>
        </div>

        {/* Loading Animation Overlay */}
        {isAnimating && (
          <div className="absolute inset-0 bg-black/20 rounded-xl flex items-center justify-center z-30 backdrop-blur-sm">
            <div className="bg-white/95 backdrop-blur-xl px-6 py-4 rounded-2xl shadow-2xl border border-white/40 flex items-center space-x-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
              <span className="text-sm font-semibold text-gray-700">
                Transitioning View...
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card
      className={`w-full h-full flex flex-col transition-all duration-500 ${
        isFullscreen
          ? "fixed inset-4 z-50 shadow-2xl"
          : "border border-gray-200/60 shadow-lg hover:shadow-xl"
      } bg-gradient-to-br from-white via-slate-50/50 to-gray-100/30 backdrop-blur-sm overflow-hidden`}
    >
      <CardContent className="flex-1 p-0 overflow-hidden">
        {renderContent()}
      </CardContent>
    </Card>
  );
};
