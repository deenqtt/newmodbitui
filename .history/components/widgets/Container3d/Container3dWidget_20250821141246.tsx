// File: components/widgets/Container3d/Container3dWidget.tsx
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
  ZoomIn,
  ZoomOut,
  X,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    topicsTemp: [string[], string[]]; // [frontTopics, backTopics]
    topicPower: string;
  };
}

// Container and Rack dimensions (in cm, converted to meters in code)
const containerDimensions = {
  length: 1219.2, // Length in cm
  width: 243.8, // Width in cm  
  height: 259.1, // Height in cm
};

const rackDimensions = {
  height: 186.69, // Height of 42U rack in cm
  width: 100, // Width of rack in cm
  depth: 60, // Depth of rack in cm
};

export const Container3dWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [leftCoverVisible, setLeftCoverVisible] = useState(true);
  const [selectedRack, setSelectedRack] = useState<THREE.Mesh | null>(null);
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2());
  
  // Refs for 3D objects
  const containerMeshRef = useRef<THREE.Mesh | null>(null);
  const containerCoversRef = useRef<THREE.Mesh[]>([]);
  const rackMeshesRef = useRef<{ mesh: THREE.Mesh; rackNumber: number }[]>([]);
  const initialMaterialsRef = useRef<(THREE.Material | null)[]>([]);
  const originalCameraPositionRef = useRef(new THREE.Vector3());
  const detailRackGroupRef = useRef(new THREE.Group>(new THREE.Group());

  // MQTT clients for each rack
  const mqttClientsRef = useRef<{ [key: string]: any }>({});

  // Fixed 11 racks
  const totalRacks = 11;

  // Validate config
  useEffect(() => {
    if (!config.customName || !config.topicsTemp || !config.topicsTemp[0]) {
      setStatus("error");
      setErrorMessage("Container configuration incomplete");
      return;
    }
    setStatus("ok");
  }, [config]);

  // Create enhanced circular label texture
  const createCircularLabel = useCallback((text: string, bgColor: string) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    canvas.width = 128;
    canvas.height = 128;

    // Create gradient background
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 50);
    if (bgColor === "red") {
      gradient.addColorStop(0, "#ff4444");
      gradient.addColorStop(1, "#cc2222");
    } else {
      gradient.addColorStop(0, "#00ff88");
      gradient.addColorStop(1, "#00cc66");
    }

    context.fillStyle = gradient;
    context.beginPath();
    context.arc(64, 64, 50, 0, Math.PI * 2);
    context.fill();

    // Add subtle border
    context.strokeStyle = "rgba(255,255,255,0.3)";
    context.lineWidth = 2;
    context.stroke();

    // Add text with shadow
    context.shadowColor = "rgba(0,0,0,0.5)";
    context.shadowBlur = 4;
    context.fillStyle = "white";
    context.font = "bold 24px 'Inter', Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
    return texture;
  }, []);

  // Create label for racks
  const createRackLabel = useCallback((
    rackNumber: number,
    positionX: number,
    positionY: number,
    positionZ: number,
    direction: "front" | "back"
  ) => {
    const group = new THREE.Group();

    // Create text elements using canvas textures instead of troika-three-text
    const createTextTexture = (text: string, color: string = "#ffffff", fontSize: number = 32) => {
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d");
      if (!context) return null;
      
      canvas.width = 256;
      canvas.height = 64;
      
      context.fillStyle = color;
      context.font = `bold ${fontSize}px 'Inter', Arial, sans-serif`;
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText(text, 128, 32);
      
      return new THREE.CanvasTexture(canvas);
    };

    // Rack name label
    const rackNameTexture = createTextTexture(`Rack${rackNumber}`, "#ffffff", 28);
    if (rackNameTexture) {
      const rackNameMaterial = new THREE.SpriteMaterial({ 
        map: rackNameTexture, 
        transparent: true 
      });
      const rackNameSprite = new THREE.Sprite(rackNameMaterial);
      rackNameSprite.scale.set(1, 0.25, 1);
      rackNameSprite.position.set(0, -0.05, 0);
      rackNameSprite.name = `rack-${rackNumber}-${direction}-rack-label`;
      group.add(rackNameSprite);
    }

    // Temperature label
    const tempTexture = createTextTexture("🌡N/A", "#ffff00", 24);
    if (tempTexture) {
      const tempMaterial = new THREE.SpriteMaterial({ 
        map: tempTexture, 
        transparent: true 
      });
      const tempSprite = new THREE.Sprite(tempMaterial);
      tempSprite.scale.set(0.8, 0.2, 1);
      tempSprite.position.set(0, -0.3, 0);
      tempSprite.name = `rack-${rackNumber}-${direction}-temp-label`;
      group.add(tempSprite);
    }

    // Humidity label
    const humTexture = createTextTexture("💧N/A", "#87ceeb", 24);
    if (humTexture) {
      const humMaterial = new THREE.SpriteMaterial({ 
        map: humTexture, 
        transparent: true 
      });
      const humSprite = new THREE.Sprite(humMaterial);
      humSprite.scale.set(0.8, 0.2, 1);
      humSprite.position.set(0, -0.5, 0);
      humSprite.name = `rack-${rackNumber}-${direction}-humidity-label`;
      group.add(humSprite);
    }

    // Set group position
    group.position.set(positionX, positionY + 0.75, positionZ + 1.35);
    
    // Rotate for back side
    if (direction === "back") {
      group.rotation.y = Math.PI;
    }

    group.name = `rack-${rackNumber}-${direction}-label-group`;
    return group;
  }, []);

  // Handle MQTT messages for temperature topics
  const handleTemperatureMessage = useCallback((
    receivedTopic: string, 
    payloadString: string, 
    rackIndex: number, 
    direction: "front" | "back"
  ) => {
    try {
      const payload = JSON.parse(payloadString);
      if (!payload.value) {
        console.warn(`🚨 [Rack ${rackIndex + 1} - ${direction}] Empty payload.`);
        return;
      }

      const valueData = JSON.parse(payload.value);
      const temp = valueData.temp ?? "N/A";
      const humidity = valueData.hum ?? "N/A";

      // Color based on temperature value
      const tempColor = temp === "N/A" ? "#ffffff" : 
                       temp > 40 ? "#ff0000" : 
                       temp > 30 ? "#ffff00" : "#00ff00";

      // Color based on humidity value  
      const humColor = humidity === "N/A" ? "#ffffff" :
                      humidity > 60 ? "#ff0000" :
                      humidity > 40 ? "#ffff00" : "#00ff00";

      if (!sceneRef.current) return;

      // Update temperature label
      const tempLabel = sceneRef.current.getObjectByName(
        `rack-${rackIndex + 1}-${direction}-temp-label`
      ) as THREE.Sprite;
      
      if (tempLabel && tempLabel.material.map) {
        const canvas = tempLabel.material.map.image;
        const context = canvas.getContext("2d");
        if (context) {
          context.clearRect(0, 0, 256, 64);
          context.fillStyle = tempColor;
          context.font = "bold 24px 'Inter', Arial, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(`🌡${temp}°C`, 128, 32);
          tempLabel.material.map.needsUpdate = true;
        }
      }

      // Update humidity label
      const humidityLabel = sceneRef.current.getObjectByName(
        `rack-${rackIndex + 1}-${direction}-humidity-label`
      ) as THREE.Sprite;
      
      if (humidityLabel && humidityLabel.material.map) {
        const canvas = humidityLabel.material.map.image;
        const context = canvas.getContext("2d");
        if (context) {
          context.clearRect(0, 0, 256, 64);
          context.fillStyle = humColor;
          context.font = "bold 24px 'Inter', Arial, sans-serif";
          context.textAlign = "center";
          context.textBaseline = "middle";
          context.fillText(`💧${humidity}%`, 128, 32);
          humidityLabel.material.map.needsUpdate = true;
        }
      }
    } catch (error) {
      console.error(
        `❌ Failed to parse MQTT message for Rack ${rackIndex + 1} (${direction}):`,
        error
      );
    }
  }, []);

  // Handle MQTT messages for power topic
  const handlePowerMessage = useCallback((receivedTopic: string, payloadString: string) => {
    try {
      const payload = JSON.parse(payloadString);
      if (!payload.value) return;

      const valueData = JSON.parse(payload.value);

      // Update power for each rack
      for (let i = 0; i < totalRacks; i++) {
        const rackNumber = i + 1;
        const powerKey = `pue_PDU-${rackNumber}`;
        let powerValue = valueData[powerKey] ?? "null";

        if (typeof powerValue === "string" && powerValue.includes("%")) {
          powerValue = parseFloat(powerValue.replace("%", ""));
        } else {
          powerValue = parseFloat(powerValue) * 100;
        }

        powerValue = Math.min(powerValue, 100); // Max 100%
        updateObjectInRack(rackNumber, powerValue);
      }
    } catch (error) {
      console.error("❌ Failed to parse power topic message:", error);
    }
  }, []);

  // MQTT subscription effect
  useEffect(() => {
    if (!isReady || connectionStatus !== "Connected") return;

    const { topicsTemp, topicPower } = config;
    const [frontTopics, backTopics] = topicsTemp;

    // Subscribe to front topics  
    frontTopics.forEach((topic, index) => {
      if (topic && topic.trim()) {
        const handler = (receivedTopic: string, payload: string) =>
          handleTemperatureMessage(receivedTopic, payload, index, "front");
        subscribe(topic, handler);
      }
    });

    // Subscribe to back topics if available
    if (backTopics && backTopics.length > 0) {
      backTopics.forEach((topic, index) => {
        if (topic && topic.trim()) {
          const handler = (receivedTopic: string, payload: string) =>
            handleTemperatureMessage(receivedTopic, payload, index, "back");
          subscribe(topic, handler);
        }
      });
    }

    // Subscribe to power topic
    if (topicPower && topicPower.trim()) {
      subscribe(topicPower, handlePowerMessage);
    }

    return () => {
      // Cleanup subscriptions
      frontTopics.forEach((topic) => {
        if (topic && topic.trim()) {
          unsubscribe(topic, (t: string, p: string) => 
            handleTemperatureMessage(t, p, 0, "front"));
        }
      });

      if (backTopics && backTopics.length > 0) {
        backTopics.forEach((topic) => {
          if (topic && topic.trim()) {
            unsubscribe(topic, (t: string, p: string) => 
              handleTemperatureMessage(t, p, 0, "back"));
          }
        });
      }

      if (topicPower && topicPower.trim()) {
        unsubscribe(topicPower, handlePowerMessage);
      }
    };
  }, [
    config, 
    isReady, 
    connectionStatus, 
    subscribe, 
    unsubscribe, 
    handleTemperatureMessage, 
    handlePowerMessage
  ]);

  // Create enhanced 3D objects
  const createContainer = useCallback(() => {
    const geometry = new THREE.BoxGeometry(
      containerDimensions.length / 100,
      containerDimensions.height / 100,
      containerDimensions.width / 100
    );

    const materials = [
      new THREE.MeshStandardMaterial({ color: 0xe3e3e3, side: THREE.DoubleSide }), // Front
      new THREE.MeshStandardMaterial({ color: 0xe3e3e3, side: THREE.DoubleSide }), // Back
      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }), // Top
      new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }), // Bottom
      null, // Left (open)
      new THREE.MeshStandardMaterial({ color: 0xe3e3e3, side: THREE.DoubleSide }), // Right
    ];

    initialMaterialsRef.current = materials.map((material) =>
      material ? material.clone() : null
    );

    const containerMesh = new THREE.Mesh(geometry, materials);
    containerMeshRef.current = containerMesh;
    return containerMesh;
  }, []);

  const createRack = useCallback((
    positionX: number,
    positionY: number,
    positionZ: number,
    color: number,
    customDimensions: any = null,
    opacity: number = 1
  ) => {
    const dimensions = customDimensions || rackDimensions;

    const geometry = new THREE.BoxGeometry(
      dimensions.width / 100,
      dimensions.height / 100,
      dimensions.depth / 100
    );

    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: opacity < 1,
      opacity: opacity,
    });
    
    const rack = new THREE.Mesh(geometry, material);
    rack.position.set(positionX, positionY, positionZ);
    rack.rotation.y = Math.PI / 2;
    return rack;
  }, []);

  const createObjectInsideRack = useCallback((
    positionX: number,
    positionY: number,
    positionZ: number,
    heightPercentage: number
  ) => {
    const maxHeight = rackDimensions.height / 100;
    const objectHeight = (maxHeight * Math.max(heightPercentage, 0)) / 100;

    const geometry = new THREE.BoxGeometry(
      0.55,
      objectHeight,
      rackDimensions.depth / 100 + 0.02
    );

    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    const objectMesh = new THREE.Mesh(geometry, material);

    objectMesh.position.set(
      positionX,
      positionY - maxHeight / 2 + objectHeight / 2 - 0.02,
      positionZ + 1
    );
    objectMesh.name = `rack-${Math.round(positionX * 10)}-power`;

    return objectMesh;
  }, []);

  // Color interpolation for power values
  const interpolateColor = useCallback((value: number, minColor: number, midColor: number, maxColor: number) => {
    let color;
    if (value <= 50) {
      let ratio = value / 50;
      color = new THREE.Color().lerpColors(
        new THREE.Color(minColor),
        new THREE.Color(midColor),
        ratio
      );
    } else {
      let ratio = (value - 50) / 50;
      color = new THREE.Color().lerpColors(
        new THREE.Color(midColor),
        new THREE.Color(maxColor),
        ratio
      );
    }
    return color;
  }, []);

  // Update power object in rack
  const updateObjectInRack = useCallback((rackNumber: number, powerValue: number) => {
    if (!sceneRef.current) return;

    const rackObject = sceneRef.current.getObjectByName(`rack-${rackNumber}-power`);
    if (!rackObject) {
      console.warn(`⚠️ Rack ${rackNumber} power object not found.`);
      return;
    }

    let newHeightPercentage = parseFloat(powerValue.toString());
    if (isNaN(newHeightPercentage) || newHeightPercentage < 0) {
      newHeightPercentage = 0;
    }

    newHeightPercentage = Math.min(newHeightPercentage, 100);

    const maxHeight = rackDimensions.height / 100;
    const newHeight = (maxHeight * newHeightPercentage) / 100;

    if (isNaN(newHeight)) {
      console.error(`❌ Invalid height computed: ${newHeight} for Rack ${rackNumber}`);
      return;
    }

    // Get color based on power value
    const newColor = interpolateColor(newHeightPercentage, 0x00ff00, 0xffff00, 0xff0000);

    // Update object height and color
    const mesh = rackObject as THREE.Mesh;
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BoxGeometry(
      0.55,
      newHeight,
      rackDimensions.depth / 100 + 0.02
    );

    (mesh.material as THREE.MeshStandardMaterial).color.set(newColor);

    // Update position
    mesh.position.y = rackDimensions.height / 200 - maxHeight / 2 + newHeight / 2 - 0.02;
  }, [interpolateColor]);

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

  // Handle rack click
  const handleRackClick = useCallback((event: MouseEvent) => {
    if (!mountRef.current || !cameraRef.current || isZoomedIn) return;

    const rect = mountRef.current.getBoundingClientRect();
    mouse.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.current.setFromCamera(mouse.current, cameraRef.current);
    const intersects = raycaster.current.intersectObjects(
      rackMeshesRef.current.map((r) => r.mesh)
    );

    if (intersects.length > 0) {
      const clickedRack = intersects[0].object as THREE.Mesh;
      const rackData = rackMeshesRef.current.find((r) => r.mesh === clickedRack);
      
      if (rackData) {
        // Here you can add navigation logic
        console.log(`Clicked on Rack ${rackData.rackNumber}`);
        // Example: window.location.href = `#/rackdetail/${rackData.rackNumber}`;
      }
    }
  }, [isZoomedIn]);

  // Create enhanced 3D scene
  const createScene = useCallback(() => {
    if (!mountRef.current) return;

    // Clean up previous scene
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

    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Create camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(-5, 5, 8);
    originalCameraPositionRef.current.copy(camera.position);
    cameraRef.current = camera;

    // Create renderer
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
    rendererRef.current = renderer;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Add click event listener
    renderer.domElement.addEventListener('click', handleRackClick);

    // Create controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 20;
    controls.maxPolarAngle = Math.PI / 1.8;
    controlsRef.current = controls;

    // Enhanced lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(0, 5, 5);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;

    scene.add(ambientLight, directionalLight);

    // Create container
    const container = createContainer();
    container.position.y = containerDimensions.height / 200;
    scene.add(container);

    // Create 11 fixed racks
    const racks: { mesh: THREE.Mesh; rackNumber: number }[] = [];
    
    for (let i = 0; i < totalRacks; i++) {
      const rackNumber = i + 1;
      const positionX = -3.5 + i * 0.7;
      const positionY = rackDimensions.height / 200;
      const positionZ = -rackDimensions.depth / 200 - 0.5;

      // Create rack mesh
      const rackMesh = createRack(positionX, positionY, 0, 0x000000);
      rackMesh.name = `rack-${rackNumber}`;
      rackMesh.userData = { rackNumber };
      scene.add(rackMesh);

      racks.push({ mesh: rackMesh, rackNumber });

      // Create front label if front topic exists
      if (config.topicsTemp[0] && config.topicsTemp[0][i]) {
        const frontLabel = createRackLabel(
          rackNumber,
          positionX,
          positionY,
          -rackDimensions.depth / 200 - 0.4,
          "front"
        );
        scene.add(frontLabel);
      }

      // Create back label if back topic exists
      if (config.topicsTemp[1] && config.topicsTemp[1][i]) {
        const backLabel = createRackLabel(
          rackNumber,
          positionY,
          positionY,
          rackDimensions.depth / 200 - 2.25,
          "back"
        );
        scene.add(backLabel);
      }

      // Create power object (default 0%)
      const powerObject = createObjectInsideRack(
        positionX,
        positionY,
        positionZ,
        0
      );
      powerObject.name = `rack-${rackNumber}-power`;
      scene.add(powerObject);
    }

    rackMeshesRef.current = racks;

    // Setup ResizeObserver
    if (mountRef.current) {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          clearTimeout((resizeObserverRef.current as any)?.timeout);
          (resizeObserverRef.current as any).timeout = setTimeout(() => {
            handleResize();
          }, 16);
        }
      });

      resizeObserverRef.current.observe(mountRef.current);
    }

    // Animation loop
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
      renderer.domElement.removeEventListener('click', handleRackClick);

      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [
    config, 
    createContainer, 
    createRack, 
    createRackLabel, 
    createObjectInsideRack, 
    handleResize, 
    handleRackClick
  ]);

  // Initialize scene when status changes
  useEffect(() => {
    if (status === "ok") {
      const cleanup = createScene();
      return cleanup;
    }
  }, [status, createScene]);

  // Enhanced set view with smooth animations
  const setView = useCallback((view: "front" | "back" | "top" | "side") => {
    if (!cameraRef.current || !controlsRef.current || isAnimating) return;

    setIsAnimating(true);
    let targetPosition: THREE.Vector3;

    switch (view) {
      case "front":
        targetPosition = new THREE.Vector3(-8, 0, 0);
        break;
      case "back":
        targetPosition = new THREE.Vector3(8, 0, 0);
        break;
      case "top":
        targetPosition = new THREE.Vector3(0, 10, 0);
        break;
      case "side":
        targetPosition = new THREE.Vector3(0, 0, -8);
        break;
      default:
        setIsAnimating(false);
        return;
    }

    const startPosition = cameraRef.current.position.clone();
    const startTime = Date.now();
    const duration = 800;

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
  }, [isAnimating]);

  // Enhanced reset view
  const resetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current || isAnimating) return;

    setIsAnimating(true);
    const startPosition = cameraRef.current.position.clone();
    const targetPosition = originalCameraPositionRef.current.clone();
    const startTime = Date.now();
    const duration = 800;

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
  }, [isAnimating]);

  // Toggle left cover visibility
  const toggleLeftCover = useCallback(() => {
    if (!sceneRef.current) return;

    containerCoversRef.current.forEach((cover) => {
      if (leftCoverVisible) {
        sceneRef.current!.remove(cover);
        const edges = cover.userData.edges;
        if (edges) {
          sceneRef.current!.remove(edges);
        }
      } else {
        sceneRef.current!.add(cover);
        if (cover.userData.edges) {
          sceneRef.current!.add(cover.userData.edges);
        }
      }
    });

    setLeftCoverVisible(!leftCoverVisible);
  }, [leftCoverVisible]);

  // Enhanced loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden">
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          animation: "shimmer 2s infinite",
        }}
      />

      <div className="flex flex-col items-center space-y-4 z-10">
        <div className="relative">
          <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />
          <div className="absolute inset-0 h-12 w-12 border-4 border-blue-200 rounded-full animate-pulse" />
        </div>
        <div className="text-center space-y-2">
          <div className="h-4 w-32 bg-slate-200 rounded-full animate-pulse" />
          <div className="h-3 w-24 bg-slate-200 rounded-full animate-pulse mx-auto" />
        </div>
      </div>

      <style jsx>{`
        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );

  // Enhanced error state
  const renderErrorState = () => (
    <div className="w-full h-full bg-gradient-to-br from-red-50 to-red-100 rounded-xl flex items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-sm">
        <div className="relative mx-auto w-16 h-16">
          <AlertTriangle className="h-16 w-16 text-red-500 animate-bounce" />
          <div className="absolute inset-0 h-16 w-16 border-4 border-red-200 rounded-full animate-ping opacity-30" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-red-800">
            Configuration Error
          </h3>
          <p className="text-sm text-red-600 leading-relaxed">{errorMessage}</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.reload()}
          className="border-red-300 text-red-700 hover:bg-red-50 transition-all duration-200"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Retry Connection
        </Button>
      </div>
    </div>
  );

  // Get connection status info
  const getConnectionStatus = () => {
    const isConnected = connectionStatus === "Connected";
    return {
      icon: isConnected ? Wifi : WifiOff,
      color: isConnected ? "text-green-500" : "text-red-500",
      bgColor: isConnected ? "bg-green-50" : "bg-red-50",
      text: isConnected ? "Connected" : "Disconnected",
    };
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

    return (
      <div className="relative w-full h-full group">
        {/* 3D Viewport */}
        <div
          ref={mountRef}
          className="w-full h-full rounded-xl overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 shadow-inner"
          style={{
            background:
              "radial-gradient(ellipse at center, #f8fafc 0%, #e2e8f0 100%)",
          }}
        />

        {/* Enhanced Control Panel */}
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
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleLeftCover}
                disabled={isAnimating}
                className="h-8 w-8 p-0 hover:bg-white/60 transition-all duration-200 hover:scale-105 disabled:opacity-50"
                title="Toggle Cover"
              >
                {leftCoverVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        )}

        {/* Enhanced Action Buttons */}
        <div className="absolute top-3 right-3 flex gap-2 z-10">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 bg-white/80 backdrop-blur-md hover:bg-white/90 transition-all duration-200 hover:scale-105 shadow-lg border border-white/20"
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
            className="h-8 w-8 p-0 bg-white/80 backdrop-blur-md hover:bg-white/90 transition-all duration-200 hover:scale-105 shadow-lg border border-white/20"
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

        {/* Enhanced Status Bar */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10">
          {/* Container Name */}
          <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-lg shadow-lg border border-white/20 flex items-center space-x-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-800 truncate max-w-[200px]">
              {config.customName}
            </span>
          </div>

          {/* Connection Status */}
          <div
            className={`${connectionInfo.bgColor} backdrop-blur-md px-3 py-2 rounded-lg shadow-lg border border-white/20 flex items-center space-x-2`}
          >
            <ConnectionIcon className={`h-4 w-4 ${connectionInfo.color}`} />
            <span className="text-xs font-medium text-gray-700">
              {connectionInfo.text}
            </span>
          </div>
        </div>

        {/* Container Type Badge */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 z-10">
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-1 rounded-full shadow-lg">
            <span className="text-xs font-medium flex items-center space-x-2">
              <Move3D className="h-3 w-3" />
              <span>3D Container ({totalRacks} Racks)</span>
            </span>
          </div>
        </div>

        {/* Loading Animation Overlay */}
        {isAnimating && (
          <div className="absolute inset-0 bg-black/10 rounded-xl flex items-center justify-center z-20">
            <div className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-lg shadow-lg border border-white/20 flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <span className="text-sm font-medium text-gray-700">
                Animating...
              </span>
            </div>
          </div>
        )}

        {/* Hover Info Tooltip */}
        <div className="absolute bottom-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          <div className="bg-black/80 text-white px-3 py-2 rounded-lg text-xs max-w-[200px]">
            <div className="flex items-center space-x-1 mb-1">
              <Info className="h-3 w-3" />
              <span className="font-medium">3D Container Controls</span>
            </div>
            <div className="space-y-1 text-xs opacity-90">
              <div>• Drag to rotate view</div>
              <div>• Scroll to zoom in/out</div>
              <div>• Right-click to pan</div>
              <div>• Click rack to view details</div>
            </div>
          </div>
        </div>

        {/* Rack Info Panel */}
        {selectedRack && (
          <div className="absolute top-16 right-3 bg-white/95 backdrop-blur-md p-4 rounded-lg shadow-lg border border-white/20 max-w-sm z-10">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-800">
                Rack {selectedRack.userData.rackNumber}
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedRack(null)}
                className="h-6 w-6 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Temperature:</span>
                <span className="font-medium">N/A°C</span>
              </div>
              <div className="flex justify-between">
                <span>Humidity:</span>
                <span className="font-medium">N/A%</span>
              </div>
              <div className="flex justify-between">
                <span>Power Usage:</span>
                <span className="font-medium">0%</span>
              </div>
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
          : "border border-gray-200/60 shadow-sm hover:shadow-md"
      } bg-gradient-to-br from-white to-gray-50/50 backdrop-blur-sm`}
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
            transform: translateY(-4px);
          }
        }

        .animate-float {
          animation: float 3s ease-in-out infinite;
        }

        /* Custom scrollbar for mobile */
        ::-webkit-scrollbar {
          width: 4px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.1);
          border-radius: 2px;
        }

        ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 2px;
        }

        /* Responsive breakpoints */
        @media (max-width: 640px) {
          .control-panel {
            flex-direction: column;
            gap: 0.25rem;
          }

          .status-bar {
            flex-direction: column;
            align-items: flex-start;
            gap: 0.5rem;
          }
        }

        /* Glass morphism effect */
        .glass {
          background: rgba(255, 255, 255, 0.1);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255, 255, 255, 0.2);
        }

        /* Hover animations */
        .hover-lift:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }

        /* Focus animations */
        .focus-ring:focus {
          outline: none;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
      `}</style>
    </Card>
  );
};