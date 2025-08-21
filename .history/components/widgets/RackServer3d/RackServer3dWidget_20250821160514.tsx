// File: components/widgets/RackServer3d/RackServer3dWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react"; // Tambahkan useCallback
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
  ScanEye, // Ganti Opacity jadi ScanEye
  Loader2,
  AlertTriangle,
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

  // --- Refs untuk Three.js objects ---
  // Gunakan useRef dengan nilai awal null untuk semua objek Three.js
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const doorGroupRef = useRef<THREE.Group | null>(null);
  const panelMaterialsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const animationIdRef = useRef<number>(0); // Gunakan ref untuk ID animasi
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const deviceMeshesRef = useRef<THREE.Mesh[]>([]); // Simpan referensi device untuk dispose

  // --- Validasi config ---
  useEffect(() => {
    if (!config) {
      setStatus("error");
      setErrorMessage("Widget configuration is missing.");
      return;
    }
    setStatus("ok");
  }, [config]);

  // --- Cleanup fungsi untuk menghindari memory leak ---
  const cleanupScene = useCallback(() => {
    if (animationIdRef.current) {
      cancelAnimationFrame(animationIdRef.current);
    }
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
    }
    if (rendererRef.current) {
      rendererRef.current.dispose();
    }
    // Dispose geometries dan materials
    deviceMeshesRef.current.forEach((mesh) => {
      if (mesh.geometry) mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((mat) => mat.dispose());
      } else if (mesh.material) {
        mesh.material.dispose();
      }
    });
    deviceMeshesRef.current = [];
    panelMaterialsRef.current.forEach((material) => material.dispose());
    panelMaterialsRef.current = [];
    // Reset refs
    sceneRef.current = null;
    cameraRef.current = null;
    rendererRef.current = null;
    controlsRef.current = null;
    doorGroupRef.current = null;
  }, []);

  // --- Handle resize ---
  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;
    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);
  }, []);

  // --- Helper functions ---
  const createPanel = useCallback(
    (
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
      panelMaterialsRef.current.push(material);
      const panel = new THREE.Mesh(geometry, material);
      panel.position.set(...position);
      return panel;
    },
    []
  );

  const createEdges = useCallback(
    (w: number, h: number, d: number, position: [number, number, number]) => {
      const geometry = new THREE.BoxGeometry(w, h, d);
      const edges = new THREE.EdgesGeometry(geometry);
      const line = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: 0x000000 })
      );
      line.position.set(...position);
      return line;
    },
    []
  );

  // --- Create 3D Scene (Optimized) ---
  const createScene = useCallback(async () => {
    if (!mountRef.current || status !== "ok") return;

    // Cleanup scene sebelumnya
    cleanupScene();

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

    // Renderer dengan pengaturan performa
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance", // Minta performa tinggi
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Batasi pixel ratio
    rendererRef.current = renderer;
    mountRef.current.innerHTML = "";
    mountRef.current.appendChild(renderer.domElement);

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controlsRef.current = controls;

    // --- Rak Dimensions (dalam meter) ---
    const rackWidth = 0.6;
    const rackHeight = 2.15;
    const rackDepth = 0.7;
    const wallThickness = 0.02;

    // --- Create Rack Structure ---
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

    const edges = [
      createEdges(wallThickness, rackHeight, rackDepth, [
        -rackWidth / 2 + wallThickness / 2,
        0,
        0,
      ]),
      createEdges(wallThickness, rackHeight, rackDepth, [
        rackWidth / 2 - wallThickness / 2,
        0,
        0,
      ]),
      createEdges(rackWidth, wallThickness, rackDepth, [
        0,
        rackHeight / 2 - wallThickness / 2,
        0,
      ]),
      createEdges(rackWidth, wallThickness, rackDepth, [
        0,
        -rackHeight / 2 + wallThickness / 2,
        0,
      ]),
      createEdges(rackWidth, rackHeight, wallThickness, [
        0,
        0,
        -rackDepth / 2 + wallThickness / 2,
      ]),
    ];

    scene.add(
      leftPanel,
      rightPanel,
      topPanel,
      bottomPanel,
      backPanel,
      ...edges
    );

    // --- Create Door ---
    const doorGroup = new THREE.Group();
    doorGroup.position.set(rackWidth / 2, 0, rackDepth / 2 - wallThickness / 2);
    doorGroupRef.current = doorGroup;

    const doorGeometry = new THREE.BoxGeometry(
      rackWidth,
      rackHeight,
      wallThickness
    );
    const doorMaterial = new THREE.MeshBasicMaterial({
      color: 0xdddddd,
      transparent: true,
      opacity: 0.8,
    });
    panelMaterialsRef.current.push(doorMaterial);
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(-rackWidth / 2, 0, 0);
    doorGroup.add(door);
    scene.add(doorGroup);

    // --- Add Devices based on config ---
    const UHeight = 215 / 42; // Tinggi per U dalam cm

    const createDevice = async (
      type: "server" | "ups" | "ac",
      positionU: number,
      heightU: number,
      imagePath: string | null
    ) => {
      const deviceHeight = (heightU * UHeight) / 100;
      const deviceWidth = 0.5;
      const deviceDepth = 0.5;

      let frontTexture: THREE.Texture | null = null;

      if (imagePath) {
        try {
          const textureLoader = new THREE.TextureLoader();
          // Non-blocking texture load
          frontTexture = await new Promise<THREE.Texture | null>((resolve) => {
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
              () => {
                console.warn(`Gagal memuat texture untuk ${type}`);
                resolve(null);
              }
            );
          });
        } catch (e) {
          console.error(`Error loading texture for ${type}:`, e);
        }
      }

      const materials: THREE.Material[] = [
        new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          side: THREE.DoubleSide,
        }),
        new THREE.MeshBasicMaterial({
          color: 0xaaaaaa,
          side: THREE.DoubleSide,
        }),
        frontTexture
          ? new THREE.MeshBasicMaterial({
              map: frontTexture,
              side: THREE.DoubleSide,
            })
          : new THREE.MeshBasicMaterial({
              color:
                type === "ac" ? 0x000000 : type === "ups" ? 0x333333 : 0x666666,
              side: THREE.DoubleSide,
            }),
        new THREE.MeshBasicMaterial({
          color: 0x333333,
          side: THREE.DoubleSide,
        }),
      ];

      const deviceGeometry = new THREE.BoxGeometry(
        deviceWidth,
        deviceHeight,
        deviceDepth
      );
      const deviceMesh = new THREE.Mesh(deviceGeometry, materials);
      deviceMeshesRef.current.push(deviceMesh); // Simpan untuk dispose

      const positionY =
        -2.15 / 2 + (positionU * UHeight) / 100 + deviceHeight / 2;
      deviceMesh.position.set(0, positionY, 0);
      deviceMesh.userData = { type, position: positionU, height: heightU };

      scene.add(deviceMesh);
    };

    // Buat device secara paralel
    const devicePromises: Promise<void>[] = [];

    if (config.showAC && config.acImageFile) {
      devicePromises.push(createDevice("ac", 1, 2, config.acImageFile));
    }
    if (config.showUPS) {
      devicePromises.push(
        createDevice(
          "ups",
          config.upsPosition,
          config.upsHeight,
          config.upsImageFile
        )
      );
    }
    if (config.showServers) {
      config.serverPositions.forEach((server) => {
        devicePromises.push(
          createDevice(
            "server",
            server.position,
            server.height,
            server.imageFile
          )
        );
      });
    }

    try {
      await Promise.all(devicePromises);
    } catch (error) {
      console.error("Error creating devices:", error);
    }

    // --- Mounting Rails ---
    const railGeometry = new THREE.BoxGeometry(0.05, rackHeight, 0.02);
    const railMaterial = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const railLeft = new THREE.Mesh(railGeometry, railMaterial);
    railLeft.position.set(-rackWidth / 2 + 0.025 + 0.01, 0, 0.25);
    const railRight = new THREE.Mesh(railGeometry, railMaterial);
    railRight.position.set(rackWidth / 2 - 0.025 - 0.01, 0, 0.25);
    scene.add(railLeft, railRight);

    // --- Animation Loop (Optimized) ---
    const animate = () => {
      animationIdRef.current = requestAnimationFrame(animate);
      // Hanya update jika controls ada
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      TWEEN.update();
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // --- Resize Observer ---
    resizeObserverRef.current = new ResizeObserver(() => {
      // Debounce resize
      clearTimeout(resizeObserverRef.current?.timeout);
      // @ts-ignore - Tambahkan properti timeout ke ResizeObserver
      resizeObserverRef.current!.timeout = setTimeout(() => {
        handleResize();
      }, 100);
    });
    if (mountRef.current) {
      resizeObserverRef.current.observe(mountRef.current);
    }
  }, [status, config, createPanel, createEdges, handleResize, cleanupScene]); // Tambahkan dependencies

  // --- Initialize scene ---
  useEffect(() => {
    if (status === "ok") {
      createScene();
    }

    // Cleanup saat komponen unmount
    return () => {
      cleanupScene();
    };
  }, [status, createScene, cleanupScene]); // Tambahkan dependencies

  // --- View Control Functions ---
  const setView = useCallback((view: "front" | "back" | "top" | "side") => {
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
      .to(targetPosition, 800) // Kurangi durasi animasi
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        cameraRef.current?.lookAt(0, 0, 0);
        controlsRef.current?.update();
      })
      .start();
  }, []);

  const resetView = useCallback(() => {
    if (!cameraRef.current || !controlsRef.current) return;

    new TWEEN.Tween(cameraRef.current.position)
      .to({ x: 0, y: 0, z: 2 }, 800)
      .easing(TWEEN.Easing.Quadratic.InOut)
      .onUpdate(() => {
        cameraRef.current?.lookAt(0, 0, 0);
        controlsRef.current?.update();
      })
      .start();
  }, []);

  const toggleDoors = useCallback(() => {
    if (!doorGroupRef.current) return;
    const isOpen = !isDoorOpen;
    setIsDoorOpen(isOpen);
    const targetRotation = isOpen ? Math.PI / 2 : 0;

    new TWEEN.Tween(doorGroupRef.current.rotation)
      .to({ y: targetRotation }, 400) // Kurangi durasi
      .easing(TWEEN.Easing.Quadratic.InOut)
      .start();
  }, [isDoorOpen]);

  const toggleTransparency = useCallback(() => {
    const isTrans = !isTransparent;
    setIsTransparent(isTrans);
    const targetOpacity = isTrans ? 0.3 : 1;

    panelMaterialsRef.current.forEach((material) => {
      // Jangan ubah opacity pintu terlalu rendah
      if (
        material !==
        panelMaterialsRef.current[panelMaterialsRef.current.length - 1]
      ) {
        // Material pintu terakhir
        material.opacity = targetOpacity;
        material.needsUpdate = true;
      }
    });

    // Pintu tetap agak transparan
    const doorMaterial =
      panelMaterialsRef.current[panelMaterialsRef.current.length - 1];
    if (doorMaterial) {
      doorMaterial.opacity = isTrans ? 0.5 : 0.8;
      doorMaterial.needsUpdate = true;
    }
  }, [isTransparent]);

  // --- Render UI ---
  const renderContent = () => {
    if (status === "loading") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl">
          <div className="text-center space-y-4">
            <Loader2 className="h-10 w-10 text-blue-500 animate-spin mx-auto" />
            <p className="text-slate-600 font-medium text-sm">
              Loading 3D View...
            </p>
          </div>
        </div>
      );
    }
    if (status === "error") {
      return (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100 rounded-xl p-4">
          <div className="text-center space-y-3 max-w-xs">
            <AlertTriangle className="h-10 w-10 text-red-500 mx-auto" />
            <h3 className="text-base font-semibold text-red-800">Error</h3>
            <p className="text-xs text-red-600">{errorMessage}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
              className="border-red-300 text-red-700 hover:bg-red-50 h-8 text-xs px-3"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="relative w-full h-full bg-slate-50">
        {/* 3D Viewport */}
        <div
          ref={mountRef}
          className="w-full h-full rounded-lg overflow-hidden shadow-inner"
        />

        {/* Controls */}
        {showControls && (
          <div className="absolute top-2 left-2 flex flex-wrap gap-1.5 z-10">
            <div className="flex flex-wrap gap-1 bg-white/80 backdrop-blur-sm rounded-md p-1 shadow-md border border-white/30">
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
                  className="h-7 px-2 text-xs hover:bg-white/60"
                >
                  {item.label}
                </Button>
              ))}
              <div className="w-px bg-gray-300 mx-1 my-1" />
              <Button
                size="sm"
                variant="ghost"
                onClick={resetView}
                className="h-7 w-7 p-0 hover:bg-white/60"
                title="Reset View"
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex gap-1 bg-white/80 backdrop-blur-sm rounded-md p-1 shadow-md border border-white/30">
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleDoors}
                className="h-7 px-2 text-xs hover:bg-white/60"
              >
                {isDoorOpen ? (
                  <DoorOpen className="h-3.5 w-3.5 mr-1" />
                ) : (
                  <DoorClosed className="h-3.5 w-3.5 mr-1" />
                )}
                Door
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={toggleTransparency}
                className="h-7 px-2 text-xs hover:bg-white/60"
              >
                <ScanEye className="h-3.5 w-3.5 mr-1" /> {/* Ganti ikon */}
                {isTransparent ? "Solid" : "Glass"}
              </Button>
            </div>
          </div>
        )}

        {/* Toggle Controls Button */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute top-2 right-2 h-7 w-7 p-0 bg-white/80 backdrop-blur-sm shadow-md border border-white/30 hover:bg-white/90"
          onClick={() => setShowControls(!showControls)}
          title={showControls ? "Hide Controls" : "Show Controls"}
        >
          {showControls ? (
            <EyeOff className="h-3.5 w-3.5" />
          ) : (
            <Eye className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Info Button */}
        <Button
          size="sm"
          variant="ghost"
          className="absolute bottom-2 right-2 h-7 w-7 p-0 bg-white/80 backdrop-blur-sm shadow-md border border-white/30 hover:bg-white/90"
          title="Info"
        >
          <Info className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  };

  return (
    <Card className="w-full h-full flex flex-col border-0 shadow-none">
      <CardContent className="flex-1 p-0 overflow-hidden rounded-lg border bg-white">
        {renderContent()}
      </CardContent>
    </Card>
  );
};
