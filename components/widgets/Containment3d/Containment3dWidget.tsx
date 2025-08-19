// File: components/widgets/Containment3d/Containment3dWidget.tsx
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
  Maximize2,
  Minimize2,
  Thermometer,
  Droplets,
  Shield,
  AlertCircle,
  DoorOpen,
  DoorClosed,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

interface Props {
  config: {
    customName: string;
    totalRack: number;
    dummyRack: number[];
    topics: string[];
    topicOptional: string;
  };
}

interface RackData {
  temp: string;
  hum: string;
}

export const Containment3dWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  // State untuk kontrol dengan default values untuk testing
  const [emergencyButtonState, setEmergencyButtonState] =
    useState<boolean>(false);
  const [frontDoorStatus, setFrontDoorStatus] = useState<boolean>(true); // true = closed, false = open
  const [backDoorStatus, setBackDoorStatus] = useState<boolean>(true);
  const [solenoidStatus, setSolenoidStatus] = useState<boolean>(false); // true = activated (open ceiling)

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Refs untuk pintu dan ceiling
  const frontDoorsRef = useRef<THREE.Mesh[]>([]);
  const backDoorsRef = useRef<THREE.Mesh[]>([]);
  const ceilingPartsRef = useRef<THREE.Group[]>([]);
  const rackLabelsRef = useRef<THREE.Sprite[]>([]);

  // State untuk data rack
  const [rackValues, setRackValues] = useState<Record<number, RackData>>({});

  // Computed values
  const racksPerSide = React.useMemo(() => {
    if (config.totalRack % 2 === 0) {
      return { left: config.totalRack / 2, right: config.totalRack / 2 };
    } else {
      const left = Math.ceil(config.totalRack / 2);
      const right = Math.ceil(config.totalRack / 2);
      return { left, right };
    }
  }, [config.totalRack]);

  // Handle MQTT messages
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        console.log(payload);
        // Handle topic optional (status controls)
        if (receivedTopic === config.topicOptional) {
          // Emergency button
          if (payload["Emergency Button State"] !== undefined) {
            const newState = payload["Emergency Button State"];
            if (emergencyButtonState !== newState) {
              setEmergencyButtonState(newState);
              showAlert(
                `Emergency Button is now ${newState ? "Active" : "Inactive"}`
              );
            }
          }

          // Front door - true = closed, false = open
          if (payload["limit switch front door status"] !== undefined) {
            const newState = payload["limit switch front door status"];
            if (frontDoorStatus !== newState) {
              setFrontDoorStatus(newState);
              showAlert(`Front door ${newState ? "closed" : "opened"}`);
            }
          }

          // Back door
          if (payload["limit switch back door status"] !== undefined) {
            const newState = payload["limit switch back door status"];
            if (backDoorStatus !== newState) {
              setBackDoorStatus(newState);
              showAlert(`Back door ${newState ? "closed" : "opened"}`);
            }
          }

          // Solenoid status - true = ceiling activated (open)
          if (payload["selenoid status"] !== undefined) {
            const newState = payload["selenoid status"];
            if (solenoidStatus !== newState) {
              setSolenoidStatus(newState);
              showAlert(newState ? "Ceiling opened" : "Ceiling closed");
            }
          }
        }

        // Handle rack data topics
        const topicIndex = config.topics.indexOf(receivedTopic);
        if (topicIndex !== -1) {
          const rackNumber = topicIndex + 1;
          try {
            const rackData =
              typeof payload.value === "string"
                ? JSON.parse(payload.value)
                : payload.value || {};

            setRackValues((prev) => ({
              ...prev,
              [rackNumber]: {
                temp: rackData.temp || "N/A",
                hum: rackData.hum || "N/A",
              },
            }));
          } catch (e) {
            console.error("Failed to parse rack data:", e);
          }
        }
      } catch (error) {
        console.error("Failed to parse MQTT payload:", error);
      }
    },
    [
      config.topics,
      config.topicOptional,
      emergencyButtonState,
      frontDoorStatus,
      backDoorStatus,
      solenoidStatus,
    ]
  );

  // Show alert function
  const showAlert = (message: string) => {
    setAlertMessage(message);
    setTimeout(() => setAlertMessage(""), 3000);
  };

  // Validasi config
  useEffect(() => {
    if (
      !config.customName ||
      !config.totalRack ||
      !Array.isArray(config.topics)
    ) {
      setStatus("error");
      setErrorMessage("Configuration incomplete");
      return;
    }
    setStatus("ok");
  }, [config]);

  // MQTT subscription
  useEffect(() => {
    if (status !== "ok" || !isReady || connectionStatus !== "Connected") return;

    const allTopics = [
      ...config.topics.filter((t) => t),
      config.topicOptional,
    ].filter((t) => t);

    allTopics.forEach((topic) => {
      if (topic) {
        subscribe(topic, handleMqttMessage);
      }
    });

    return () => {
      allTopics.forEach((topic) => {
        if (topic) {
          unsubscribe(topic, handleMqttMessage);
        }
      });
    };
  }, [
    config.topics,
    config.topicOptional,
    status,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Create circular label
  const createCircularLabel = useCallback(
    (text: string, backgroundColor: string = "black") => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return null;

      canvas.width = 128;
      canvas.height = 128;

      // Draw circle
      context.fillStyle = backgroundColor;
      context.beginPath();
      context.arc(64, 64, 50, 0, Math.PI * 2);
      context.fill();

      // Draw text
      context.fillStyle = backgroundColor === "yellow" ? "black" : "white";
      context.font = "bold 32px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 64, 64);

      const texture = new THREE.CanvasTexture(canvas);
      texture.generateMipmaps = false;
      return texture;
    },
    []
  );

  // Get rack label color
  const getRackLabelColor = useCallback(
    (rackNumber: number) => {
      if (config.dummyRack.includes(rackNumber)) {
        return "gray";
      }

      const payload = rackValues[rackNumber];
      if (payload) {
        const temp = parseFloat(payload.temp);
        const hum = parseFloat(payload.hum);

        if (isNaN(temp) || isNaN(hum)) return "black";

        if (temp < 15 || temp > 30 || hum < 30 || hum > 70) {
          return "red";
        } else if (
          (temp >= 15 && temp <= 17) ||
          (temp >= 28 && temp <= 30) ||
          (hum >= 30 && hum <= 39) ||
          (hum >= 61 && hum <= 70)
        ) {
          return "yellow";
        } else if (temp >= 18 && temp <= 27 && hum >= 40 && hum <= 60) {
          return "green";
        }
      }
      return "black";
    },
    [config.dummyRack, rackValues]
  );

  // Update rack labels
  const updateRackLabels = useCallback(() => {
    rackLabelsRef.current.forEach((label, index) => {
      const rackNumber = index + 1;
      const newColor = getRackLabelColor(rackNumber);

      if (label.userData?.backgroundColor !== newColor) {
        const newTexture = createCircularLabel(rackNumber.toString(), newColor);
        if (newTexture && label.material instanceof THREE.SpriteMaterial) {
          label.material.map = newTexture;
          label.userData = { backgroundColor: newColor };
        }
      }
    });
  }, [getRackLabelColor, createCircularLabel]);

  // Animate doors
  const animateDoors = useCallback(() => {
    // Front doors animation - slide to the right when open
    frontDoorsRef.current.forEach((door) => {
      const targetX = frontDoorStatus ? 0.0 : 0.5; // move right when open
      if (Math.abs(door.position.x - targetX) > 0.01) {
        door.position.x += (targetX - door.position.x) * 0.1;
      }
    });

    // Back doors animation - slide to the left when open
    backDoorsRef.current.forEach((door) => {
      const targetX = backDoorStatus ? 0.0 : -0.5; // move left when open
      if (Math.abs(door.position.x - targetX) > 0.01) {
        door.position.x += (targetX - door.position.x) * 0.1;
      }
    });
  }, [frontDoorStatus, backDoorStatus]);

  // Animate ceiling
  const animateCeiling = useCallback(() => {
    ceilingPartsRef.current.forEach((pivot, index) => {
      const targetRotation = solenoidStatus ? Math.PI / 2 : 0; // 90 degrees when activated
      const currentRotation = pivot.rotation.z;

      if (Math.abs(currentRotation - targetRotation) > 0.01) {
        pivot.rotation.z += (targetRotation - currentRotation) * 0.05;
      }
    });
  }, [solenoidStatus]);

  // Handle resize
  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
    rendererRef.current.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }, []);

  // Create 3D scene
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

    // Clear refs
    frontDoorsRef.current = [];
    backDoorsRef.current = [];
    ceilingPartsRef.current = [];
    rackLabelsRef.current = [];

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8f8f8);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(
      75,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(-5, 4, 2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    // Materials
    const frameMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const serverMaterial = new THREE.MeshStandardMaterial({ color: 0x3333ff });
    const dummyServerMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      opacity: 0.3,
      transparent: true,
    });
    const doorMaterial = new THREE.MeshStandardMaterial({
      color: 0x4444ff,
      opacity: 0.7,
      transparent: true,
    });
    const coverMaterial = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const floorMaterial = new THREE.MeshStandardMaterial({ color: 0xf5f5dc });

    // Create rack function
    const createRackServer = (rackNumber: number) => {
      const rackGroup = new THREE.Group();
      rackGroup.userData = { rackNumber };

      const rackWidth = 0.67;
      const rackHeight = 2.0;
      const rackDepth = 1.2;
      const isDummy = config.dummyRack.includes(rackNumber);

      // Frame - always visible but different material for dummy
      const frameGeometry = new THREE.BoxGeometry(
        rackWidth,
        rackHeight,
        rackDepth
      );
      const frame = new THREE.Mesh(
        frameGeometry,
        isDummy
          ? new THREE.MeshStandardMaterial({
              color: 0x666666,
              opacity: 0.5,
              transparent: true,
              wireframe: true, // wireframe untuk dummy
            })
          : frameMaterial
      );
      frame.position.z = -0.6;
      frame.castShadow = true;
      frame.receiveShadow = true;
      rackGroup.add(frame);

      // Server units
      const numUnits = 10;
      const unitHeight = rackHeight / numUnits;
      for (let i = 0; i < numUnits; i++) {
        const serverGeometry = new THREE.BoxGeometry(
          rackWidth - 0.05,
          unitHeight - 0.05,
          rackDepth - 0.1
        );
        const serverUnit = new THREE.Mesh(
          serverGeometry,
          isDummy ? dummyServerMaterial : serverMaterial
        );
        serverUnit.position.y =
          i * unitHeight - rackHeight / 2 + unitHeight / 2;
        serverUnit.position.z = -0.5;
        serverUnit.castShadow = true;

        // Add breathing animation for dummy racks
        if (isDummy) {
          serverUnit.userData = {
            originalScale: serverUnit.scale.clone(),
            isDummy: true,
          };
        }

        rackGroup.add(serverUnit);
      }

      // Front door
      const frontDoorGeometry = new THREE.BoxGeometry(
        rackWidth - 0.02,
        rackHeight,
        0.03
      );
      const frontDoor = new THREE.Mesh(frontDoorGeometry, doorMaterial);
      frontDoor.position.z = 0.1;
      frontDoor.userData = { position: "front", rack: rackNumber };
      rackGroup.add(frontDoor);
      frontDoorsRef.current.push(frontDoor);

      // Back door
      const backDoorGeometry = new THREE.BoxGeometry(
        rackWidth - 0.02,
        rackHeight,
        0.03
      );
      const backDoor = new THREE.Mesh(backDoorGeometry, doorMaterial);
      backDoor.position.z = -1.2;
      backDoor.userData = { position: "back", rack: rackNumber };
      rackGroup.add(backDoor);
      backDoorsRef.current.push(backDoor);

      // Label
      const labelTexture = createCircularLabel(
        isDummy ? "DUMMY" : rackNumber.toString(),
        getRackLabelColor(rackNumber)
      );
      if (labelTexture) {
        const spriteMaterial = new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
        });
        const label = new THREE.Sprite(spriteMaterial);
        label.scale.set(0.5, 0.5, 1);
        label.position.set(0, 1, -1.25);
        label.userData = { backgroundColor: getRackLabelColor(rackNumber) };
        rackGroup.add(label);
        rackLabelsRef.current.push(label);
      }

      return rackGroup;
    };

    // Create server row
    const createServerRow = (
      numRacks: number,
      startRackNumber: number,
      isRightRow: boolean
    ) => {
      const rowGroup = new THREE.Group();
      const rackWidth = 0.67;

      for (let i = 0; i < numRacks; i++) {
        const rackNumber = startRackNumber + i;
        const rackServer = createRackServer(rackNumber);

        if (!isRightRow) {
          rackServer.position.x = -i * 0.7 + (numRacks - 1) * 0.35;
        } else {
          rackServer.position.x = i * 0.7 - (numRacks - 1) * 0.35;
        }

        rowGroup.add(rackServer);
      }

      // Add covers
      const sideCoverLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 2.0, 0.5),
        coverMaterial
      );
      sideCoverLeft.position.x = -(numRacks * rackWidth) / 2 - 0.05;
      rowGroup.add(sideCoverLeft);

      const sideCoverRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 2.0, 0.5),
        coverMaterial
      );
      sideCoverRight.position.x = (numRacks * rackWidth) / 2 + 0.05;
      rowGroup.add(sideCoverRight);

      const bottomCover = new THREE.Mesh(
        new THREE.BoxGeometry(0.75 * numRacks, 0.05, 2.8),
        floorMaterial
      );
      bottomCover.position.y = -1.0;
      rowGroup.add(bottomCover);

      return rowGroup;
    };

    // Create ceiling
    const createSplitCeiling = (
      topCoverWidth: number,
      topCoverDepth: number,
      racksCount: number
    ) => {
      const ceilingGroup = new THREE.Group();
      const lineSpacing = topCoverWidth / racksCount;

      for (let i = 0; i < racksCount; i++) {
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

    // Create and add rows
    const container = new THREE.Group();

    const rowRight = createServerRow(racksPerSide.right, 1, true);
    rowRight.position.z = -0.8;

    const rowLeft = createServerRow(
      racksPerSide.left,
      racksPerSide.right + 1,
      false
    );
    rowLeft.position.z = 0.8;
    rowLeft.rotation.y = Math.PI;

    container.add(rowRight);
    container.add(rowLeft);

    // Add ceiling
    const topCoverWidth = racksPerSide.right * 0.68;
    const topCoverDepth = 2.8;
    const ceilingGroup = createSplitCeiling(
      topCoverWidth,
      topCoverDepth,
      racksPerSide.right
    );
    scene.add(ceilingGroup);

    scene.add(container);

    // Setup ResizeObserver
    if (mountRef.current) {
      resizeObserverRef.current = new ResizeObserver(() => {
        handleResize();
      });
      resizeObserverRef.current.observe(mountRef.current);
    }

    // Animation loop
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);

      // Animate dummy racks breathing effect
      scene.traverse((child) => {
        if (child.userData?.isDummy) {
          const time = Date.now() * 0.001;
          const scale = 1 + Math.sin(time * 2) * 0.05;
          child.scale.setScalar(scale);
        }
      });

      updateRackLabels();
      animateDoors();
      animateCeiling();

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
    config.totalRack,
    config.dummyRack,
    racksPerSide,
    createCircularLabel,
    getRackLabelColor,
    updateRackLabels,
    animateDoors,
    animateCeiling,
    handleResize,
  ]);

  // Initialize scene
  useEffect(() => {
    if (status === "ok") {
      const cleanup = createScene();
      return cleanup;
    }
  }, [status, createScene]);

  // Set view function
  const setView = (view: "front" | "back" | "top" | "side") => {
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

  // Reset view
  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current || isAnimating) return;

    setIsAnimating(true);
    const startPosition = cameraRef.current.position.clone();
    const targetPosition = new THREE.Vector3(-5, 4, 2);
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

  // Loading skeleton
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

  // Error state
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

  // Render content
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

        {/* Emergency Icon */}
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-xl px-3 py-2 rounded-xl shadow-xl border border-white/30">
            <Shield
              className={`h-6 w-6 ${
                emergencyButtonState
                  ? "text-red-500 animate-pulse"
                  : "text-green-500"
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              Emergency: {emergencyButtonState ? "Active" : "Inactive"}
            </span>
          </div>
        </div>

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
              {/* Temperature */}
              <div className="flex items-center space-x-2">
                <Thermometer className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-600">Temp</span>
              </div>

              {/* Humidity */}
              <div className="flex items-center space-x-2">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-600">Humidity</span>
              </div>

              {/* Door Status */}
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

              {/* Ceiling Status */}
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

        {/* Rack Count Info */}
        <div className="absolute bottom-4 left-4 z-10">
          <div className="bg-white/90 backdrop-blur-xl px-4 py-3 rounded-xl shadow-xl border border-white/30 flex items-center space-x-3">
            <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse shadow-lg" />
            <div>
              <div className="text-sm font-semibold text-gray-800">
                {config.customName}
              </div>
              <div className="text-xs text-gray-500">
                {config.totalRack} Racks • {config.dummyRack.length} Dummy
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

        {/* Rack Legend */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/30">
            <div className="flex items-center space-x-4 text-xs">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full" />
                <span className="text-gray-600">Normal</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full" />
                <span className="text-gray-600">Warning</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full" />
                <span className="text-gray-600">Critical</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-gray-500 rounded-full" />
                <span className="text-gray-600">Dummy</span>
              </div>
            </div>
          </div>
        </div>
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

      {/* Custom Styles */}
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

        .alert {
          animation: slideInUp 0.3s ease-out;
        }

        @keyframes slideInUp {
          from {
            transform: translateY(100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
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

        /* Responsive design */
        @media (max-width: 768px) {
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

          .control-panel {
            flex-direction: column;
            gap: 0.5rem;
          }
        }

        @media (max-width: 640px) {
          .status-panels {
            flex-direction: column;
            gap: 0.5rem;
          }

          .text-xs {
            font-size: 0.7rem;
          }
        }
      `}</style>
    </Card>
  );
};
