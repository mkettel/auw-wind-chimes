import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Center, Environment, Sky } from "@react-three/drei";
import { Physics, RigidBody } from "@react-three/rapier";
import { Model } from "./Logo";
import { FallingLetters } from "./FallingLetters";
import "./App.css";

function App() {
  return (
    <div className="App" style={{ width: "100vw", height: "100vh" }}>
      <Canvas camera={{ position: [0, 0, 10], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Environment preset="city" />

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
