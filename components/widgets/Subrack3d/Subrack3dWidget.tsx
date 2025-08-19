// File: components/widgets/Subrack3d/Subrack3dWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Info,
  Maximize2,
  Minimize2,
  Layers,
  Zap,
  Activity,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    subrackType: string;
    topics: string[]; // Array of 3 topics
  };
}

export const Subrack3dWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeModule, setActiveModule] = useState<number | null>(null);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number>(0);
  const ledReferencesRef = useRef<THREE.Mesh[][]>([]); // 2D array: [module][pin]
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Validasi config
  useEffect(() => {
    if (
      !config.deviceUniqId ||
      !config.subrackType ||
      !Array.isArray(config.topics) ||
      config.topics.length !== 3
    ) {
      setStatus("error");
      setErrorMessage("Configuration incomplete - 3 MQTT topics required");
      return;
    }

    setStatus("ok");
  }, [config]);

  // Handle MQTT messages with enhanced feedback
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const topicIndex = config.topics.indexOf(receivedTopic);
        if (topicIndex === -1) return;

        setActiveModule(topicIndex);
        setTimeout(() => setActiveModule(null), 2000);

        const payload = JSON.parse(payloadString);
        const relayValues =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        // Update LEDs with smooth transitions
        Object.keys(relayValues).forEach((key, pinIndex) => {
          const state = relayValues[key];
          const led = ledReferencesRef.current[topicIndex]?.[pinIndex];

          if (led) {
            const material = led.material as THREE.MeshPhysicalMaterial;
            const targetColor = new THREE.Color(state ? 0x00ff88 : 0xff4444);
            const targetEmissive = new THREE.Color(state ? 0x004422 : 0x220000);

            // Smooth color transition with pulse effect
            const startColor = material.color.clone();
            const startEmissive = material.emissive.clone();
            let progress = 0;

            const animate = () => {
              progress += 0.08;
              if (progress <= 1) {
                material.color.lerpColors(startColor, targetColor, progress);
                material.emissive.lerpColors(
                  startEmissive,
                  targetEmissive,
                  progress
                );
                material.emissiveIntensity = state
                  ? 0.8 + Math.sin(Date.now() * 0.01) * 0.2
                  : 0.3;
                requestAnimationFrame(animate);
              } else {
                material.emissiveIntensity = state ? 0.6 : 0.2;
              }
            };
            animate();
          }
        });
      } catch (e) {
        console.error("Failed to parse MQTT payload for 3D subrack:", e);
      }
    },
    [config.topics]
  );

  // MQTT subscription
  useEffect(() => {
    if (status !== "ok" || !isReady || connectionStatus !== "Connected") return;

    config.topics.forEach((topic) => {
      if (topic) {
        subscribe(topic, handleMqttMessage);
      }
    });

    return () => {
      config.topics.forEach((topic) => {
        if (topic) {
          unsubscribe(topic, handleMqttMessage);
        }
      });
    };
  }, [
    config.topics,
    status,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Initialize relay status and LED references
  const initializeRelayStatusAndLEDs = useCallback((subrackType: string) => {
    ledReferencesRef.current = [];

    if (subrackType === "Normal Subrack") {
      ledReferencesRef.current = [
        Array(14).fill(null), // Module 1 (Optocoupler)
        Array(6).fill(null), // Module 2 (Relay)
        Array(14).fill(null), // Module 3 (Drycontact)
      ];
    } else if (subrackType === "Subrack With 18 Mini Relay") {
      ledReferencesRef.current = [
        Array(6).fill(null), // Module 1
        Array(6).fill(null), // Module 2
        Array(6).fill(null), // Module 3
      ];
    } else if (
      subrackType === "Subrack With 42 DI/DO" ||
      subrackType === "Subrack With 42 Drycontact"
    ) {
      ledReferencesRef.current = [
        Array(14).fill(null), // Module 1
        Array(14).fill(null), // Module 2
        Array(14).fill(null), // Module 3
      ];
    }
  }, []);

  // Enhanced circular label texture
  const createCircularLabel = useCallback((text: string, isActive: boolean) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    canvas.width = 128;
    canvas.height = 128;

    // Create gradient background
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 50);
    if (isActive) {
      gradient.addColorStop(0, "#00ff88");
      gradient.addColorStop(1, "#00cc66");
    } else {
      gradient.addColorStop(0, "#ff4444");
      gradient.addColorStop(1, "#cc2222");
    }

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(64, 64, 50, 0, Math.PI * 2);
    context.fill();

    // Add subtle border with glow
    context.strokeStyle = "rgba(255,255,255,0.6)";
    context.lineWidth = 3;
    context.shadowColor = isActive ? "#00ff88" : "#ff4444";
    context.shadowBlur = 8;
    context.stroke();

    // Add text with enhanced styling
    context.shadowColor = "rgba(0,0,0,0.8)";
    context.shadowBlur = 4;
    context.fillStyle = "white";
    context.font = "bold 28px 'Inter', Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    texture.generateMipmaps = false;
    return texture;
  }, []);

  // Handle resize function
  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, []);

  // Enhanced 3D scene creation
  const createScene = useCallback(() => {
    if (!mountRef.current) return;

    // Clear previous scene
    if (sceneRef.current) {
      while (sceneRef.current.children.length > 0) {
        sceneRef.current.remove(sceneRef.current.children[0]);
      }
    }

    if (rendererRef.current) {
      rendererRef.current.dispose();
    }

    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }

    ledReferencesRef.current = [];
    initializeRelayStatusAndLEDs(config.subrackType);

    // Enhanced scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);
    sceneRef.current = scene;

    const width = 485;
    const height = 44.5;
    const depth = 222;
    // Enhanced camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Enhanced renderer with better quality
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    scene.add(directionalLight);

    // Add accent lighting
    const accentLight = new THREE.DirectionalLight(0x64b5f6, 0.4);
    accentLight.position.set(-10, 5, -10);
    scene.add(accentLight);

    const fillLight = new THREE.DirectionalLight(0xffa726, 0.2);
    fillLight.position.set(5, -5, 5);
    scene.add(fillLight);

    // Enhanced controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 1.5;
    controls.autoRotate = false;
    controls.autoRotateSpeed = 0.5;
    controlsRef.current = controls;

    // Enhanced materials
    const mainBoxMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2d3748,
      metalness: 0.9,
      roughness: 0.1,
      clearcoat: 1.0,
      clearcoatRoughness: 0.05,
      reflectivity: 0.8,
    });

    const pinMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a202c,
      metalness: 0.8,
      roughness: 0.2,
    });

    const connectorMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x48bb78,
      metalness: 0.6,
      roughness: 0.3,
    });

    const geometry = new THREE.BoxGeometry(
      width / 100,
      height / 100,
      depth / 100
    );
    const box = new THREE.Mesh(geometry, mainBoxMaterial);
    box.castShadow = true;
    box.receiveShadow = true;
    scene.add(box);

    // Add enhanced antennas with glow
    const antennaGeometry = new THREE.CylinderGeometry(0.05, 0.05, 0.8, 32);
    const antennaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x001122,
      emissiveIntensity: 0.2,
    });

    const antenna1 = new THREE.Mesh(antennaGeometry, antennaMaterial);
    antenna1.position.set(-2, 0.4, 1.15);
    antenna1.castShadow = true;
    scene.add(antenna1);

    const antenna2 = antenna1.clone();
    antenna2.position.set(-2.3, 0.4, 1.15);
    antenna2.castShadow = true;
    scene.add(antenna2);

    // Enhanced component creation functions
    const frontZ = 1.1;
    const backZ = -1.13;

    // Enhanced base connector
    const createBaseConnector = (x: number, y: number, z: number) => {
      const baseGeometry = new THREE.BoxGeometry(0.4, 0.2, 0.2);
      const base = new THREE.Mesh(baseGeometry, connectorMaterial);
      base.position.set(x, y, z);
      base.castShadow = true;
      scene.add(base);
    };

    // Enhanced screw holes
    const createScrewHoles = (baseX: number, baseY: number, baseZ: number) => {
      const screwGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.02, 16);
      const screwMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xc0c0c0,
        metalness: 1.0,
        roughness: 0.1,
      });

      const screwSpacing = 0.1;
      for (let i = 0; i < 4; i++) {
        const screw = new THREE.Mesh(screwGeometry, screwMaterial);
        screw.position.set(
          baseX - 0.15 + i * screwSpacing,
          baseY + 0.1,
          baseZ + 0.06
        );
        screw.rotation.y = Math.PI / 2;
        screw.castShadow = true;
        scene.add(screw);
      }
    };

    const createConnector = (x: number, y: number, z: number) => {
      createBaseConnector(x, y, z);
      createScrewHoles(x, y, z);
    };

    // Enhanced port creation
    const createPort = (
      x: number,
      y: number,
      z: number,
      w: number,
      h: number,
      d: number,
      color: number,
      isLED: boolean = false
    ) => {
      const portGeometry = new THREE.BoxGeometry(w, h, d);
      const portMaterial = new THREE.MeshPhysicalMaterial({
        color,
        metalness: isLED ? 0.1 : 0.8,
        roughness: isLED ? 0.2 : 0.3,
        emissive: isLED ? color : 0x000000,
        emissiveIntensity: isLED ? 0.3 : 0,
        transmission: isLED ? 0.2 : 0,
      });

      const port = new THREE.Mesh(portGeometry, portMaterial);
      port.position.set(x, y, z);
      port.castShadow = true;
      scene.add(port);
    };

    // Enhanced fan creation with animation
    const createFan = (x: number, y: number, z: number) => {
      const fanGeometry = new THREE.CylinderGeometry(0.18, 0.18, 0.025, 32);
      const fanMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x1a1a1a,
        metalness: 0.8,
        roughness: 0.2,
      });

      const fan = new THREE.Mesh(fanGeometry, fanMaterial);
      fan.rotation.x = Math.PI / 2;
      fan.position.set(x, y, z);
      fan.castShadow = true;

      // Add fan blades
      const bladeGeometry = new THREE.BoxGeometry(0.3, 0.02, 0.05);
      const bladeMaterial = new THREE.MeshPhysicalMaterial({
        color: 0x333333,
        metalness: 0.7,
        roughness: 0.3,
      });

      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
        blade.position.set(x, y, z);
        blade.rotation.z = (Math.PI / 2) * i;
        blade.rotation.x = Math.PI / 2;
        scene.add(blade);

        // Animate fan rotation
        const animateFan = () => {
          blade.rotation.y += 0.1;
          requestAnimationFrame(animateFan);
        };
        animateFan();
      }

      scene.add(fan);
    };

    // Add components
    createConnector(-1.6, 0.05, 1.15);
    createPort(-1.16, 0.07, frontZ, 0.3, 0.2, 0.05, 0x777777);
    createPort(-1.1, -0.1, frontZ, 0.1, 0.1, 0.05, 0xff4444, true);
    createPort(-1.2, -0.1, frontZ, 0.1, 0.1, 0.05, 0x00ff88, true);
    createPort(-0.8, 0.07, frontZ, 0.2, 0.2, 0.05, 0x555555);
    createPort(-0.5, 0.12, frontZ, 0.2, 0.1, 0.05, 0x1a1a1a);
    createPort(-0.8, -0.1, frontZ, 0.2, 0.02, 0.05, 0x1a1a1a);
    createPort(-0.55, -0.1, frontZ, 0.1, 0.1, 0.05, 0x1a1a1a);
    createPort(-0.17, 0.05, frontZ, 0.3, 0.15, 0.05, 0x1a1a1a);

    // Enhanced module creation functions
    if (config.subrackType === "Normal Subrack") {
      // Enhanced pin creation for Optocoupler
      const createPinWithL = (
        x: number,
        y: number,
        z: number,
        moduleIndex: number,
        pinIndex: number,
        labelText: string,
        isBottomRow = false
      ) => {
        // Enhanced pin
        const pinGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.06);
        const pin = new THREE.Mesh(pinGeometry, pinMaterial);
        pin.position.set(x, y, z);
        pin.castShadow = true;

        // Enhanced LED with glow
        const ledGeometry = new THREE.SphereGeometry(0.025, 32, 32);
        const ledMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xff4444,
          emissive: 0x220000,
          emissiveIntensity: 0.5,
          metalness: 0.1,
          roughness: 0.1,
          transmission: 0.3,
          transparent: true,
        });

        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.set(x, y + 0.08, z);
        led.castShadow = true;

        // Store LED reference
        if (!ledReferencesRef.current[moduleIndex]) {
          ledReferencesRef.current[moduleIndex] = [];
        }
        ledReferencesRef.current[moduleIndex][pinIndex] = led;

        // Enhanced label
        const labelTexture = createCircularLabel(labelText, false);
        if (labelTexture) {
          const spriteMaterial = new THREE.SpriteMaterial({
            map: labelTexture,
            transparent: true,
            alphaTest: 0.001,
          });
          const label = new THREE.Sprite(spriteMaterial);
          label.scale.set(0.25, 0.25, 1);
          label.position.set(x, isBottomRow ? y - 0.25 : y + 0.25, z);
          scene.add(label);
        }

        scene.add(pin);
        scene.add(led);
      };

      // Enhanced Optocoupler module
      const createOptocoupler = (
        x: number,
        y: number,
        z: number,
        moduleIndex: number,
        totalPins = 14,
        numPinsPerRow = 7,
        totalWidth = 1.2
      ) => {
        const pinSpacing = totalWidth / (numPinsPerRow - 1);
        const rowOffset = 0.12;
        let pinIndex = 0;

        // Top row
        for (let i = 0; i < numPinsPerRow && pinIndex < totalPins; i++) {
          const pinX = x + i * pinSpacing;
          const pinY = y + rowOffset;
          createPinWithL(
            pinX,
            pinY,
            z,
            moduleIndex,
            pinIndex,
            `${pinIndex + 1}`
          );
          pinIndex++;
        }

        // Bottom row
        for (let i = 0; i < numPinsPerRow && pinIndex < totalPins; i++) {
          const pinX = x + i * pinSpacing;
          const pinY = y - rowOffset;
          createPinWithL(
            pinX,
            pinY,
            z,
            moduleIndex,
            pinIndex,
            `${pinIndex + 1}`,
            true
          );
          pinIndex++;
        }
      };

      // Enhanced Relay module
      const createRelayModule = (
        x: number,
        y: number,
        z: number,
        moduleIndex: number,
        numPins = 6,
        totalWidth = 1
      ) => {
        const pinSpacing = totalWidth / (numPins - 1);

        for (let i = 0; i < numPins; i++) {
          const pinX = x + i * pinSpacing;

          // Enhanced pin
          const pinGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.06);
          const pin = new THREE.Mesh(pinGeometry, pinMaterial);
          pin.position.set(pinX, y, z);
          pin.castShadow = true;

          // Enhanced LED
          const ledGeometry = new THREE.SphereGeometry(0.025, 32, 32);
          const ledMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff4444,
            emissive: 0x220000,
            emissiveIntensity: 0.5,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 0.3,
          });

          const led = new THREE.Mesh(ledGeometry, ledMaterial);
          led.position.set(pinX, y + 0.12, z);
          led.castShadow = true;

          // Store LED reference
          if (!ledReferencesRef.current[moduleIndex]) {
            ledReferencesRef.current[moduleIndex] = [];
          }
          ledReferencesRef.current[moduleIndex][i] = led;

          // Enhanced label
          const labelTexture = createCircularLabel(`R${i + 1}`, false);
          if (labelTexture) {
            const spriteMaterial = new THREE.SpriteMaterial({
              map: labelTexture,
              transparent: true,
              alphaTest: 0.001,
            });
            const label = new THREE.Sprite(spriteMaterial);
            label.scale.set(0.25, 0.25, 1);
            label.position.set(pinX, y + 0.35, z);
            scene.add(label);
          }

          scene.add(pin);
          scene.add(led);
        }
      };

      // Enhanced Dry Contact module
      const createDryContactModule = (
        x: number,
        y: number,
        z: number,
        moduleIndex: number,
        totalPins = 14,
        numPinsPerRow = 7,
        totalWidth = 1.2
      ) => {
        const pinSpacing = totalWidth / (numPinsPerRow - 1);
        const rowOffset = 0.12;
        let pinIndex = 0;

        // Top row
        for (let i = 0; i < numPinsPerRow && pinIndex < totalPins; i++) {
          const pinX = x + i * pinSpacing;
          const pinY = y + rowOffset;

          // Enhanced pin
          const pinGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.06);
          const pin = new THREE.Mesh(pinGeometry, pinMaterial);
          pin.position.set(pinX, pinY, z);
          pin.castShadow = true;

          // Enhanced LED
          const ledGeometry = new THREE.SphereGeometry(0.025, 32, 32);
          const ledMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff4444,
            emissive: 0x220000,
            emissiveIntensity: 0.5,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 0.3,
          });

          const led = new THREE.Mesh(ledGeometry, ledMaterial);
          led.position.set(pinX, pinY - 0.08, z);
          led.castShadow = true;

          // Store LED reference
          if (!ledReferencesRef.current[moduleIndex]) {
            ledReferencesRef.current[moduleIndex] = [];
          }
          ledReferencesRef.current[moduleIndex][pinIndex] = led;

          // Enhanced label
          const labelTexture = createCircularLabel(`${pinIndex + 1}`, false);
          if (labelTexture) {
            const spriteMaterial = new THREE.SpriteMaterial({
              map: labelTexture,
              transparent: true,
              alphaTest: 0.001,
            });
            const label = new THREE.Sprite(spriteMaterial);
            label.scale.set(0.25, 0.25, 1);
            label.position.set(pinX, pinY + 0.25, z);
            scene.add(label);
          }

          scene.add(pin);
          scene.add(led);
          pinIndex++;
        }

        // Bottom row
        for (let i = 0; i < numPinsPerRow && pinIndex < totalPins; i++) {
          const pinX = x + i * pinSpacing;
          const pinY = y - rowOffset;

          // Enhanced pin
          const pinGeometry = new THREE.BoxGeometry(0.12, 0.06, 0.06);
          const pin = new THREE.Mesh(pinGeometry, pinMaterial);
          pin.position.set(pinX, pinY, z);
          pin.castShadow = true;

          // Enhanced LED
          const ledGeometry = new THREE.SphereGeometry(0.025, 32, 32);
          const ledMaterial = new THREE.MeshPhysicalMaterial({
            color: 0xff4444,
            emissive: 0x220000,
            emissiveIntensity: 0.5,
            metalness: 0.1,
            roughness: 0.1,
            transmission: 0.3,
          });

          const led = new THREE.Mesh(ledGeometry, ledMaterial);
          led.position.set(pinX, pinY + 0.08, z);
          led.castShadow = true;

          // Store LED reference
          if (!ledReferencesRef.current[moduleIndex]) {
            ledReferencesRef.current[moduleIndex] = [];
          }
          ledReferencesRef.current[moduleIndex][pinIndex] = led;

          // Enhanced label
          const labelTexture = createCircularLabel(`${pinIndex + 1}`, false);
          if (labelTexture) {
            const spriteMaterial = new THREE.SpriteMaterial({
              map: labelTexture,
              transparent: true,
              alphaTest: 0.001,
            });
            const label = new THREE.Sprite(spriteMaterial);
            label.scale.set(0.25, 0.25, 1);
            label.position.set(pinX, pinY - 0.25, z);
            scene.add(label);
          }

          scene.add(pin);
          scene.add(led);
          pinIndex++;
        }
      };

      // Add modules to scene
      createOptocoupler(1, 0, frontZ, 0); // Module 1 (Optocoupler)
      createRelayModule(-2.2, 0.01, backZ, 1); // Module 2 (Relay)
      createDryContactModule(0.3, 0, backZ, 2); // Module 3 (Drycontact)

      // Add enhanced fans
      createFan(-0.8, 0, backZ);
      createFan(-0.3, 0, backZ);
    }
    // Additional subrack types implementation can be added here...

    // Setup ResizeObserver untuk real-time resize
    if (mountRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          clearTimeout(resizeObserverRef.current?.timeout);
          resizeObserverRef.current.timeout = setTimeout(() => {
            handleResize();
          }, 16);
        }
      });

      resizeObserverRef.current.observe(mountRef.current);
    }

    // Enhanced animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationRef.current);

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [
    config.subrackType,
    initializeRelayStatusAndLEDs,
    createCircularLabel,
    handleResize,
  ]);

  // Initialize scene when status changes
  useEffect(() => {
    if (status === "ok") {
      const cleanup = createScene();
      return cleanup;
    }
  }, [status, createScene]);

  // Enhanced set view with smooth animations
  const setView = (view: "front" | "back" | "top" | "side") => {
    if (!cameraRef.current || !controlsRef.current || isAnimating) return;

    setIsAnimating(true);
    let targetPosition: THREE.Vector3;

    switch (view) {
      case "front":
        targetPosition = new THREE.Vector3(0, 1, 8);
        break;
      case "back":
        targetPosition = new THREE.Vector3(0, 1, -8);
        break;
      case "top":
        targetPosition = new THREE.Vector3(0, 8, 0);
        break;
      case "side":
        targetPosition = new THREE.Vector3(8, 1, 0);
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

      // Smooth easing function
      const easeInOutCubic =
        t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;

      cameraRef.current!.position.lerpVectors(
        startPosition,
        targetPosition,
        easeInOutCubic
      );
      cameraRef.current!.lookAt(0, 0, 0);

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        controlsRef.current!.target.set(0, 0, 0);
        controlsRef.current!.update();
        setIsAnimating(false);
      }
    };

    animate();
  };

  // Enhanced reset view
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current || isAnimating) return;

    setIsAnimating(true);
    const startPosition = cameraRef.current.position.clone();
    const targetPosition = new THREE.Vector3(0, 2, 6);
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

      if (t < 1) {
        requestAnimationFrame(animate);
      } else {
        controlsRef.current!.target.set(0, 0, 0);
        controlsRef.current!.update();
        setIsAnimating(false);
      }
    };

    animate();
  };

  // Enhanced loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          animation: "shimmer 2.5s infinite",
        }}
      />

      {/* 3D Loading visualization */}
      <div className="flex flex-col items-center space-y-6 z-10">
        <div className="relative">
          <div
            className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-ping opacity-30"
            style={{ width: "80px", height: "80px" }}
          />
          <div className="relative bg-white rounded-full p-4 shadow-xl border-4 border-blue-100">
            <Layers className="h-12 w-12 text-blue-500 animate-bounce" />
          </div>
        </div>

        <div className="text-center space-y-3">
          <div className="flex items-center space-x-2">
            <div
              className="h-3 w-3 bg-blue-400 rounded-full animate-bounce"
              style={{ animationDelay: "0s" }}
            />
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

  // Enhanced error state
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
          <h3 className="text-xl font-bold text-red-800">Connection Failed</h3>
          <p className="text-sm text-red-600 leading-relaxed">{errorMessage}</p>
          <div className="text-xs text-red-500 bg-red-50 p-3 rounded-lg border border-red-200">
            <strong>Required:</strong> 3 MQTT topics for modules
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="border-red-300 text-red-700 hover:bg-red-50 transition-all duration-300 hover:scale-105"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry Connection
        </Button>
      </div>
    </div>
  );

  // Get connection status
  const getConnectionStatus = () => {
    const isConnected = connectionStatus === "Connected";
    return {
      icon: isConnected ? Wifi : WifiOff,
      color: isConnected ? "text-emerald-500" : "text-red-500",
      bgColor: isConnected ? "bg-emerald-50" : "bg-red-50",
      text: isConnected ? "Connected" : "Disconnected",
    };
  };

  // Get module info
  const getModuleInfo = () => {
    const modules = [];
    if (config.subrackType === "Normal Subrack") {
      modules.push(
        { name: "Optocoupler", pins: 14, icon: Zap, color: "bg-blue-500" },
        { name: "Relay", pins: 6, icon: Activity, color: "bg-green-500" },
        { name: "Drycontact", pins: 14, icon: Layers, color: "bg-purple-500" }
      );
    }
    // Add other subrack types here...
    return modules;
  };

  // Enhanced render content
  const renderContent = () => {
    if (status === "loading") {
      return renderLoadingSkeleton();
    }

    if (status === "error") {
      return renderErrorState();
    }

    const connectionInfo = getConnectionStatus();
    const ConnectionIcon = connectionInfo.icon;
    const moduleInfo = getModuleInfo();

    return (
      <div className="relative w-full h-full group">
        {/* Enhanced 3D Viewport */}
        <div
          ref={mountRef}
          className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner"
          style={{
            background:
              "radial-gradient(ellipse at center, #f8fafc 0%, #e2e8f0 100%)",
          }}
        />

        {showControls && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
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
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons */}
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

        {/* Module Status Panel */}
        {moduleInfo.length > 0 && (
          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/30">
              <div className="flex items-center space-x-4">
                {moduleInfo.map((module, index) => {
                  const ModuleIcon = module.icon;
                  const isActive = activeModule === index;

                  return (
                    <div
                      key={index}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-xl transition-all duration-300 ${
                        isActive
                          ? "bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105"
                          : "bg-gray-100 hover:bg-gray-200"
                      }`}
                    >
                      <div
                        className={`p-1 rounded-lg ${
                          isActive ? "bg-white/20" : module.color
                        }`}
                      >
                        <ModuleIcon
                          className={`h-3 w-3 ${
                            isActive ? "text-white" : "text-white"
                          }`}
                        />
                      </div>
                      <div className="text-xs">
                        <div className="font-medium">{module.name}</div>
                        <div
                          className={`text-xs ${
                            isActive ? "text-white/80" : "text-gray-500"
                          }`}
                        >
                          {module.pins} pins
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Enhanced Status Bar */}
        <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between z-10">
          {/* Device Name */}
          <div className="bg-white/90 backdrop-blur-xl px-4 py-3 rounded-xl shadow-xl border border-white/30 flex items-center space-x-3 max-w-[60%]">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse shadow-lg" />
            <div>
              <div className="text-sm font-semibold text-gray-800 truncate">
                {config.customName}
              </div>
            </div>
          </div>

          {/* Connection Status */}
          <div
            className={`${connectionInfo.bgColor} backdrop-blur-xl px-4 py-3 rounded-xl shadow-xl border border-white/30 flex items-center space-x-2`}
          >
            <ConnectionIcon className={`h-4 w-4 ${connectionInfo.color}`} />
            <span className="text-xs font-semibold text-gray-700">
              {connectionInfo.text}
            </span>
          </div>
        </div>
        {/* Device Type Badge */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full shadow-lg">
            <span className="text-xs font-medium flex items-center space-x-2">
              <Move3D className="h-3 w-3" />
              <span>{config.subrackType}</span>
            </span>
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

      {/* Enhanced Custom Styles */}
      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        @keyframes float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes glow {
          0%,
          100% {
            box-shadow: 0 0 5px rgba(59, 130, 246, 0.5);
          }
          50% {
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.8);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        .animate-glow {
          animation: glow 2s ease-in-out infinite;
        }

        /* Enhanced scrollbar */
        ::-webkit-scrollbar {
          width: 6px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #64b5f6, #42a5f5);
          border-radius: 3px;
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #42a5f5, #2196f3);
        }

        /* Responsive design */
        @media (max-width: 768px) {
          .control-panel {
            flex-direction: column;
            gap: 0.5rem;
          }

          .status-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.75rem;
          }

          .module-status {
            flex-direction: column;
            gap: 0.5rem;
          }
        }

        @media (max-width: 640px) {
          .absolute.top-4.left-4 {
            top: 0.5rem;
            left: 0.5rem;
          }

          .absolute.top-4.right-4 {
            top: 0.5rem;
            right: 0.5rem;
          }

          .absolute.bottom-4 {
            bottom: 0.5rem;
            left: 0.5rem;
            right: 0.5rem;
          }
        }

        /* Glass morphism enhanced */
        .glass-enhanced {
          background: rgba(255, 255, 255, 0.15);
          backdrop-filter: blur(20px) saturate(180%);
          border: 1px solid rgba(255, 255, 255, 0.3);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }

        /* Interactive states */
        .interactive-element {
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .interactive-element:hover {
          transform: translateY(-2px) scale(1.02);
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
        }

        .interactive-element:active {
          transform: translateY(0) scale(0.98);
        }

        /* Focus enhancements */
        .focus-enhanced:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.4);
          border-color: rgba(59, 130, 246, 0.6);
        }

        /* Module highlight effects */
        .module-active {
          animation: pulse-glow 1s ease-in-out;
        }

        @keyframes pulse-glow {
          0%,
          100% {
            box-shadow: 0 0 10px rgba(59, 130, 246, 0.5);
            transform: scale(1);
          }
          50% {
            box-shadow: 0 0 25px rgba(59, 130, 246, 0.8);
            transform: scale(1.05);
          }
        }

        /* Loading states */
        .skeleton-pulse {
          animation: skeleton-loading 1.5s ease-in-out infinite;
        }

        @keyframes skeleton-loading {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.6;
          }
        }

        /* Micro-interactions */
        .micro-bounce:hover {
          animation: micro-bounce 0.6s ease-in-out;
        }

        @keyframes micro-bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          25% {
            transform: translateY(-4px);
          }
          50% {
            transform: translateY(-2px);
          }
          75% {
            transform: translateY(-1px);
          }
        }
      `}</style>
    </Card>
  );
};
