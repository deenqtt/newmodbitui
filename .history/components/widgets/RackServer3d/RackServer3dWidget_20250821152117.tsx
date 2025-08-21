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
  Loader2,
  AlertTriangle,
} from "lucide-react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import TWEEN from "three/examples/jsm/libs/tween.module.js";
import Swal from "sweetalert2";

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
  const leftPanelRef = useRef<THREE.Mesh | null>(null);
  const rightPanelRef = useRef<THREE.Mesh | null>(null);
  const topPanelRef = useRef<THREE.Mesh | null>(null);
  const bottomPanelRef = useRef<THREE.Mesh | null>(null);
  const backPanelRef = useRef<THREE.Mesh | null>(null);
  const doorRef = useRef<THREE.Mesh | null>(null);

  // Validasi config
  useEffect(() => {
    if (!config) {
      setStatus("error");
      setErrorMessage("Widget configuration is missing.");
      return;
    }
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
    return { panel, material };
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

  // Helper function to create a device (server/UPS/AC)
  const createDevice = async (
    type: "server" | "ups" | "ac",
    positionU: number,
    heightU: number,
    imagePath: string | null,
    scene: THREE.Scene
  ) => {
    if (!sceneRef.current) return;

    const UHeight = 215 / 42; // Tinggi per U dalam cm (215 cm total untuk 42U)
    const deviceHeight = (heightU * UHeight) / 100; // Convert to meters
    const deviceWidth = 0.5; // 50 cm
    const deviceDepth = 0.5; // 50 cm

    let frontTexture: THREE.Texture | null = null;

    if (imagePath) {
      try {
        const textureLoader = new THREE.TextureLoader();
        // Gunakan Promise untuk memastikan texture selesai dimuat
        frontTexture = await new Promise<THREE.Texture>((resolve, reject) => {
          textureLoader.load(
            imagePath,
            (texture) => {
              texture.wrapS = THREE.RepeatWrapping;
              texture.wrapT = THREE.RepeatWrapping;
              texture.magFilter = THREE.LinearFilter;
              texture.minFilter = THREE.LinearMipmapLinearFilter;
              texture.needsUpdate = true;
              resolve(texture);
            },
            undefined,
            (err) => {
              console.error(`❌ Gagal memuat tekstur untuk ${type}:`, err);
              resolve(null); // Resolve dengan null jika gagal
            }
          );
        });
      } catch (e) {
        console.error(`Error loading texture for ${type}:`, e);
        frontTexture = null;
      }
    }

    // Buat material array
    const materials: THREE.Material[] = [
      new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide }), // Kiri
      new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide }), // Kanan
      new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide }), // Atas
      new THREE.MeshBasicMaterial({ color: 0xaaaaaa, side: THREE.DoubleSide }), // Bawah
      frontTexture
        ? new THREE.MeshBasicMaterial({
            map: frontTexture,
            side: THREE.DoubleSide,
          }) // Depan
        : new THREE.MeshBasicMaterial({
            color:
              type === "ac" ? 0x000000 : type === "ups" ? 0x333333 : 0x666666,
            side: THREE.DoubleSide,
          }), // Default color if no image
      new THREE.MeshBasicMaterial({ color: 0x333333, side: THREE.DoubleSide }), // Belakang
    ];

    const deviceGeometry = new THREE.BoxGeometry(
      deviceWidth,
      deviceHeight,
      deviceDepth
    );
    const deviceMesh = new THREE.Mesh(deviceGeometry, materials);

    // Hitung posisi Y berdasarkan U-space
    // Posisi Y dihitung dari bawah rak (-rackHeight/2) + offset posisi + setengah tinggi device
    const positionY =
      -2.15 / 2 + (positionU * UHeight) / 100 + deviceHeight / 2;
    deviceMesh.position.set(0, positionY, 0);

    // Tambahkan informasi ke userData untuk debugging/info
    deviceMesh.userData = {
      type,
      position: positionU,
      height: heightU,
    };

    scene.add(deviceMesh);
    return deviceMesh;
  };

  // Create 3D Scene
  const createScene = async () => {
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

    // --- Create Rack Structure ---
    // Panels
    const { panel: leftPanel, material: leftMaterial } = createPanel(
      wallThickness,
      rackHeight,
      rackDepth,
      0xcccccc,
      [-rackWidth / 2 + wallThickness / 2, 0, 0],
      1
    );
    leftPanelRef.current = leftPanel;

    const { panel: rightPanel, material: rightMaterial } = createPanel(
      wallThickness,
      rackHeight,
      rackDepth,
      0xcccccc,
      [rackWidth / 2 - wallThickness / 2, 0, 0],
      1
    );
    rightPanelRef.current = rightPanel;

    const { panel: topPanel, material: topMaterial } = createPanel(
      rackWidth,
      wallThickness,
      rackDepth,
      0xcccccc,
      [0, rackHeight / 2 - wallThickness / 2, 0],
      1
    );
    topPanelRef.current = topPanel;

    const { panel: bottomPanel, material: bottomMaterial } = createPanel(
      rackWidth,
      wallThickness,
      rackDepth,
      0xcccccc,
      [0, -rackHeight / 2 + wallThickness / 2, 0],
      1
    );
    bottomPanelRef.current = bottomPanel;

    const { panel: backPanel, material: backMaterial } = createPanel(
      rackWidth,
      rackHeight,
      wallThickness,
      0xcccccc,
      [0, 0, -rackDepth / 2 + wallThickness / 2],
      1
    );
    backPanelRef.current = backPanel;

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
    doorRef.current = door;
    doorGroup.add(door);
    scene.add(doorGroup);

    // --- Add Devices based on config ---
    const devicePromises: Promise<void>[] = [];

    // AC/Cooling
    if (config.showAC && config.acImageFile) {
      devicePromises.push(
        createDevice("ac", 1, 2, config.acImageFile, scene).then(() => {})
      );
    }

    // UPS
    if (config.showUPS) {
      devicePromises.push(
        createDevice(
          "ups",
          config.upsPosition,
          config.upsHeight,
          config.upsImageFile,
          scene
        ).then(() => {})
      );
    }

    // Servers
    if (config.showServers) {
      config.serverPositions.forEach((server, index) => {
        devicePromises.push(
          createDevice(
            "server",
            server.position,
            server.height,
            server.imageFile,
            scene
          ).then(() => {})
        );
      });
    }

    // Tunggu semua device selesai dibuat
    try {
      await Promise.all(devicePromises);
    } catch (error) {
      console.error("Error creating devices:", error);
      // Bisa tampilkan pesan error ke user jika perlu
    }

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
    let cleanupFn: (() => void) | undefined;

    const initScene = async () => {
      if (status === "ok") {
        cleanupFn = await createScene();
      }
    };

    initScene();

    return () => {
      if (cleanupFn) cleanupFn();
    };
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

    // Update material panel yang bukan pintu
    [
      leftPanelRef.current,
      rightPanelRef.current,
      topPanelRef.current,
      bottomPanelRef.current,
      backPanelRef.current,
    ].forEach((panel) => {
      if (panel && panel.material) {
        const material = panel.material as THREE.MeshBasicMaterial;
        material.opacity = targetOpacity;
        material.transparent = true;
        material.needsUpdate = true;
      }
    });

    // Update material pintu
    if (doorRef.current) {
      const doorMaterial = doorRef.current.material as THREE.MeshBasicMaterial;
      doorMaterial.opacity = isTrans ? 0.5 : 0.8; // Pintu tetap agak transparan
      doorMaterial.transparent = true;
      doorMaterial.needsUpdate = true;
    }
  };

  // --- Render UI ---
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
          <div className="text-center space-y-4">
            <Loader2 className="h-12 w-12 text-blue-500 animate-spin mx-auto" />
            <p className="text-slate-600 font-medium">Loading 3D View...</p>
          </div>
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-6">
          <div className="text-center space-y-4 max-w-sm">
            <AlertTriangle className="h-12 w-12 text-red-500 mx-auto" />
            <h3 className="text-lg font-semibold text-red-800">Error</h3>
            <p className="text-sm text-red-600">{errorMessage}</p>
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
