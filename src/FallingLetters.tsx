import React, { useRef } from "react";
import { Text3D } from "@react-three/drei";
import { RigidBody, useRopeJoint } from "@react-three/rapier";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

function String({
  anchorRef,
  letterRef,
  offset,
}: {
  anchorRef: any;
  letterRef: any;
  offset: THREE.Vector3;
}) {
  const lineRef = useRef<any>(null);

  useFrame(() => {
    if (anchorRef.current && letterRef.current && lineRef.current) {
      const anchorPos = anchorRef.current.translation();
      const letterPos = letterRef.current.translation();
      const letterRot = letterRef.current.rotation();

      // Apply rotation to offset
      const rotatedOffset = offset.clone();
      rotatedOffset.applyQuaternion(
        new THREE.Quaternion(letterRot.x, letterRot.y, letterRot.z, letterRot.w)
      );

      const points = [
        new THREE.Vector3(anchorPos.x, anchorPos.y, anchorPos.z),
        new THREE.Vector3(
          letterPos.x + rotatedOffset.x,
          letterPos.y + rotatedOffset.y,
          letterPos.z + rotatedOffset.z
        ),
      ];

      lineRef.current.geometry.setFromPoints(points);
    }
  });

  return (
    <line ref={lineRef}>
      <bufferGeometry />
      <lineBasicMaterial
        color="#cccccc"
        linewidth={1}
        transparent={true}
        opacity={0.5}
      />
    </line>
  );
}

// Different attachment points for each letter shape
const getLetterAttachment = (letter: string) => {
  switch (letter) {
    case "A":
      return new THREE.Vector3(-1.5, 2.2, 0.25); // Top center of A
    case "U":
      return new THREE.Vector3(0.2, 2.1, 0.25); // Top center of U
    case "W":
      return new THREE.Vector3(4, 2.1, 0.25); // Top center of W
    default:
      return new THREE.Vector3(0, 1, 0.25);
  }
};

function HangingLetter({
  letter,
  xPosition,
  stringLength,
}: {
  letter: string;
  xPosition: number;
  stringLength: number;
}) {
  const anchorRef = useRef<any>(null);
  const letterRef = useRef<any>(null);
  const attachmentPoint = getLetterAttachment(letter);

  useRopeJoint(anchorRef, letterRef, [
    [0, 0, 0],
    [attachmentPoint.x, attachmentPoint.y, attachmentPoint.z],
    stringLength,
  ]);

  return (
    <>
      {/* Fixed anchor point (invisible) */}
      <RigidBody
        ref={anchorRef}
        type="fixed"
        position={[xPosition, stringLength, 0]}
      >
        <mesh>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color="#000000"
            roughness={0.5}
            metalness={0.5}
          />
        </mesh>
      </RigidBody>

      {/* Letter with physics */}
      <RigidBody ref={letterRef} colliders="hull">
        <Text3D
          font="https://threejs.org/examples/fonts/helvetiker_bold.typeface.json"
          size={2}
          height={0.5}
          curveSegments={12}
          bevelEnabled={true}
          bevelThickness={0.05}
          bevelSize={0.02}
          bevelSegments={10}
          position={[xPosition, 0.1, 0]}
        >
          {letter}
          <meshStandardMaterial
            color="#000000"
            metalness={0.3}
            roughness={0.4}
          />
        </Text3D>
      </RigidBody>

      {/* Visual string */}
      <String
        anchorRef={anchorRef}
        letterRef={letterRef}
        offset={attachmentPoint}
      />
    </>
  );
}

export function FallingLetters() {
  const letters = ["A", "U", "W"];
  const spacing = 2.5;
  const stringLength = 10;

  return (
    <group>
      {letters.map((letter, index) => {
        const xPosition = index * spacing - spacing;
        return (
          <HangingLetter
            key={letter}
            letter={letter}
            xPosition={xPosition}
            stringLength={stringLength}
          />
        );
      })}
    </group>
  );
}
