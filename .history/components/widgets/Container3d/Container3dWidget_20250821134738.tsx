"use client";

import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  Suspense,
} from "react";
import * as THREE from "three";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import { useMqtt } from "@/contexts/MqttContext";
import { Loader2 } from "lucide-react";

/**
 * CONFIG TYPE dari Container3dConfigModal.tsx:
 * {
 *   customName: string;
 *   topicsTemp: [string[], string[]]; // [frontTopics, backTopics]
 *   topicPower: string;
 * }
 */
interface Props {
  config: {
    customName: string;
    topicsTemp: [string[], string[]];
    topicPower: string;
  };
}

/* =========================================================
   === TUNE DI SINI BIAR 1:1 DGN VUE (GEOMETRY & LAYOUT) ===
   - Semua angka pakai world units (meter/setara)
   - Samakan dengan yang ada di Widget3DContainer.vue kamu
   ========================================================= */
const GEO = {
  container: {
    size: new THREE.Vector3(6, 4, 10), // width, height, depth (ganti sesuai Vue)
    colorOn: "#0aa86e", // warna bila power ON (ganti sesuai Vue)
    colorOff: "#3a3a3a", // warna bila power OFF
    opacity: 0.28, // transparansi body
    wireframe: true, // kalau versi Vue wireframe juga
    cornerRadius: 0.08, // kalau Vue pakai sudut tumpul, abaikan kalau box biasa
  },
  rack: {
    size: new THREE.Vector3(0.9, 1.0, 0.9), // ukuran 1 rack/slot
    cols: 4, // jumlah kolom per wall (samakan dgn Vue)
    rowGap: 0.2, // gap antar baris
    colGap: 0.2, // gap antar kolom
    frontZ: 4.8, // offset Z untuk FRONT (mendekati dinding depan container)
    backZ: -4.8, // offset Z untuk BACK
    yStart: -1.0, // titik awal (baris terbawah) Y
    yStep: 1.2, // jarak antar baris (termasuk tinggi rack)
    xStart: -2.5, // titik awal sisi kiri
    xStep: 1.5, // jarak antar kolom (termasuk lebar rack)
    // Warna berdasarkan nilai (sesuaikan dgn Vue)
    colorNull: "#808080",
    colorLow: "#15a34a",
    colorMid: "#f59e0b",
    colorHigh: "#ef4444",
    lowMax: 30,
    midMax: 60,
  },
  lights: {
    ambient: 0.55,
    dirIntensity: 1.1,
    dirPos: new THREE.Vector3(5, 10, 5),
  },
  camera: {
    pos: new THREE.Vector3(10, 8, 12),
    fov: 45,
  },
};

/* =========================================================
   ================== MQTT PAYLOAD PARSER ==================
   Terima berbagai kemungkinan bentuk payload:
   - { value: 42 } atau { value: "..." JSON }
   - { v: 42 } atau { status: 42 }
   - angka langsung dalam string: "42"
   ========================================================= */
function parseNumericPayload(payloadString: string): number | null {
  try {
    const obj = JSON.parse(payloadString);
    let v: any = null;

    if (obj && typeof obj === "object") {
      if (typeof obj.value === "string") {
        try {
          const inner = JSON.parse(obj.value);
          if (typeof inner === "number") v = inner;
          else if (inner && typeof inner === "object") {
            if (typeof inner.value === "number") v = inner.value;
          }
        } catch {
          // string biasa
          const n = Number(obj.value);
          v = Number.isFinite(n) ? n : null;
        }
      } else if (typeof obj.value === "number") {
        v = obj.value;
      } else if (typeof (obj as any).v === "number") {
        v = (obj as any).v;
      } else if (typeof (obj as any).status === "number") {
        v = (obj as any).status;
      }
    } else if (typeof obj === "number") {
      v = obj;
    }

    return Number.isFinite(v) ? (v as number) : null;
  } catch {
    // payload bukan JSON, coba parse angka mentah
    const n = Number(payloadString);
    return Number.isFinite(n) ? n : null;
  }
}

/* =========================================================
   ===================== RACK COLOR LOGIC ==================
   ========================================================= */
function rackColorFromValue(v: number | null): string {
  if (v == null) return GEO.rack.colorNull;
  if (v <= GEO.rack.lowMax) return GEO.rack.colorLow;
  if (v <= GEO.rack.midMax) return GEO.rack.colorMid;
  return GEO.rack.colorHigh;
}

/* =========================================================
   ==================== INSTANCED RACKS ====================
   Lebih efisien saat rack banyak. Kita instancing by side.
   ========================================================= */
function InstancedRacks({
  values,
  count,
  side, // "front" | "back"
}: {
  values: (number | null)[];
  count: number;
  side: "front" | "back";
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const color = new THREE.Color();
  const dummy = new THREE.Object3D();

  // posisi Z untuk front/back
  const zOffset = side === "front" ? GEO.rack.frontZ : GEO.rack.backZ;

  const cols = GEO.rack.cols;
  const x0 = GEO.rack.xStart;
  const xStep = GEO.rack.xStep;
  const y0 = GEO.rack.yStart;
  const yStep = GEO.rack.yStep;

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    for (let i = 0; i < count; i++) {
      const row = Math.floor(i / cols);
      const col = i % cols;
      const x = x0 + col * xStep;
      const y = y0 + row * yStep;
      const z = zOffset;

      dummy.position.set(x, y, z);
      dummy.rotation.set(0, 0, 0);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);

      color.set(rackColorFromValue(values[i] ?? null));
      mesh.setColorAt(i, color);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [values, count, zOffset]);

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined as any, undefined as any, count]}
      castShadow
      receiveShadow
    >
      <boxGeometry
        args={[GEO.rack.size.x, GEO.rack.size.y, GEO.rack.size.z]}
      />
      <meshStandardMaterial />
    </instancedMesh>
  );
}

/* =========================================================
   ==================== CONTAINER SHELL ====================
   ========================================================= */
function ContainerShell({ powerOn }: { powerOn: boolean }) {
  // pakai box transparan mirip wireframe
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry
        args={[GEO.container.size.x, GEO.container.size.y, GEO.container.size.z]}
      />
      <meshStandardMaterial
        color={powerOn ? GEO.container.colorOn : GEO.container.colorOff}
        transparent
        opacity={GEO.container.opacity}
        wireframe={GEO.container.wireframe}
      />
    </mesh>
  );
}

/* =========================================================
   ====================== SCENE WRAPPER ====================
   ========================================================= */
function SceneContent({
  frontValues,
  backValues,
  frontCount,
  backCount,
  powerOn,
}: {
  frontValues: (number | null)[];
  backValues: (number | null)[];
  frontCount: number;
  backCount: number;
  powerOn: boolean;
}) {
  // Lights
  return (
    <>
      <ambientLight intensity={GEO.lights.ambient} />
      <directionalLight
        intensity={GEO.lights.dirIntensity}
        position={[
          GEO.lights.dirPos.x,
          GEO.lights.dirPos.y,
          GEO.lights.dirPos.z,
        ]}
        castShadow
      />

      {/* Container body */}
      <ContainerShell powerOn={powerOn} />

      {/* FRONT racks */}
      {frontCount > 0 && (
        <InstancedRacks
          values={frontValues}
          count={frontCount}
          side="front"
        />
      )}

      {/* BACK racks */}
      {backCount > 0 && (
        <InstancedRacks values={backValues} count={backCount} side="back" />
      )}
    </>
  );
}

/* =========================================================
   ===================== MAIN WIDGET JSX ===================
   ========================================================= */
export const Container3dWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();

  const [frontValues, setFrontValues] = useState<(number | null)[]>([]);
  const [backValues, setBackValues] = useState<(number | null)[]>([]);
  const [powerStatus, setPowerStatus] = useState<number | null>(null);

  const frontTopics = useMemo(() => (config?.topicsTemp?.[0] ?? []).filter(Boolean), [config]);
  const backTopics = useMemo(() => (config?.topicsTemp?.[1] ?? []).filter(Boolean), [config]);

  // pastikan panjang state = jumlah topics
  useEffect(() => setFrontValues((prev) => {
    const arr = Array.from({ length: frontTopics.length }, (_, i) => prev[i] ?? null);
    return arr;
  }), [frontTopics.length]);

  useEffect(() => setBackValues((prev) => {
    const arr = Array.from({ length: backTopics.length }, (_, i) => prev[i] ?? null);
    return arr;
  }), [backTopics.length]);

  // Handler per-index
  const makeFrontHandler = useCallback(
    (idx: number) => (topic: string, payload: string) => {
      const v = parseNumericPayload(payload);
      setFrontValues((prev) => {
        const copy = prev.slice();
        copy[idx] = v;
        return copy;
      });
    },
    []
  );

  const makeBackHandler = useCallback(
    (idx: number) => (topic: string, payload: string) => {
      const v = parseNumericPayload(payload);
      setBackValues((prev) => {
        const copy = prev.slice();
        copy[idx] = v;
        return copy;
      });
    },
    []
  );

  const handlePower = useCallback((topic: string, payload: string) => {
    const v = parseNumericPayload(payload);
    setPowerStatus(v);
  }, []);

  // Subscribe/unsubscribe
  useEffect(() => {
    if (!isReady || connectionStatus !== "Connected") return;

    // FRONT
    const frontHandlers = frontTopics.map((t, i) => makeFrontHandler(i));
    frontTopics.forEach((t, i) => subscribe(t, frontHandlers[i]));

    // BACK
    const backHandlers = backTopics.map((t, i) => makeBackHandler(i));
    backTopics.forEach((t, i) => subscribe(t, backHandlers[i]));

    // POWER
    let powerHandler: ((t: string, p: string) => void) | null = null;
    if (config.topicPower) {
      powerHandler = handlePower;
      subscribe(config.topicPower, powerHandler);
    }

    return () => {
      frontTopics.forEach((t, i) => unsubscribe(t, frontHandlers[i]));
      backTopics.forEach((t, i) => unsubscribe(t, backHandlers[i]));
      if (config.topicPower && powerHandler) {
        unsubscribe(config.topicPower, powerHandler);
      }
    };
  }, [
    isReady,
    connectionStatus,
    subscribe,
    unsubscribe,
    frontTopics,
    backTopics,
    config.topicPower,
    makeFrontHandler,
    makeBackHandler,
    handlePower,
  ]);

  if (!config?.customName) {
    return (
      <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
        Not configured
      </div>
    );
  }

  const powerOn = !!(powerStatus && powerStatus > 0);

  return (
    <div className="w-full h-full relative">
      {/* Header label */}
      <div className="absolute top-1 left-2 z-10 text-xs font-semibold text-primary bg-background/70 px-2 py-1 rounded pointer-events-none">
        {config.customName}
      </div>

      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera
          makeDefault
          position={[GEO.camera.pos.x, GEO.camera.pos.y, GEO.camera.pos.z]}
          fov={GEO.camera.fov}
        />
        <OrbitControls enablePan enableZoom enableRotate />
        <Suspense fallback={null}>
          <SceneContent
            frontValues={frontValues}
            backValues={backValues}
            frontCount={frontTopics.length}
            backCount={backTopics.length}
            powerOn={powerOn}
          />
        </Suspense>
      </Canvas>

      {/* Overlay loading MQTT */}
      {!isReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
          <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" />
        </div>
      )}
    </div>
  );
};
