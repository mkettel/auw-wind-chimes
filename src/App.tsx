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
import "./App.css";
import { useThree } from "@react-three/fiber";
import { useRef, useEffect } from "react";
import * as THREE from "three";

function App() {
  return (
    <div className="App" style={{ width: "100vw", height: "100vh" }}>
      <Canvas shadows gl={{ toneMapping: THREE.NoToneMapping }}>
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[9, 2, 5]}
          intensity={2.5}
          castShadow
          shadow-mapSize={[512, 512]}
          shadow-camera-left={-5}
          shadow-camera-right={15}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <Environment preset="forest" environmentIntensity={1} />
        <CameraController />
        <SoftShadows size={10} samples={10} focus={0} />

        <Physics gravity={[0, -9.8, 0]}>
          {/* Falling Letters */}
          <FallingLetters />

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
    camera.position.set(1.5, -2, 8);

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
