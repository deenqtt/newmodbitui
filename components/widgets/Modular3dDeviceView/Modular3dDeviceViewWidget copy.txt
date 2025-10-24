// File: components/widgets/Modular3dDeviceView/Modular3dDeviceViewWidget.tsx
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
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

interface Props {
  config: {
    customName: string;
    deviceUniqId: string;
    topic: string;
    subrackType: string;
  };
}

export const Modular3dDeviceViewWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationRef = useRef<number>(0);
  const ledReferencesRef = useRef<THREE.Mesh[]>([]);
  const labelReferencesRef = useRef<THREE.Sprite[]>([]);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Validasi config
  useEffect(() => {
    if (!config.deviceUniqId || !config.topic || !config.subrackType) {
      setStatus("error");
      setErrorMessage("Device configuration incomplete");
      return;
    }

    setStatus("ok");
  }, [config.deviceUniqId, config.topic, config.subrackType]);

  // Handle MQTT messages
  const handleMqttMessage = useCallback(
    (receivedTopic: string, payloadString: string) => {
      try {
        const payload = JSON.parse(payloadString);
        const relayValues =
          typeof payload.value === "string"
            ? JSON.parse(payload.value)
            : payload.value || {};

        // Update LEDs and labels with smooth transitions
        Object.keys(relayValues).forEach((key, index) => {
          const state = relayValues[key];

          // Update LED with smooth color transition
          const led = ledReferencesRef.current[index];
          if (led) {
            const material = led.material as THREE.MeshStandardMaterial;
            const targetColor = new THREE.Color(state ? 0x00ff88 : 0xff4444);

            // Smooth color transition
            const startColor = material.color.clone();
            let progress = 0;
            const animate = () => {
              progress += 0.1;
              if (progress <= 1) {
                material.color.lerpColors(startColor, targetColor, progress);
                requestAnimationFrame(animate);
              }
            };
            animate();
          }

          // Update label
          const label = labelReferencesRef.current[index];
          if (label && label.material.map) {
            const canvas = label.material.map.image;
            const context = canvas.getContext("2d");
            if (context) {
              // Clear canvas
              context.clearRect(0, 0, 128, 128);

              // Create gradient background
              const gradient = context.createRadialGradient(
                64,
                64,
                0,
                64,
                64,
                50
              );
              if (state) {
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

              // Add glow effect
              context.shadowColor = state ? "#00ff88" : "#ff4444";
              context.shadowBlur = 10;
              context.fillStyle = "rgba(255,255,255,0.9)";
              context.font = "bold 32px 'Inter', Arial, sans-serif";
              context.textAlign = "center";
              context.textBaseline = "middle";
              context.fillText((index + 1).toString(), 64, 64);

              label.material.map.needsUpdate = true;
            }
          }
        });
      } catch (e) {
        console.error("Failed to parse MQTT payload for 3D device:", e);
      }
    },
    []
  );

  // MQTT subscription
  useEffect(() => {
    if (config.topic && isReady && connectionStatus === "Connected") {
      subscribe(config.topic, handleMqttMessage);
      return () => {
        unsubscribe(config.topic, handleMqttMessage);
      };
    }
  }, [
    config.topic,
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    handleMqttMessage,
  ]);

  // Create enhanced circular label texture
  const createCircularLabel = useCallback((text: string, bgColor: string) => {
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return null;

    canvas.width = 128;
    canvas.height = 128;

    // Create gradient background
    const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 50);
    gradient.addColorStop(0, bgColor);
    gradient.addColorStop(1, bgColor === "red" ? "#cc2222" : "#00cc66");

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
    context.font = "bold 32px 'Inter', Arial, sans-serif";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(text, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);
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

  // Create enhanced 3D scene
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
    labelReferencesRef.current = [];

    // Create scene with enhanced lighting
    const scene = new THREE.Scene();

    // Enhanced gradient background
    scene.background = new THREE.Color(0xf8fafc);
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Enhanced camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(4, 4, 4);
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
    renderer.toneMappingExposure = 1.2;
    rendererRef.current = renderer;

    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);

    // Add rim lighting
    const rimLight = new THREE.DirectionalLight(0x64b5f6, 0.3);
    rimLight.position.set(-10, 5, -10);
    scene.add(rimLight);

    // Enhanced controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 2;
    controls.maxDistance = 10;
    controls.maxPolarAngle = Math.PI / 1.8;
    controlsRef.current = controls;

    // Create enhanced device models
    const subrackType = config.subrackType;

    // Enhanced materials
    const mainBoxMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x2d3748,
      metalness: 0.8,
      roughness: 0.2,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });

    const pinMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x48bb78,
      metalness: 0.6,
      roughness: 0.3,
    });

    if (subrackType === "Relay") {
      // Enhanced main box with rounded edges
      const boxGeometry = new THREE.BoxGeometry(3.8, 0.8, 1.2);
      const mainBox = new THREE.Mesh(boxGeometry, mainBoxMaterial);
      mainBox.castShadow = true;
      mainBox.receiveShadow = true;
      scene.add(mainBox);

      // Enhanced pins and LEDs
      const greenGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
      const ledGeometry = new THREE.SphereGeometry(0.06, 32, 32);
      const spacing = 0.4;

      for (let i = 0; i < 8; i++) {
        const ledMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xff4444,
          emissive: 0x220000,
          emissiveIntensity: 0.5,
          metalness: 0.1,
          roughness: 0.1,
          transmission: 0.3,
        });

        // Enhanced pin
        const greenBlock = new THREE.Mesh(greenGeometry, pinMaterial);
        greenBlock.position.set(-1.45 + i * spacing, 0.35, 0.1);
        greenBlock.castShadow = true;
        scene.add(greenBlock);

        // Enhanced LED with glow
        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.set(-1.45 + i * spacing, 0.35 + 0.08, 0.1 - 0.5);
        led.castShadow = true;
        scene.add(led);
        ledReferencesRef.current.push(led);

        // Enhanced label
        const texture = createCircularLabel((i + 1).toString(), "red");
        if (texture) {
          const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.001,
          });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(0.5, 0.5, 1);
          sprite.position.set(-1.45 + i * spacing, 0.35 + 0.3, 0.1 - 1.2);
          scene.add(sprite);
          labelReferencesRef.current.push(sprite);
        }
      }
    } else if (subrackType === "Relay Mini") {
      // Similar enhancements for Relay Mini...
      const boxGeometry = new THREE.BoxGeometry(3, 0.7, 1.2);
      const mainBox = new THREE.Mesh(boxGeometry, mainBoxMaterial);
      mainBox.castShadow = true;
      mainBox.receiveShadow = true;
      scene.add(mainBox);

      const greenGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
      const ledGeometry = new THREE.SphereGeometry(0.06, 32, 32);
      const spacing = 0.4;

      for (let i = 0; i < 6; i++) {
        const ledMaterial = new THREE.MeshPhysicalMaterial({
          color: 0xff4444,
          emissive: 0x220000,
          emissiveIntensity: 0.5,
          metalness: 0.1,
          roughness: 0.1,
          transmission: 0.3,
        });

        const greenBlock = new THREE.Mesh(greenGeometry, pinMaterial);
        greenBlock.position.set(-1 + i * spacing, 0.35, 0.1);
        greenBlock.castShadow = true;
        scene.add(greenBlock);

        const led = new THREE.Mesh(ledGeometry, ledMaterial);
        led.position.set(-1 + i * spacing, 0.35 + 0.08, 0.1 - 0.5);
        led.castShadow = true;
        scene.add(led);
        ledReferencesRef.current.push(led);

        const texture = createCircularLabel((i + 1).toString(), "red");
        if (texture) {
          const material = new THREE.SpriteMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.001,
          });
          const sprite = new THREE.Sprite(material);
          sprite.scale.set(0.5, 0.5, 1);
          sprite.position.set(-1 + i * spacing, 0.35 + 0.3, 0.1 - 1.2);
          scene.add(sprite);
          labelReferencesRef.current.push(sprite);
        }
      }
    } else if (subrackType === "Drycontact" || subrackType === "Digital IO") {
      // Enhanced Drycontact/Digital IO...
      const boxGeometry = new THREE.BoxGeometry(3.8, 0.8, 1.5);
      const mainBox = new THREE.Mesh(boxGeometry, mainBoxMaterial);
      mainBox.castShadow = true;
      mainBox.receiveShadow = true;
      scene.add(mainBox);

      const greenGeometry = new THREE.BoxGeometry(0.3, 0.2, 0.2);
      const ledGeometry = new THREE.SphereGeometry(0.06, 32, 32);
      const spacing = 0.4;
      const gapBetweenRows = 0.25;

      for (let i = 0; i < 7; i++) {
        const ledMaterialTop = new THREE.MeshPhysicalMaterial({
          color: 0xff4444,
          emissive: 0x220000,
          emissiveIntensity: 0.5,
          metalness: 0.1,
          roughness: 0.1,
          transmission: 0.3,
        });

        const ledMaterialBottom = new THREE.MeshPhysicalMaterial({
          color: 0xff4444,
          emissive: 0x220000,
          emissiveIntensity: 0.5,
          metalness: 0.1,
          roughness: 0.1,
          transmission: 0.3,
        });

        // Top row
        const greenBlockTop = new THREE.Mesh(greenGeometry, pinMaterial);
        greenBlockTop.position.set(-1.2 + i * spacing, 0.35, 0.3);
        greenBlockTop.castShadow = true;
        scene.add(greenBlockTop);

        const ledTop = new THREE.Mesh(ledGeometry, ledMaterialTop);
        ledTop.position.set(
          -1.2 + i * spacing,
          0.35 + 0.08,
          0.3 - gapBetweenRows
        );
        ledTop.castShadow = true;
        scene.add(ledTop);
        ledReferencesRef.current.push(ledTop);

        const textureTop = createCircularLabel((i + 1).toString(), "red");
        if (textureTop) {
          const material = new THREE.SpriteMaterial({
            map: textureTop,
            transparent: true,
            alphaTest: 0.001,
          });
          const spriteTop = new THREE.Sprite(material);
          spriteTop.scale.set(0.5, 0.5, 1);
          spriteTop.position.set(-1.2 + i * spacing, 0.35 + 0.3, 0.3 + 0.7);
          scene.add(spriteTop);
          labelReferencesRef.current.push(spriteTop);
        }

        // Bottom row
        const greenBlockBottom = new THREE.Mesh(greenGeometry, pinMaterial);
        greenBlockBottom.position.set(-1.2 + i * spacing, 0.35, -0.3);
        greenBlockBottom.castShadow = true;
        scene.add(greenBlockBottom);

        const ledBottom = new THREE.Mesh(ledGeometry, ledMaterialBottom);
        ledBottom.position.set(
          -1.2 + i * spacing,
          0.35 + 0.08,
          -0.3 + gapBetweenRows
        );
        ledBottom.castShadow = true;
        scene.add(ledBottom);
        ledReferencesRef.current.push(ledBottom);

        const textureBottom = createCircularLabel((i + 8).toString(), "red");
        if (textureBottom) {
          const material = new THREE.SpriteMaterial({
            map: textureBottom,
            transparent: true,
            alphaTest: 0.001,
          });
          const spriteBottom = new THREE.Sprite(material);
          spriteBottom.scale.set(0.5, 0.5, 1);
          spriteBottom.position.set(-1.2 + i * spacing, 0.35 + 0.3, -0.3 - 0.7);
          scene.add(spriteBottom);
          labelReferencesRef.current.push(spriteBottom);
        }
      }
    }

    // Setup ResizeObserver
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
  }, [config.subrackType, createCircularLabel, handleResize]);

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
        targetPosition = new THREE.Vector3(-6, 0, 0);
        break;
      case "back":
        targetPosition = new THREE.Vector3(6, 0, 0);
        break;
      case "top":
        targetPosition = new THREE.Vector3(0, 6, 0);
        break;
      case "side":
        targetPosition = new THREE.Vector3(0, 0, -6);
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
    const targetPosition = new THREE.Vector3(4, 4, 4);
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
  };

  // Enhanced loading skeleton
  const renderLoadingSkeleton = () => (
    <div className="w-full h-full bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center relative overflow-hidden">
      {/* Animated background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
          animation: "shimmer 2s infinite",
        }}
      />

      {/* Loading content */}
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
            Connection Error
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
          {/* Device Name */}
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
              <span className="font-medium">3D Controls</span>
            </div>
            <div className="space-y-1 text-xs opacity-90">
              <div>• Drag to rotate</div>
              <div>• Scroll to zoom</div>
              <div>• Right-click to pan</div>
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
