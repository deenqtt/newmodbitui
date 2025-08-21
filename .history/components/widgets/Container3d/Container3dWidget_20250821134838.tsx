// File: components/widgets/Container3d/Container3dWidget.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { Text } from "troika-three-text";
import nipplejs from "nipplejs";
import { useMqtt } from "@/contexts/MqttContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Loader2, RotateCcw, Wifi, WifiOff } from "lucide-react";

// --- Interfaces ---
interface Config {
  customName: string;
  topicsTemp: [string[], string[]];
  topicPower: string;
}

interface Props {
  config: Config;
}

interface RackData {
  rackNumber: number;
  name: string;
  frontTopic: string | null;
  backTopic: string | null;
  powerTopic: string | null;
}

// --- Constants (cm converted to meters) ---
const containerDimensions = { length: 12.192, width: 2.438, height: 2.591 };
const rackDimensions = { height: 1.8669, width: 1.0, depth: 0.6 };

// --- Main Component ---
export const Container3dWidget = ({ config }: Props) => {
  const { subscribe, unsubscribe, isReady, connectionStatus } = useMqtt();
  const mountRef = useRef<HTMLDivElement>(null);
  const joystickRef = useRef<HTMLDivElement>(null);

  // Refs for Three.js objects
  const sceneRef = useRef<THREE.Scene>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const controlsRef = useRef<OrbitControls>();
  const animationFrameId = useRef<number>(0);
  const resizeObserver = useRef<ResizeObserver>();
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  // Refs for scene object management
  const containerMeshRef = useRef<THREE.Mesh>();
  const initialMaterialsRef = useRef<(THREE.Material | null)[]>([]);
  const containerCoversRef = useRef<THREE.Object3D[]>([]);
  const rackMeshesRef = useRef<THREE.Mesh[]>([]);

  // State management
  const [status, setStatus] = useState<"loading" | "error" | "ok">("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [isAnimating, setIsAnimating] = useState(false);
  const [coversVisible, setCoversVisible] = useState(true);

  // --- MQTT Logic ---
  const handleTempHumMessage = useCallback(
    (
      payloadString: string,
      rackNumber: number,
      direction: "front" | "back"
    ) => {
      try {
        const payload = JSON.parse(payloadString);
        if (!payload.value) return;
        const valueData = JSON.parse(payload.value);
        const temp = valueData.temp ?? "N/A";
        const humidity = valueData.hum ?? "N/A";

        const tempColor =
          temp > 40 ? 0xff0000 : temp > 30 ? 0xffff00 : 0x00ff00;
        const humColor =
          humidity > 60 ? 0xff0000 : humidity > 40 ? 0xffff00 : 0x00ff00;

        const scene = sceneRef.current;
        if (!scene) return;

        const tempLabel = scene.getObjectByName(
          `rack-${rackNumber}-${direction}-temp-label`
        ) as Text;
        if (tempLabel) {
          tempLabel.text = `🌡${temp}°C`;
          tempLabel.color = tempColor;
          tempLabel.sync();
        }

        const humidityLabel = scene.getObjectByName(
          `rack-${rackNumber}-${direction}-humidity-label`
        ) as Text;
        if (humidityLabel) {
          humidityLabel.text = `💧${humidity}%`;
          humidityLabel.color = humColor;
          humidityLabel.sync();
        }
      } catch (e) {
        console.error(
          `Failed to parse ${direction} message for Rack ${rackNumber}:`,
          e
        );
      }
    },
    []
  );

  const interpolateColor = (value: number) => {
    const minColor = new THREE.Color(0x00ff00);
    const midColor = new THREE.Color(0xffff00);
    const maxColor = new THREE.Color(0xff0000);
    if (value <= 50) {
      return new THREE.Color().lerpColors(minColor, midColor, value / 50);
    } else {
      return new THREE.Color().lerpColors(
        midColor,
        maxColor,
        (value - 50) / 50
      );
    }
  };

  const updatePowerIndicator = useCallback(
    (rackNumber: number, powerValue: number) => {
      const scene = sceneRef.current;
      const rackObject = scene?.getObjectByName(`rack-${rackNumber}-power`);
      if (!rackObject || !(rackObject instanceof THREE.Mesh)) return;

      let newHeightPercentage = Math.max(0, Math.min(powerValue, 100));
      const maxHeight = rackDimensions.height;
      const newHeight =
        newHeightPercentage > 0
          ? (maxHeight * newHeightPercentage) / 100
          : 0.001;

      if (isNaN(newHeight)) return;

      const newColor = interpolateColor(newHeightPercentage);

      rackObject.geometry.dispose();
      rackObject.geometry = new THREE.BoxGeometry(
        0.55,
        newHeight,
        rackDimensions.depth + 0.02
      );
      (rackObject.material as THREE.MeshStandardMaterial).color.set(newColor);
      rackObject.position.y =
        rackDimensions.height / 200 - maxHeight / 2 + newHeight / 2 - 0.02;
    },
    []
  );

  const handlePowerMessage = useCallback(
    (payloadString: string, mappedRacks: RackData[]) => {
      try {
        const payload = JSON.parse(payloadString);
        if (!payload.value) return;
        const valueData = JSON.parse(payload.value);

        mappedRacks.forEach((rack) => {
          const powerKey = `pue_PDU-${rack.rackNumber}`;
          let powerValue = valueData[powerKey] ?? "0";

          powerValue = parseFloat(String(powerValue).replace("%", ""));
          if (valueData[powerKey] < 1) {
            powerValue *= 100;
          }

          updatePowerIndicator(rack.rackNumber, powerValue);
        });
      } catch (e) {
        console.error("Failed to parse power message:", e);
      }
    },
    [updatePowerIndicator]
  );

  // --- Config Validation & MQTT Subscription ---
  useEffect(() => {
    if (!config.customName || !Array.isArray(config.topicsTemp)) {
      setStatus("error");
      setErrorMessage("Configuration incomplete.");
      return;
    }
    setStatus("ok");
  }, [config]);

  useEffect(() => {
    if (status !== "ok" || !isReady || connectionStatus !== "Connected") return;

    const frontTopics = config.topicsTemp[0] || [];
    const backTopics = config.topicsTemp[1] || [];
    const powerTopic = config.topicPower;

    const mappedRacks = frontTopics.map((_, i) => ({
      rackNumber: i + 1,
      name: `rack-${i + 1}`,
      frontTopic: frontTopics[i] || null,
      backTopic: backTopics[i] || null,
      powerTopic: powerTopic || null,
    }));

    const uniqueTopics = new Set<string>();
    mappedRacks.forEach((r) => {
      if (r.frontTopic) uniqueTopics.add(r.frontTopic);
      if (r.backTopic) uniqueTopics.add(r.backTopic);
    });
    if (powerTopic) uniqueTopics.add(powerTopic);

    uniqueTopics.forEach((topic) => {
      subscribe(topic, (receivedTopic, payload) => {
        if (receivedTopic === powerTopic) {
          handlePowerMessage(payload, mappedRacks);
        } else {
          mappedRacks.forEach((rack) => {
            if (rack.frontTopic === receivedTopic) {
              handleTempHumMessage(payload, rack.rackNumber, "front");
            }
            if (rack.backTopic === receivedTopic) {
              handleTempHumMessage(payload, rack.rackNumber, "back");
            }
          });
        }
      });
    });

    return () => {
      uniqueTopics.forEach((topic) => unsubscribe(topic));
    };
  }, [
    status,
    isReady,
    connectionStatus,
    config,
    subscribe,
    unsubscribe,
    handleTempHumMessage,
    handlePowerMessage,
  ]);

  // --- Panel & Cover Management ---
  const toggleFrontCover = useCallback(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;

    containerCoversRef.current.forEach((cover) => {
      if (coversVisible) {
        scene.remove(cover);
        if (cover.userData.edges) scene.remove(cover.userData.edges);
      } else {
        scene.add(cover);
        if (cover.userData.edges) scene.add(cover.userData.edges);
      }
    });
    setCoversVisible((v) => !v);
  }, [coversVisible]);

  const removeAllPanels = useCallback(() => {
    if (!containerMeshRef.current || !sceneRef.current) return;
    const containerMesh = containerMeshRef.current;
    const scene = sceneRef.current;

    if (Array.isArray(containerMesh.material)) {
      containerMesh.material.forEach((mat, i) => {
        if (i !== 3 && mat instanceof THREE.Material) mat.visible = false;
      });
    }

    if (containerMesh.userData.edges)
      scene.remove(containerMesh.userData.edges);

    if (coversVisible) toggleFrontCover();
  }, [coversVisible, toggleFrontCover]);

  const restoreAllPanels = useCallback(() => {
    if (!containerMeshRef.current || !sceneRef.current) return;
    const containerMesh = containerMeshRef.current;
    const scene = sceneRef.current;

    if (Array.isArray(containerMesh.material)) {
      containerMesh.material = initialMaterialsRef.current.map((mat) =>
        mat ? mat.clone() : new THREE.MeshBasicMaterial({ visible: false })
      );
    }

    if (!containerMesh.userData.edges) {
      const border = addEdgesToObject(containerMesh, 0x000000);
      containerMesh.userData.edges = border;
      scene.add(border);
    }

    if (!coversVisible) toggleFrontCover();
  }, [coversVisible, toggleFrontCover]);

  // --- All ported helper functions from Vue ---
  const addEdgesToObject = (
    object: THREE.Object3D,
    color: THREE.ColorRepresentation
  ): THREE.LineSegments => {
    const mesh = object as THREE.Mesh;
    if (!mesh.isMesh || !mesh.geometry) return new THREE.LineSegments();
    const edges = new THREE.EdgesGeometry(mesh.geometry);
    const line = new THREE.LineSegments(
      edges,
      new THREE.LineBasicMaterial({ color })
    );
    line.position.copy(object.position);
    line.rotation.copy(object.rotation);
    line.scale.copy(object.scale);
    return line;
  };

  const createRec = (
    pos: [number, number, number],
    color: THREE.ColorRepresentation,
    dims: { width: number; height: number; depth: number },
    opacity: number = 1
  ): THREE.Mesh => {
    const geometry = new THREE.BoxGeometry(
      dims.width / 100,
      dims.height / 100,
      dims.depth / 100
    );
    const material = new THREE.MeshStandardMaterial({
      color,
      transparent: opacity < 1,
      opacity,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(pos[0], pos[1], pos[2]);
    return mesh;
  };

  const createCylinder = (
    pos: [number, number, number],
    color: THREE.ColorRepresentation,
    dims: { radius: number; height: number }
  ): THREE.Mesh => {
    const geometry = new THREE.CylinderGeometry(
      dims.radius / 100,
      dims.radius / 100,
      dims.height / 100,
      32
    );
    const material = new THREE.MeshStandardMaterial({ color });
    const cylinder = new THREE.Mesh(geometry, material);
    cylinder.position.set(pos[0], pos[1], pos[2]);
    return cylinder;
  };

  const createCylinderWithFillet = (
    pos: [number, number, number],
    color: THREE.ColorRepresentation,
    dims: { radius: number; height: number }
  ) => {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({ color });
    const cylinderGeometry = new THREE.CylinderGeometry(
      dims.radius / 100,
      dims.radius / 100,
      dims.height / 2 / 100,
      32
    );
    const cylinder = new THREE.Mesh(cylinderGeometry, material);
    cylinder.position.y = dims.height / 4 / 100;
    group.add(cylinder);
    const topFilletGeometry = new THREE.SphereGeometry(
      dims.radius / 100,
      32,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    const topFillet = new THREE.Mesh(topFilletGeometry, material);
    topFillet.position.y = dims.height / 2 / 100;
    group.add(topFillet);
    group.position.set(pos[0], pos[1], pos[2]);
    return group;
  };

  const createOpenTrayWithHoles = (
    pos: [number, number, number],
    color: THREE.ColorRepresentation,
    dims: { width: number; height: number; depth: number },
    holeRadius: number,
    holeSpacing: number
  ) => {
    const group = new THREE.Group();
    const width = dims.width / 100,
      height = dims.height / 100,
      depth = dims.depth / 100;
    const material = new THREE.MeshStandardMaterial({
      color,
      side: THREE.DoubleSide,
    });

    const shape = new THREE.Shape();
    shape.moveTo(-width / 2, -depth / 2);
    shape.lineTo(-width / 2, depth / 2);
    shape.lineTo(width / 2, depth / 2);
    shape.lineTo(width / 2, -depth / 2);
    shape.lineTo(-width / 2, -depth / 2);

    const holes = [];
    for (
      let x = -width / 2 + holeSpacing / 100;
      x < width / 2;
      x += holeSpacing / 100
    ) {
      for (
        let y = -depth / 2 + holeSpacing / 100;
        y < depth / 2;
        y += holeSpacing / 100
      ) {
        const hole = new THREE.Path();
        hole.absarc(x, y, holeRadius / 100, 0, Math.PI * 2, false);
        holes.push(hole);
      }
    }
    shape.holes = holes;

    const extrudeSettings = { depth: 0.01, bevelEnabled: false };
    const bottomGeometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const bottom = new THREE.Mesh(bottomGeometry, material);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = -height / 2;
    group.add(bottom);
    group.position.set(pos[0], pos[1], pos[2]);
    return group;
  };

  // --- Scene Initialization ---
  const initScene = useCallback(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      50,
      mountRef.current.clientWidth / mountRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.set(-5, 5, 8);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(
      mountRef.current.clientWidth,
      mountRef.current.clientHeight
    );
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controlsRef.current = controls;

    scene.add(
      new THREE.AmbientLight(0xffffff, 1),
      new THREE.DirectionalLight(0xffffff, 2)
    );

    const containerGeo = new THREE.BoxGeometry(
      containerDimensions.length,
      containerDimensions.height,
      containerDimensions.width
    );
    const materials = [
      new THREE.MeshStandardMaterial({
        color: 0xe3e3e3,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xe3e3e3,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xe3e3e3,
        side: THREE.DoubleSide,
      }),
      new THREE.MeshStandardMaterial({
        color: 0xe3e3e3,
        side: THREE.DoubleSide,
      }),
    ];
    initialMaterialsRef.current = materials.map((m) => m.clone());
    const container = new THREE.Mesh(containerGeo, materials);
    container.position.y = containerDimensions.height / 2;
    scene.add(container);
    containerMeshRef.current = container;

    const border = addEdgesToObject(container, 0x000000);
    container.userData.edges = border;
    scene.add(border);

    const createPartition = (posX: number) => {
      const geo = new THREE.PlaneGeometry(
        containerDimensions.width,
        containerDimensions.height
      );
      const mat = new THREE.MeshStandardMaterial({
        color: 0xdcdcdc,
        side: THREE.DoubleSide,
      });
      const part = new THREE.Mesh(geo, mat);
      part.rotation.y = Math.PI / 2;
      part.position.set(posX / 100, containerDimensions.height / 2, 0);
      return part;
    };
    scene.add(
      createPartition(-450),
      createPartition(-609.6),
      createPartition(450),
      createPartition(609.6)
    );

    const staticMeshes = [
      createRec([-5.5, 1.75, -1], 0x000000, {
        width: 21,
        height: 25,
        depth: 50,
      }),
      createRec([-5.5, 1.5, -1], 0xff0000, {
        width: 20,
        height: 80,
        depth: 60,
      }),
      createRec([5.65, 1.01, 0.6], 0x000000, {
        width: 102,
        height: 190,
        depth: 70,
      }),
      createRec([5.65, 1.01, 0.6], 0xc3c4c5, {
        width: 100,
        height: 200,
        depth: 80,
      }),
      createRec([-4.55, 1.2, -0.3], 0x0d542e, {
        width: 30,
        height: 20,
        depth: 8,
      }),
      createOpenTrayWithHoles(
        [0, 2.4, 0],
        0x0077ff,
        { width: 1100, height: 10, depth: 30 },
        1.5,
        5
      ),
      createRec([-3.8, 1, -0.7], 0x000000, {
        width: 100,
        height: 189,
        depth: 8,
      }),
      createRec([3.8, 1, -0.7], 0x000000, {
        width: 100,
        height: 189,
        depth: 8,
      }),
      createRec(
        [-3.8, 2.25, -0.7],
        0xffffff,
        { width: 100, height: 60, depth: 8 },
        0.5
      ),
      createRec(
        [3.8, 2.25, -0.7],
        0xffffff,
        { width: 100, height: 60, depth: 8 },
        0.5
      ),
      createRec(
        [0, 2.25, -0.2],
        0xffffff,
        { width: 8, height: 60, depth: 770 },
        0.5
      ),
      createRec([-4.5, 1, 0.5], 0xffffff, {
        width: 100,
        height: 200,
        depth: 8,
      }),
      createRec([-4.5, 2.25, 0.75], 0xff0000, {
        width: 40,
        height: 15,
        depth: 10,
      }),
      createRec([-4.5, 2.25, 0.25], 0xff0000, {
        width: 15,
        height: 15,
        depth: 10,
      }),
      createRec([0, -0.165, 0], 0x000000, {
        width: 243.8,
        height: 30,
        depth: 1219.2,
      }),
      createCylinderWithFillet([-4.75, 0.01, -0.75], 0xff0000, {
        radius: 20,
        height: 250,
      }),
      createCylinder([-4.75, 1.5, -0.75], 0xff0000, { radius: 3, height: 150 }),
      createCylinder([-2, 2.1, -0.75], 0xff0000, { radius: 3, height: 30 }),
      createCylinder([2, 2.1, -0.75], 0xff0000, { radius: 3, height: 30 }),
      createCylinder(
        -0.75,
        2.25,
        -0.75,
        0xff0000,
        { radius: 3, height: 800 },
        true
      ),
      createCylinder(-2.5, 2.555, 0.5, 0xffffff, { radius: 8, height: 7 }),
      createCylinder(-1, 2.555, 0.5, 0xffffff, { radius: 8, height: 7 }),
      createCylinder(0.5, 2.555, 0.5, 0xffffff, { radius: 8, height: 7 }),
      createCylinder(2, 2.555, 0.5, 0xffffff, { radius: 8, height: 7 }),
      createCylinder(-2.5, 2.55, 0.5, 0x000000, { radius: 3, height: 7 }),
      createCylinder(-1, 2.55, 0.5, 0x000000, { radius: 3, height: 7 }),
      createCylinder(0.5, 2.55, 0.5, 0x000000, { radius: 3, height: 7 }),
      createCylinder(2, 2.55, 0.5, 0x000000, { radius: 3, height: 7 }),
    ];
    staticMeshes.forEach((mesh) => {
      if (mesh.geometry.type !== "PlaneGeometry" && mesh.type !== "Group")
        mesh.rotation.y = Math.PI / 2;
      if (mesh.userData.horizontal) mesh.rotation.z = Math.PI / 2;
      scene.add(mesh);
    });

    const covers = [
      createRec([-6.1, 1, 0.5], 0xffffff, {
        width: 100,
        height: 200,
        depth: 8,
      }),
      createRec([6.1, 1, -0.5], 0xffffff, {
        width: 100,
        height: 200,
        depth: 8,
      }),
    ];
    covers.forEach((cover) => {
      cover.rotation.y = Math.PI / 2;
      const border = addEdgesToObject(cover, 0x000000);
      cover.userData.edges = border;
      scene.add(cover, border);
    });
    containerCoversRef.current = covers;

    const createRackLabel = (
      rackNumber: number,
      position: [number, number, number],
      direction: "front" | "back"
    ) => {
      const group = new THREE.Group();
      group.position.set(
        position[0],
        position[1] + 0.75,
        position[2] + (direction === "back" ? 1.35 : -1.35)
      );
      if (direction === "back") group.rotation.y = Math.PI;

      const rackName = new Text();
      rackName.text = `Rack ${rackNumber}`;
      rackName.fontSize = 0.15;
      rackName.color = 0x000000;
      rackName.anchorX = "center";
      rackName.sync();
      group.add(rackName);

      const tempLabel = new Text();
      tempLabel.name = `rack-${rackNumber}-${direction}-temp-label`;
      tempLabel.text = "🌡N/A";
      tempLabel.fontSize = 0.12;
      tempLabel.position.y = -0.25;
      tempLabel.anchorX = "center";
      tempLabel.sync();
      group.add(tempLabel);

      const humLabel = new Text();
      humLabel.name = `rack-${rackNumber}-${direction}-humidity-label`;
      humLabel.text = "💧N/A";
      humLabel.fontSize = 0.12;
      humLabel.position.y = -0.45;
      humLabel.anchorX = "center";
      humLabel.sync();
      group.add(humLabel);

      return group;
    };

    const createPowerIndicator = (
      position: [number, number, number],
      rackNumber: number
    ) => {
      const geo = new THREE.BoxGeometry(
        0.55,
        0.001,
        rackDimensions.depth + 0.02
      ); // Start with minimal height
      const mat = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(
        position[0],
        position[1] - rackDimensions.height / 2,
        position[2]
      );
      mesh.name = `rack-${rackNumber}-power`;
      mesh.rotation.y = Math.PI / 2;
      return mesh;
    };

    const frontTopics = config.topicsTemp[0] || [];
    rackMeshesRef.current = [];
    frontTopics.forEach((_, i) => {
      const rackNumber = i + 1;
      const posX = -3.5 + i * 0.7;
      const posY = rackDimensions.height / 200;
      const posZ = -rackDimensions.depth / 200 - 0.5;

      const rackFrame = createRec([posX, posY, 0], 0x000000, {
        width: rackDimensions.depth * 100,
        height: rackDimensions.height * 100,
        d: rackDimensions.width * 100,
      });
      rackFrame.name = `rack-${rackNumber}`;
      rackFrame.userData = { rackNumber };
      scene.add(rackFrame);
      rackMeshesRef.current.push(rackFrame);

      scene.add(createRackLabel(rackNumber, [posX, posY, posZ], "front"));
      if (config.topicsTemp[1]?.[i])
        scene.add(createRackLabel(rackNumber, [posX, posY, posZ], "back"));
      if (config.topicPower)
        scene.add(createPowerIndicator([posX, posY, 0], rackNumber));
    });

    const onRackClick = (event: MouseEvent) => {
      if (!mountRef.current || !cameraRef.current) return;
      const rect = mountRef.current.getBoundingClientRect();
      mouseRef.current.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, cameraRef.current);
      const intersects = raycasterRef.current.intersectObjects(
        rackMeshesRef.current
      );

      if (intersects.length > 0) {
        const clickedRack = intersects[0].object;
        const rackNumber = clickedRack.userData.rackNumber;
        if (rackNumber) {
          // In a real app, you might use Next.js router
          // For now, this mimics the Vue component's behavior
          alert(`Navigating to details for Rack ${rackNumber}.`);
          // window.location.href = `#/rackdetail/${rackNumber}`;
        }
      }
    };
    renderer.domElement.addEventListener("click", onRackClick);

    let joystickActive = false;
    const movement = { x: 0, y: 0 };
    let rotation = {
      azimuthAngle: Math.atan2(camera.position.x, camera.position.z),
      polarAngle: Math.acos(camera.position.y / camera.position.length()),
    };

    if (joystickRef.current) {
      const joystick = nipplejs.create({
        zone: joystickRef.current,
        mode: "dynamic",
        color: "blue",
      });
      joystick.on("move", (_, data) => {
        movement.x = data.vector.x;
        movement.y = data.vector.y;
        joystickActive = true;
      });
      joystick.on("end", () => {
        movement.x = 0;
        movement.y = 0;
        joystickActive = false;
      });
    }

    const animate = () => {
      animationFrameId.current = requestAnimationFrame(animate);
      if (joystickActive) {
        rotation.azimuthAngle += movement.x * 0.05;
        rotation.polarAngle = Math.max(
          0.1,
          Math.min(Math.PI - 0.1, rotation.polarAngle - movement.y * 0.05)
        );
        const radius = camera.position.length();
        const x =
          radius *
          Math.sin(rotation.polarAngle) *
          Math.sin(rotation.azimuthAngle);
        const y = radius * Math.cos(rotation.polarAngle);
        const z =
          radius *
          Math.sin(rotation.polarAngle) *
          Math.cos(rotation.azimuthAngle);
        camera.position.set(x, y, z);
        camera.lookAt(0, 0, 0);
      }
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !rendererRef.current || !cameraRef.current)
        return;
      const { clientWidth, clientHeight } = mountRef.current;
      rendererRef.current.setSize(clientWidth, clientHeight);
      cameraRef.current.aspect = clientWidth / clientHeight;
      cameraRef.current.updateProjectionMatrix();
    };

    resizeObserver.current = new ResizeObserver(handleResize);
    resizeObserver.current.observe(mountRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId.current);
      resizeObserver.current?.disconnect();
      renderer.domElement.removeEventListener("click", onRackClick);
      if (mountRef.current) mountRef.current.removeChild(renderer.domElement);
      renderer.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
          else o.material.dispose();
        }
      });
    };
  }, [config, coversVisible]);

  useEffect(() => {
    if (status === "ok") {
      const cleanup = initScene();
      return cleanup;
    }
  }, [status, initScene]);

  const animateCamera = (targetPosition: THREE.Vector3) => {
    if (!cameraRef.current || isAnimating) return;
    setIsAnimating(true);
    const startPosition = cameraRef.current.position.clone();
    const duration = 1000;
    let startTime = 0;

    const animateStep = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const t = Math.min((timestamp - startTime) / duration, 1);
      cameraRef.current!.position.lerpVectors(startPosition, targetPosition, t);
      cameraRef.current!.lookAt(0, 0, 0);
      if (t < 1) requestAnimationFrame(animateStep);
      else setIsAnimating(false);
    };
    requestAnimationFrame(animateStep);
  };

  const setView = (view: "isometric" | "front" | "back" | "top" | "side") => {
    let targetPosition: THREE.Vector3;
    switch (view) {
      case "front":
        targetPosition = new THREE.Vector3(0, 5, 7.5);
        break;
      case "back":
        targetPosition = new THREE.Vector3(0, 5, -7.5);
        break;
      case "top":
        targetPosition = new THREE.Vector3(0, 10, 0);
        break;
      case "side":
        targetPosition = new THREE.Vector3(10, 2, 0);
        break;
      default:
        targetPosition = new THREE.Vector3(-5, 2, 5);
    }
    animateCamera(targetPosition);
  };

  if (status === "loading")
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  if (status === "error")
    return (
      <div className="flex h-full items-center justify-center p-4 text-center text-destructive">
        <AlertTriangle className="mr-2" /> {errorMessage}
      </div>
    );

  const ConnIcon = connectionStatus === "Connected" ? Wifi : WifiOff;
  const connColor =
    connectionStatus === "Connected" ? "text-green-500" : "text-red-500";

  return (
    <Card className="w-full h-full border-none shadow-none rounded-lg overflow-hidden">
      <CardContent className="p-0 w-full h-full relative">
        <div ref={mountRef} className="w-full h-full" />
        <div
          ref={joystickRef}
          className="absolute bottom-4 left-4 w-32 h-32 z-20"
        />

        <div className="absolute top-2 left-2 z-10 bg-background/80 p-2 rounded-md shadow-md">
          <ConnIcon className={`h-4 w-4 ${connColor}`} />
        </div>

        <div className="absolute top-2 right-2 z-10 flex flex-col gap-1">
          <Button size="sm" variant="outline" onClick={toggleFrontCover}>
            {coversVisible ? "Hide Covers" : "Show Covers"}
          </Button>
          <Button size="sm" variant="outline" onClick={restoreAllPanels}>
            Restore Panels
          </Button>
          <Button size="sm" variant="destructive" onClick={removeAllPanels}>
            Remove Panels
          </Button>
          <hr className="my-1 border-border/50" />
          <Button
            size="sm"
            onClick={() => setView("isometric")}
            disabled={isAnimating}
          >
            Isometric
          </Button>
          <Button
            size="sm"
            onClick={() => setView("front")}
            disabled={isAnimating}
          >
            Front
          </Button>
          <Button
            size="sm"
            onClick={() => setView("back")}
            disabled={isAnimating}
          >
            Back
          </Button>
          <Button
            size="sm"
            onClick={() => setView("top")}
            disabled={isAnimating}
          >
            Top
          </Button>
          <Button
            size="sm"
            onClick={() => setView("side")}
            disabled={isAnimating}
          >
            Side
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setView("isometric")}
            disabled={isAnimating}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
