import React from "react";
import { Text } from "@react-three/drei";
import { RigidBody } from "@react-three/rapier";
import { Mesh } from "three";

export function AUWText() {
  const letters = ["A", "U", "W"];
  const spacing = 2.5;

  return (
    <group>
      {letters.map((letter, index) => (
        <RigidBody key={letter} colliders="cuboid">
          <Text
            font="/fonts/SharpGrotesk-SemiBold20.otf"
            fontSize={1.5}
            position={[index * spacing - spacing, 3, 0]}
            anchorX="center"
            anchorY="middle"
          >
            {letter}
            <meshStandardMaterial color="#ffffff" />
          </Text>
        </RigidBody>
      ))}
    </group>
  );
}
