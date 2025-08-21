// File: components/widgets/RackServer3d/RackServer3dWidget.tsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye,
  EyeOff,
  Move3D,
  RotateCcw,
  Info,
  DoorOpen,
  DoorClosed,
  Opacity,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import TWEEN from "three/examples/jsm/libs/tween.module.js";

// Definisi tipe untuk konfigurasi
interface ServerConfig {
  position: number;
  height: number;
  imageFile: string | null; // URL dari createObjectURL
  topic: string;
}

interface WidgetConfig {
  showAC: boolean;
  acImageFile: string | null;
  showUPS: boolean;
  upsPosition: number;
  upsHeight: number;
  upsImageFile: string | null;
  showServers: boolean;
  serverCount: number;
  serverPositions: ServerConfig[];
}

interface Props {
  config: WidgetConfig;
}

export const RackServer3dWidget = ({ config }: Props) => {
  const mountRef = useRef<HTMLDivElement>(null);

  // State untuk kontrol UI
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [showControls, setShowControls] = useState(true);
  const [isDoorOpen, setIsDoorOpen] = useState(false);
  const [isTransparent, setIsTransparent] = useState(false);

  // Refs untuk Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const doorGroupRef = useRef<THREE.Group | null>(null);
  const panelMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const animationRef = useRef<number>(0);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Validasi config
  useEffect(() => {
    if (!config) {
      setStatus("error");
      setErrorMessage("Widget configuration is missing.");
      return;
    }
    // Bisa tambah validasi lebih lanjut untuk field2 config jika perlu
    setStatus("ok");
  }, [config]);

  // Handle resize
  const handleResize = () => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  };

  // Create 3D Scene
  const createScene = () => {
    if (!mountRef.current || status !== "ok") return;

    // Cleanup jika scene sudah ada
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

    // Reset refs
    panelMaterialsRef.current = [];
    doorGroupRef.current = null;

    // --- Scene Setup ---
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);
    sceneRef.current = scene;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Camera
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.set(0, 0, 2);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    rendererRef.current = renderer;
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    // --- Rak Dimensions (dalam meter) ---
    const rackWidth = 0.6; // 60 cm
    const rackHeight = 2.15; // 215 cm
    const rackDepth = 0.7; // 70 cm
    const wallThickness = 0.02; // 2 cm

    // Helper function to create panel
    const createPanel = (
      w: number,
      h: number,
      d: number,
      color: number,
      position: [number, number, number],
      opacity: number = 1
    ) => {
      const geometry = new THREE.BoxGeometry(w, h, d);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: opacity < 1,
        opacity,
      });
      panelMaterialsRef.current.push(material); // Simpan material untuk kontrol transparansi
      const panel = new THREE.Mesh(geometry, material);
      panel.position.set(...position);
      return panel;
    };

    // Helper function to create edges
    const createEdges = (
      w: number,
      h: number,
      d: number,
      position: [number, number, number]
    ) => {
      const geometry = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      line.position.set(...position);
      return line;
    };

    // --- Create Rack Structure ---
    // Panels
    const leftPanel = createPanel(
      wallThickness,
      rackHeight,
      rackDepth,
      0xcccccc,
      [-rackWidth / 2 + wallThickness / 2, 0, 0],
      1
    );
    const rightPanel = createPanel(
      wallThickness,
      rackHeight,
      rackDepth,
      0xcccccc,
      [rackWidth / 2 - wallThickness / 2, 0, 0],
      1
    );
    const topPanel = createPanel(
      rackWidth,
      wallThickness,
      rackDepth,
      0xcccccc,
      [0, rackHeight / 2 - wallThickness / 2, 0],
      1
    );
    const bottomPanel = createPanel(
      rackWidth,
      wallThickness,
      rackDepth,
      0xcccccc,
      [0, -rackHeight / 2 + wallThickness / 2, 0],
      1
    );
    const backPanel = createPanel(
      rackWidth,
      rackHeight,
      wallThickness,
      0xcccccc,
      [0, 0, -rackDepth / 2 + wallThickness / 2],
      1
    );

    // Edges
    const leftEdges = createEdges(wallThickness, rackHeight, rackDepth, [
      -rackWidth / 2 + wallThickness / 2,
      0,
      0,
    ]);
    const rightEdges = createEdges(wallThickness, rackHeight, rackDepth, [
      rackWidth / 2 - wallThickness / 2,
      0,
      0,
    ]);
    const topEdges = createEdges(rackWidth, wallThickness, rackDepth, [
      0,
      rackHeight / 2 - wallThickness / 2,
      0,
    ]);
    const bottomEdges = createEdges(rackWidth, wallThickness, rackDepth, [
      0,
      -rackHeight / 2 + wallThickness / 2,
      0,
    ]);
    const backEdges = createEdges(rackWidth, rackHeight, wallThickness, [
      0,
      0,
      -rackDepth / 2 + wallThickness / 2,
    ]);

    scene.add(leftPanel, rightPanel, topPanel, bottomPanel, backPanel);
    scene.add(leftEdges, rightEdges, topEdges, bottomEdges, backEdges);

    // --- Create Door ---
    const doorGroup = new THREE.Group();
    doorGroup.position.set(rackWidth / 2, 0, rackDepth / 2 - wallThickness / 2); // Pivot di sisi kanan
    doorGroupRef.current = doorGroup;

    const doorWidth = rackWidth;
    const doorHeight = rackHeight;
    const doorThickness = wallThickness;
    const doorGeometry = new THREE.BoxGeometry(
      doorWidth,
      doorHeight,
      doorThickness
    );
    const doorMaterial = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.8,
    });
    panelMaterialsRef.current.push(doorMaterial); // Simpan material pintu
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(-doorWidth / 2, 0, 0); // Geser ke kiri agar pivot di sisi kanan
    doorGroup.add(door);
    scene.add(doorGroup);

    // --- Add Devices based on config ---
    // TODO: Implementasi pembuatan AC, UPS, dan Server berdasarkan `config`
    // Ini akan melibatkan:
    // 1. Memuat texture dari `imageFile` (jika ada)
    // 2. Membuat mesh untuk setiap device
    // 3. Menempatkannya di posisi yang benar berdasarkan `position` (U-space)
    // Karena kompleks, kita bisa implementasi dasar dulu atau tinggalkan sebagai TODO.

    // --- Mounting Rails (simplified) ---
    const railGeometry = new THREE.BoxGeometry(0.05, rackHeight, 0.02);
    const railMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const railLeft = new THREE.Mesh(railGeometry, railMaterial);
    railLeft.position.set(-rackWidth / 2 + 0.025 + 0.01, 0, 0.25);
    const railRight = new THREE.Mesh(railGeometry, railMaterial);
    railRight.position.set(rackWidth / 2 - 0.025 - 0.01, 0, 0.25);
    scene.add(railLeft, railRight);

    // --- Animation Loop ---
    const animate = () => {
      animationRef.current = requestAnimationFrame(animate);
      controls.update();
      TWEEN.update();
      renderer.render(scene, camera);
    };
    animate();

    // --- Resize Observer ---
    resizeObserverRef.current = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserverRef.current.observe(mountRef.current);

    // --- Cleanup Function ---
    return () => {
      cancelAnimationFrame(animationRef.current);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
      // Dispose geometries, materials, textures
      // ... (opsional untuk optimasi memory)
    };
  };

  // Initialize scene
  useEffect(() => {
    if (status === "ok") {
      const cleanup = createScene();
      return cleanup;
    }
  }, [status]);

  // --- View Control Functions ---
  const setView = (view: "front" | "back" | "top" | "side") => {
    if (!cameraRef.current || !controlsRef.current) return;

    let targetPosition: THREE.Vector3;
    switch (view) {
      case "front":
        targetPosition = new THREE.Vector3(0, 0, 2);
        break;
      case "back":
        targetPosition = new THREE.Vector3(0, 0, -2);
        break;
      case "top":
        targetPosition = new THREE.Vector3(0, 2, 0);
        break;
      case "side":
        targetPosition = new THREE.Vector3(2, 0, 0);
        break;
      default:
        return;
    }

    new TWEEN.Tween(cameraRef.current.position)
      .to(targetPosition, 1000)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        cameraRef.current?.lookAt(0, 0, 0);
        controlsRef.current?.update();
      })
      .start();
  };

  const resetView = () => {
    if (!cameraRef.current || !controlsRef.current) return;

    new TWEEN.Tween(cameraRef.current.position)
      .to({ x: 0, y: 0, z: 2 }, 1000)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        cameraRef.current?.lookAt(0, 0, 0);
        controlsRef.current?.update();
      })
      .start();
  };

  const toggleDoors = () => {
    if (!doorGroupRef.current) return;
    const isOpen = !isDoorOpen;
    setIsDoorOpen(isOpen);
    const targetRotation = isOpen ? Math.PI / 2 : 0;

    new TWEEN.Tween(doorGroupRef.current.rotation)
      .to({ y: targetRotation }, 500)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  };

  const toggleTransparency = () => {
    const isTrans = !isTransparent;
    setIsTransparent(isTrans);
    const targetOpacity = isTrans ? 0.3 : 1;

    panelMaterialsRef.current.forEach((material) => {
      if (material.opacity !== 1) {
        // Jangan ubah opacity pintu jika sudah 1
        material.opacity = targetOpacity;
        material.needsUpdate = true;
      }
    });
  };

  // --- Render UI ---
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="w-full h-full flex items-center justify-center">
          Loading 3D View...
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="w-full h-full flex items-center justify-center text-red-500">
          Error: {errorMessage}
        </div>
      );
    }

    return (
      <div className="relative w-full h-full">
        {/* 3D Viewport */}
        <div
          ref={mountRef}
          className="w-full h-full rounded-lg overflow-hidden"
        />

        {/* Controls */}
        {showControls && (
          <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10">
            <div className="flex gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-md">
              {[
                { label: "Front", action: () => setView("front"), icon: null },
                { label: "Back", action: () => setView("back"), icon: null },
                { label: "Top", action: () => setView("top"), icon: null },
                { label: "Side", action: () => setView("side"), icon: null },
              ].map((item) => (
                <Button
                  key={item.label}
                  size="sm"
                  variant="ghost"
                  onClick={item.action}
                  className="h-8 px-2 text-xs"
                >
                  {item.label}
                </Button>
              ))}
              <div className="w-px bg-gray-300 mx-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={resetView}
                className="h-8 w-8 p-0"
                title="Reset View"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>

            <div className="flex gap-1 bg-white/80 backdrop-blur-sm rounded-lg p-1 shadow-md">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleDoors}
                className="h-8 px-2 text-xs"
              >
                {isDoorOpen ? (
                  <DoorOpen className="h-4 w-4 mr-1" />
                ) : (
                  <DoorClosed className="h-4 w-4 mr-1" />
                )}
                {isDoorOpen ? "Close" : "Open"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleTransparency}
                className="h-8 px-2 text-xs"
              >
                <Opacity className="h-4 w-4 mr-1" />
                {isTransparent ? "Solid" : "Trans"}
              </Button>
            </div>
          </div>
        )}

        {/* Toggle Controls Button */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-3 right-3 h-8 w-8 p-0 bg-white/80 backdrop-blur-sm shadow-md"
          onClick={() => setShowControls(!showControls)}
          title={showControls ? "Hide Controls" : "Show Controls"}
        >
          {showControls ? (
            <EyeOff className="h-4 w-4" />
          ) : (
            <Eye className="h-4 w-4" />
          )}
        </Button>

        {/* Info Button (Placeholder) */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute bottom-3 right-3 h-8 w-8 p-0 bg-white/80 backdrop-blur-sm shadow-md"
          // onClick={openInfoModal} // TODO: Implement modal
          title="Info"
        >
          <Info className="h-4 w-4" />
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full h-full flex flex-col">
      <CardContent className="flex-1 p-0 overflow-hidden">
        {renderContent()}
      </CardContent>
    </Card>
  );
};
