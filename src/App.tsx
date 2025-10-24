import React from "react";
import { Camera, Canvas, Vector3 } from "@react-three/fiber";
import { OrbitControls, Center, Environment, Sky } from "@react-three/drei";
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
      <Canvas>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="forest" />
        <CameraController />

        <Physics gravity={[0, -9.8, 0]}>
          {/* Falling Letters */}
          <FallingLetters />

          {/* Ground plane */}
          {/* <RigidBody type="fixed">
            <mesh
              receiveShadow
              position={[0, -10, 0]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[90, 50]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          </RigidBody> */}
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
