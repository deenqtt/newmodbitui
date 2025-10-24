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
  X,
  Clock,
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
  Temperature: number;
  Humidity: number;
  device_name?: string;
  Timestamp?: string;
  raw?: any;
}

interface DetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  rackNumber: number;
  data: RackData | null;
}

const DetailModal: React.FC<DetailModalProps> = ({
  isOpen,
  onClose,
  rackNumber,
  data,
}) => {
  if (!isOpen) return null;

  const formatTimestamp = (timestamp?: string) => {
    if (!timestamp) return "N/A";
    try {
      const date = new Date(timestamp);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transform transition-all">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            Rack {rackNumber} Details
          </h3>
          <Button
            size="sm"
            variant="ghost"
            onClick={onClose}
            className="h-8 w-8 p-0 rounded-full hover:bg-gray-100"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {data ? (
          <div className="space-y-4">
            {/* Temperature */}
            <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-red-500 rounded-full p-2">
                  <Thermometer className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-red-600 font-medium">
                    Temperature
                  </p>
                  <p className="text-2xl font-bold text-red-700">
                    {data.Temperature}°C
                  </p>
                </div>
              </div>
            </div>

            {/* Humidity */}
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
              <div className="flex items-center space-x-3">
                <div className="bg-blue-500 rounded-full p-2">
                  <Droplets className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm text-blue-600 font-medium">Humidity</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {data.Humidity}%
                  </p>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-gray-500" />
                <span className="text-sm text-gray-600">Last Update:</span>
                <span className="text-sm font-medium text-gray-800">
                  {formatTimestamp(data.Timestamp)}
                </span>
              </div>
              {data.device_name && (
                <div className="text-sm text-gray-600">
                  Device:{" "}
                  <span className="font-medium">{data.device_name}</span>
                </div>
              )}
            </div>

            {/* Status Indicator */}
            <div className="flex items-center justify-center space-x-2 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-700">
                Live Data
              </span>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <Thermometer className="h-12 w-12 mx-auto opacity-50" />
            </div>
            <p className="text-gray-500">No data available for this rack</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const Containment3dWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string>("");

  // Modal state
  const [selectedRack, setSelectedRack] = useState<number | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // State untuk kontrol dengan default values untuk testing
  const [emergencyButtonState, setEmergencyButtonState] =
    useState<boolean>(false);
  const [frontDoorStatus, setFrontDoorStatus] = useState<boolean>(true);
  const [backDoorStatus, setBackDoorStatus] = useState<boolean>(true);
  const [solenoidStatus, setSolenoidStatus] = useState<boolean>(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());
  const mouseRef = useRef<THREE.Vector2>(new THREE.Vector2());

  // Refs untuk pintu dan ceiling
  const frontDoorsRef = useRef<THREE.Mesh[]>([]);
  const backDoorsRef = useRef<THREE.Mesh[]>([]);
  const ceilingPartsRef = useRef<THREE.Group[]>([]);
  const rackLabelsRef = useRef<THREE.Sprite[]>([]);
  const clickableObjectsRef = useRef<THREE.Object3D[]>([]);

  // State untuk data rack - menggunakan RackData interface
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
  // Handle MQTT messages - FIXED VERSION untuk multiple racks dengan topic yang sama
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        console.log("Received MQTT message:", {
          topic: receivedTopic,
          payload,
        });

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

          // Door statuses
          if (payload["limit switch front door status"] !== undefined) {
            const newState = payload["limit switch front door status"];
            if (frontDoorStatus !== newState) {
              setFrontDoorStatus(newState);
              showAlert(`Front door ${newState ? "closed" : "opened"}`);
            }
          }

          if (payload["limit switch back door status"] !== undefined) {
            const newState = payload["limit switch back door status"];
            if (backDoorStatus !== newState) {
              setBackDoorStatus(newState);
              showAlert(`Back door ${newState ? "closed" : "opened"}`);
            }
          }

          if (payload["selenoid status"] !== undefined) {
            const newState = payload["selenoid status"];
            if (solenoidStatus !== newState) {
              setSolenoidStatus(newState);
              showAlert(newState ? "Ceiling opened" : "Ceiling closed");
            }
          }
        }

        // Handle rack data topics - FIXED: Handle semua rack yang menggunakan topic yang sama
        config.topics.forEach((topic, index) => {
          // Skip jika topic kosong atau tidak match
          if (!topic || topic !== receivedTopic) return;

          const rackNumber = index + 1;
          console.log(
            `Processing data for Rack ${rackNumber} from topic: ${receivedTopic}`
          );

          let rackData: RackData;

          // Parse value field if it's a string
          if (payload.value && typeof payload.value === "string") {
            try {
              const parsedValue = JSON.parse(payload.value);
              rackData = {
                Temperature: parsedValue.Temperature || parsedValue.temp || 0,
                Humidity: parsedValue.Humidity || parsedValue.hum || 0,
                device_name: payload.device_name,
                Timestamp: payload.Timestamp,
                raw: payload,
              };
            } catch (e) {
              console.error(
                `Failed to parse value field for Rack ${rackNumber}:`,
                e
              );
              // Fallback if parsing fails
              rackData = {
                Temperature: 0,
                Humidity: 0,
                device_name: payload.device_name,
                Timestamp: payload.Timestamp,
                raw: payload,
              };
            }
          } else {
            // Direct access if value is already an object or direct fields
            rackData = {
              Temperature: payload.Temperature || payload.temp || 0,
              Humidity: payload.Humidity || payload.hum || 0,
              device_name: payload.device_name,
              Timestamp: payload.Timestamp,
              raw: payload,
            };
          }

          console.log(`Rack ${rackNumber} data:`, rackData);

          // Update state untuk rack ini
          setRackValues((prev) => ({
            ...prev,
            [rackNumber]: rackData,
          }));
        });
      } catch (error) {
        console.error(
          "Failed to parse MQTT payload:",
          error,
          "Topic:",
          receivedTopic
        );
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

  // Handle rack click
  const handleRackClick = (rackNumber: number) => {
    setSelectedRack(rackNumber);
    setShowDetailModal(true);
  };

  // Mouse event handlers for 3D interaction
  const onMouseClick = useCallback((event: MouseEvent) => {
    if (!mountRef.current || !cameraRef.current || !sceneRef.current) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
    const intersects = raycasterRef.current.intersectObjects(
      clickableObjectsRef.current,
      true
    );

    if (intersects.length > 0) {
      const clickedObject = intersects[0].object;
      const rackNumber = clickedObject.userData?.rackNumber;

      if (rackNumber) {
        handleRackClick(rackNumber);
      }
    }
  }, []);

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

    console.log("Subscribing to topics:", allTopics);

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

  // Create circular label - optimized
  const createCircularLabel = useCallback(
    (text: string, backgroundColor: string = "black", data?: RackData) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return null;

      canvas.width = 256;
      canvas.height = 256;

      // Draw circle
      context.fillStyle = backgroundColor;
      context.beginPath();
      context.arc(128, 128, 100, 0, Math.PI * 2);
      context.fill();

      // Draw main text (rack number)
      context.fillStyle = backgroundColor === "yellow" ? "black" : "white";
      context.font = "bold 48px Arial";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 128, 100);

      // Add temperature and humidity if available
      if (data && !text.includes("DUMMY")) {
        context.font = "20px Arial";
        context.fillText(`${data.Temperature}°C`, 128, 140);
        context.fillText(`${data.Humidity}%`, 128, 165);
      }

      const texture = new THREE.CanvasTexture(canvas);
      texture.generateMipmaps = false;
      texture.needsUpdate = true;
      return texture;
    },
    []
  );

  // Get rack label color - optimized logic
  const getRackLabelColor = useCallback(
    (rackNumber: number) => {
      if (config.dummyRack.includes(rackNumber)) {
        return "gray";
      }

      const data = rackValues[rackNumber];
      if (
        data &&
        data.Temperature !== undefined &&
        data.Humidity !== undefined
      ) {
        const temp = data.Temperature;
        const hum = data.Humidity;

        // Critical conditions (red)
        if (temp < 15 || temp > 30 || hum < 30 || hum > 70) {
          return "red";
        }
        // Warning conditions (yellow)
        else if (
          (temp >= 15 && temp <= 17) ||
          (temp >= 28 && temp <= 30) ||
          (hum >= 30 && hum <= 39) ||
          (hum >= 61 && hum <= 70)
        ) {
          return "yellow";
        }
        // Normal conditions (green)
        else if (temp >= 18 && temp <= 27 && hum >= 40 && hum <= 60) {
          return "green";
        }
      }
      return "black"; // No data
    },
    [config.dummyRack, rackValues]
  );

  // Update rack labels - optimized
  const updateRackLabels = useCallback(() => {
    rackLabelsRef.current.forEach((label, index) => {
      const rackNumber = index + 1;
      const newColor = getRackLabelColor(rackNumber);
      const data = rackValues[rackNumber];
      const isDummy = config.dummyRack.includes(rackNumber);

      if (
        label.userData?.backgroundColor !== newColor ||
        label.userData?.lastUpdate !== data?.Timestamp
      ) {
        const newTexture = createCircularLabel(
          isDummy ? "DUMMY" : rackNumber.toString(),
          newColor,
          isDummy ? undefined : data
        );

        if (newTexture && label.material instanceof THREE.SpriteMaterial) {
          // Dispose old texture to prevent memory leaks
          if (label.material.map) {
            label.material.map.dispose();
          }
          label.material.map = newTexture;
          label.userData = {
            backgroundColor: newColor,
            lastUpdate: data?.Timestamp,
            rackNumber: rackNumber,
          };
        }
      }
    });
  }, [getRackLabelColor, createCircularLabel, rackValues, config.dummyRack]);

  // Animate doors
  const animateDoors = useCallback(() => {
    frontDoorsRef.current.forEach((door) => {
      const targetX = frontDoorStatus ? 0.0 : 0.5;
      if (Math.abs(door.position.x - targetX) > 0.01) {
        door.position.x += (targetX - door.position.x) * 0.1;
      }
    });

    backDoorsRef.current.forEach((door) => {
      const targetX = backDoorStatus ? 0.0 : -0.5;
      if (Math.abs(door.position.x - targetX) > 0.01) {
        door.position.x += (targetX - door.position.x) * 0.1;
      }
    });
  }, [frontDoorStatus, backDoorStatus]);

  // Animate ceiling
  const animateCeiling = useCallback(() => {
    ceilingPartsRef.current.forEach((pivot) => {
      const targetRotation = solenoidStatus ? Math.PI / 2 : 0;
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

  // Create 3D scene - optimized for performance
  const createScene = useCallback(() => {
    if (!mountRef.current) return;

    // Clear previous scene
    if (sceneRef.current) {
      // Dispose of geometries and materials
      sceneRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          if (child.geometry) child.geometry.dispose();
          if (child.material) {
            if (Array.isArray(child.material)) {
              child.material.forEach((material) => material.dispose());
            } else {
              child.material.dispose();
            }
          }
        }
      });

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
    clickableObjectsRef.current = [];

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

    // Renderer - optimized settings
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
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

    // Add mouse event listener
    renderer.domElement.addEventListener("click", onMouseClick);

    // Lighting - optimized
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024; // Reduced for performance
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controlsRef.current = controls;

    // Materials - reused for performance
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

    // Shared geometries for performance
    const rackGeometry = new THREE.BoxGeometry(0.67, 2.0, 1.2);
    const serverGeometry = new THREE.BoxGeometry(0.62, 0.15, 1.1);
    const doorGeometry = new THREE.BoxGeometry(0.65, 2.0, 0.03);

    // Create rack function - optimized
    const createRackServer = (rackNumber: number) => {
      const rackGroup = new THREE.Group();
      rackGroup.userData = { rackNumber };

      const isDummy = config.dummyRack.includes(rackNumber);

      // Frame
      const frame = new THREE.Mesh(
        rackGeometry,
        isDummy
          ? new THREE.MeshStandardMaterial({
              color: 0x666666,
              opacity: 0.5,
              transparent: true,
              wireframe: true,
            })
          : frameMaterial
      );
      frame.position.z = -0.6;
      frame.castShadow = true;
      frame.receiveShadow = true;
      frame.userData = { rackNumber, clickable: true };
      rackGroup.add(frame);
      clickableObjectsRef.current.push(frame);

      // Server units - reduced count for performance
      const numUnits = isDummy ? 5 : 8; // Less units for better performance
      const unitHeight = 2.0 / numUnits;

      for (let i = 0; i < numUnits; i++) {
        const serverUnit = new THREE.Mesh(
          serverGeometry,
          isDummy ? dummyServerMaterial : serverMaterial
        );
        serverUnit.position.y = i * unitHeight - 1.0 + unitHeight / 2;
        serverUnit.position.z = -0.5;
        serverUnit.castShadow = true;
        serverUnit.userData = { rackNumber, clickable: true };

        if (isDummy) {
          serverUnit.userData.isDummy = true;
          serverUnit.userData.originalScale = serverUnit.scale.clone();
        }

        rackGroup.add(serverUnit);
        clickableObjectsRef.current.push(serverUnit);
      }

      // Doors
      const frontDoor = new THREE.Mesh(doorGeometry, doorMaterial);
      frontDoor.position.z = 0.1;
      frontDoor.userData = {
        position: "front",
        rack: rackNumber,
        rackNumber,
        clickable: true,
      };
      rackGroup.add(frontDoor);
      frontDoorsRef.current.push(frontDoor);
      clickableObjectsRef.current.push(frontDoor);

      const backDoor = new THREE.Mesh(doorGeometry, doorMaterial);
      backDoor.position.z = -1.2;
      backDoor.userData = {
        position: "back",
        rack: rackNumber,
        rackNumber,
        clickable: true,
      };
      rackGroup.add(backDoor);
      backDoorsRef.current.push(backDoor);
      clickableObjectsRef.current.push(backDoor);

      // Label
      const labelTexture = createCircularLabel(
        isDummy ? "DUMMY" : rackNumber.toString(),
        getRackLabelColor(rackNumber),
        isDummy ? undefined : rackValues[rackNumber]
      );

      if (labelTexture) {
        const spriteMaterial = new THREE.SpriteMaterial({
          map: labelTexture,
          transparent: true,
        });
        const label = new THREE.Sprite(spriteMaterial);
        label.scale.set(0.5, 0.5, 1);
        label.position.set(0, 1, -1.25);
        label.userData = {
          backgroundColor: getRackLabelColor(rackNumber),
          rackNumber,
          clickable: true,
        };
        rackGroup.add(label);
        rackLabelsRef.current.push(label);
        clickableObjectsRef.current.push(label);
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

      // Add covers - simplified
      const sideCoverLeft = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 2.0, 0.5),
        coverMaterial
      );
      sideCoverLeft.position.x = -(numRacks * 0.67) / 2 - 0.05;
      rowGroup.add(sideCoverLeft);

      const sideCoverRight = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 2.0, 0.5),
        coverMaterial
      );
      sideCoverRight.position.x = (numRacks * 0.67) / 2 + 0.05;
      rowGroup.add(sideCoverRight);

      const bottomCover = new THREE.Mesh(
        new THREE.BoxGeometry(0.75 * numRacks, 0.05, 2.8),
        floorMaterial
      );
      bottomCover.position.y = -1.0;
      rowGroup.add(bottomCover);

      return rowGroup;
    };

    // Create ceiling - simplified
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

    // Animation loop - optimized for performance
    let lastUpdateTime = 0;
    const targetFPS = 30; // Limit FPS for better performance on Pi
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      animationRef.current = requestAnimationFrame(animate);

      // Throttle animation updates
      if (currentTime - lastUpdateTime < frameInterval) {
        controls.update();
        renderer.render(scene, camera);
        return;
      }
      lastUpdateTime = currentTime;

      // Animate dummy racks breathing effect - reduced frequency
      if (Math.floor(currentTime / 200) % 3 === 0) {
        // Update every 600ms
        scene.traverse((child) => {
          if (child.userData?.isDummy) {
            const time = currentTime * 0.001;
            const scale = 1 + Math.sin(time * 1.5) * 0.03; // Reduced animation intensity
            child.scale.setScalar(scale);
          }
        });
      }

      // Update labels less frequently
      if (Math.floor(currentTime / 500) % 2 === 0) {
        // Update every 1000ms
        updateRackLabels();
      }

      animateDoors();
      animateCeiling();

      controls.update();
      renderer.render(scene, camera);
    };

    animate(0);

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("click", onMouseClick);
      cancelAnimationFrame(animationRef.current);

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      // Cleanup geometries and materials
      rackGeometry.dispose();
      serverGeometry.dispose();
      doorGeometry.dispose();
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
    onMouseClick,
    rackValues,
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

  // Get overall statistics
  const getOverallStats = () => {
    const activeRacks = Object.keys(rackValues).filter(
      (key) => !config.dummyRack.includes(Number(key))
    );

    const temps = activeRacks
      .map((key) => rackValues[Number(key)]?.Temperature)
      .filter((t) => t !== undefined);
    const hums = activeRacks
      .map((key) => rackValues[Number(key)]?.Humidity)
      .filter((h) => h !== undefined);

    const avgTemp =
      temps.length > 0
        ? (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
        : "N/A";
    const avgHum =
      hums.length > 0
        ? (hums.reduce((a, b) => a + b, 0) / hums.length).toFixed(1)
        : "N/A";

    return { avgTemp, avgHum, activeCount: activeRacks.length };
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
    const stats = getOverallStats();

    return (
      <div className="relative w-full h-full group">
        {/* 3D Viewport */}
        <div
          ref={mountRef}
          className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner cursor-pointer"
        />

        {/* Detail Modal */}
        <DetailModal
          isOpen={showDetailModal}
          onClose={() => setShowDetailModal(false)}
          rackNumber={selectedRack || 0}
          data={selectedRack ? rackValues[selectedRack] : null}
        />

        {/* Alert Message */}
        {alertMessage && (
          <div className="absolute bottom-0 left-0 m-3 z-20">
            <div className="alert alert-info bg-blue-100 border border-blue-300 text-blue-800 px-4 py-2 rounded-lg shadow-lg">
              {alertMessage}
            </div>
          </div>
        )}

        {/* Connection Status */}
        <div className="absolute top-3 left-3 z-10">
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-xl px-3 py-2 rounded-xl shadow-xl border border-white/30">
            <ConnectionIcon className={`h-4 w-4 ${connectionInfo.color}`} />
            <span className="text-sm font-medium text-gray-700">
              {connectionInfo.text}
            </span>
          </div>
        </div>

        {/* Emergency Status */}
        <div className="absolute top-3 left-40 z-10">
          <div className="flex items-center space-x-2 bg-white/90 backdrop-blur-xl px-3 py-2 rounded-xl shadow-xl border border-white/30">
            <Shield
              className={`h-4 w-4 ${
                emergencyButtonState
                  ? "text-red-500 animate-pulse"
                  : "text-green-500"
              }`}
            />
            <span className="text-sm font-medium text-gray-700">
              {emergencyButtonState ? "Emergency Active" : "Normal"}
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

        {/* Status Panel with Live Data */}
        <div className="absolute bottom-4 right-4 z-10">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-3 shadow-xl border border-white/30">
            <div className="space-y-2">
              {/* Average Temperature */}
              <div className="flex items-center space-x-3">
                <Thermometer className="h-4 w-4 text-red-500" />
                <span className="text-xs text-gray-600">Avg Temp:</span>
                <span className="text-sm font-medium text-gray-800">
                  {stats.avgTemp !== "N/A" ? `${stats.avgTemp}°C` : "N/A"}
                </span>
              </div>

              {/* Average Humidity */}
              <div className="flex items-center space-x-3">
                <Droplets className="h-4 w-4 text-blue-500" />
                <span className="text-xs text-gray-600">Avg Hum:</span>
                <span className="text-sm font-medium text-gray-800">
                  {stats.avgHum !== "N/A" ? `${stats.avgHum}%` : "N/A"}
                </span>
              </div>

              {/* Door Status */}
              <div className="flex items-center space-x-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    frontDoorStatus && backDoorStatus
                      ? "bg-green-500"
                      : "bg-red-500"
                  }`}
                />
                <span className="text-xs text-gray-600">Doors:</span>
                <span className="text-sm font-medium text-gray-800">
                  {frontDoorStatus && backDoorStatus ? "Closed" : "Open"}
                </span>
              </div>

              {/* Ceiling Status */}
              <div className="flex items-center space-x-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    solenoidStatus ? "bg-orange-500" : "bg-gray-400"
                  }`}
                />
                <span className="text-xs text-gray-600">Ceiling:</span>
                <span className="text-sm font-medium text-gray-800">
                  {solenoidStatus ? "Open" : "Closed"}
                </span>
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
                {config.totalRack} Total • {stats.activeCount} Active •{" "}
                {config.dummyRack.length} Dummy
              </div>
            </div>
          </div>
        </div>

        {/* Click Instructions */}
        <div className="absolute top-20 left-3 z-10">
          <div className="bg-white/90 backdrop-blur-xl px-3 py-2 rounded-xl shadow-xl border border-white/30">
            <div className="text-xs text-gray-600">
              💡 Click on any rack to view details
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

        /* Responsive design - optimized for Pi */
        @media (max-width: 768px) {
          .absolute.top-4.left-4,
          .absolute.top-3.left-3 {
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

          .text-xs {
            font-size: 0.7rem;
          }
        }

        /* Hover effects for clickable elements */
        .cursor-pointer:hover {
          filter: brightness(1.05);
        }
      `}</style>
    </Card>
  );
};
