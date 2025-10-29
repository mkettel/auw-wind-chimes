import React from "react";
import { Camera, Canvas, Vector3 } from "@react-three/fiber";
import {
  OrbitControls,
  Center,
  Environment,
  Sky,
  SoftShadows,
} from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import { Model } from "./Logo";
import { FallingLetters } from "./FallingLetters";
import { SoundToggle } from "./SoundToggle";
import "./App.css";
import { useThree } from "@react-three/fiber";
import { useRef, useEffect, useState } from "react";
import * as THREE from "three";

function App() {
  // Sound state - always starts OFF (browsers block audio until user interaction)
  const [soundEnabled, setSoundEnabled] = useState(false);

  const toggleSound = () => {
    setSoundEnabled((prev: boolean) => !prev);
  };

  return (
    <div
      className="App"
      style={{ width: "100vw", height: "100vh", position: "relative" }}
    >
      {/* Top fade overlay */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "100px",
          background:
            "linear-gradient(to bottom, rgba(255, 255, 255, 1) 0%, rgba(255, 255, 255, 0) 100%)",
          pointerEvents: "none",
          zIndex: 10,
        }}
      />

      {/* Sound Toggle Button */}
      <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />

      <Canvas shadows gl={{ toneMapping: THREE.NoToneMapping }}>
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 7, 7]}
          intensity={2.5}
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-camera-left={-9}
          shadow-camera-right={15}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
          color="#ffffff"
        />
        <Environment preset="forest" environmentIntensity={1} />
        <CameraController />
        <SoftShadows size={10} samples={12} focus={0} />

        <Physics gravity={[0, -9.8, 0]}>
          {/* Falling Letters */}
          <FallingLetters soundEnabled={soundEnabled} />

          {/* Wall plane */}
          <RigidBody type="fixed">
            <mesh
              receiveShadow
              position={[0, 0, -2.5]}
              rotation={[0, 0, Math.PI / 2]}
            >
              <planeGeometry args={[50, 50]} />
              <meshStandardMaterial color="#ffffff" />
            </mesh>
          </RigidBody>
        </Physics>

        {/* <OrbitControls /> */}
      </Canvas>
    </div>
  );
}

export default App;

export function CameraController() {
  const controlsRef = useRef<any>(null);
  const camera = useThree((state) => state.camera);

  let target = useRef<Vector3>(new THREE.Vector3(2, -1, 0));

  useEffect(() => {
    // Set camera position
    camera.position.set(1.5, -2, 7);

    // Set OrbitControls target (where the camera looks at)
    if (controlsRef.current) {
      target.current = controlsRef.current.target.set(1.5, -1, 0);
      controlsRef.current.update();
    }
  }, [camera]);

  return (
    <OrbitControls
      ref={controlsRef}
      target={target.current}
      enableZoom={false}
      enablePan={false}
      enableRotate={false}
      enableDamping={true}
      dampingFactor={0.05}
      rotateSpeed={0.5}
      panSpeed={0.5}
      zoomSpeed={0.5}
    />
  );
}
