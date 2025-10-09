import React, { useRef, useState } from "react";
import { Text3D } from "@react-three/drei";
import { RigidBody, useRopeJoint, RapierRigidBody } from "@react-three/rapier";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";

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
      return new THREE.Vector3(-1.5, 0.9, 0.25); // Top center of A
    case "U":
      return new THREE.Vector3(0.2, 0.9, 0.25); // Top center of U
    case "W":
      return new THREE.Vector3(4, 0.9, 0.25); // Top center of W
    default:
      return new THREE.Vector3(0, 1, 0.25);
  }
};

function HangingLetter({
  letter,
  xPosition,
  stringLength,
  color,
  metalness,
  roughness,
}: {
  letter: string;
  xPosition: number;
  stringLength: number;
  color: string;
  metalness: number;
  roughness: number;
}) {
  const anchorRef = useRef<any>(null);
  const letterRef = useRef<any>(null);
  const attachmentPoint = getLetterAttachment(letter);

  useRopeJoint(anchorRef, letterRef, [
    [0, 0, 0],
    [attachmentPoint.x, attachmentPoint.y, attachmentPoint.z],
    stringLength,
  ]);

  // Apply gentle wind force
  useFrame((state) => {
    if (letterRef.current) {
      const time = state.clock.elapsedTime;

      // Create a subtle, natural wind pattern using sine waves
      const windX = Math.sin(time * 0.3 + xPosition) * 0.009; // make last number smaller to make wind more subtle
      const windZ = Math.sin(time * 0.5 + xPosition * 0.5) * 0.001; // make last number smaller to make wind more subtle

      letterRef.current.applyImpulse({ x: windX, y: 0, z: windZ }, true);
    }
  });

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
            metalness={0.8}
          />
        </mesh>
      </RigidBody>

      {/* Letter with physics */}
      <RigidBody
        ref={letterRef}
        colliders="hull"
        linearDamping={0.2}
        angularDamping={0.2}
      >
        <Text3D
          font="https://threejs.org/examples/fonts/helvetiker_bold.typeface.json"
          size={2}
          height={0.5}
          curveSegments={25}
          bevelEnabled={true}
          bevelThickness={0.05}
          bevelSize={0.04}
          bevelSegments={20}
          position={[xPosition, -1.1, 0]}
        >
          {letter}
          <meshStandardMaterial
            color={color}
            metalness={metalness}
            roughness={roughness}
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

function MouseSphere() {
  const sphereRef = useRef<RapierRigidBody>(null);
  const { viewport } = useThree();
  const currentPos = useRef(new THREE.Vector3(0, 0, 0));
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));

  useFrame((state) => {
    if (sphereRef.current) {
      // Convert mouse position to 3D space
      const x = (state.pointer.x * viewport.width) / 2;
      const y = (state.pointer.y * viewport.height) / 2;

      // Update target position
      targetPos.current.set(x, y, 0);

      // Smoothly interpolate current position to target (lerp for fluid motion)
      currentPos.current.lerp(targetPos.current, 0.1);

      sphereRef.current.setTranslation(currentPos.current, true);
    }
  });

  return (
    <RigidBody
      ref={sphereRef}
      type="kinematicPosition"
      colliders="ball"
      sensor={false}
    >
      <mesh>
        <sphereGeometry args={[1.0, 16, 16]} />
        <meshStandardMaterial visible={false} />
      </mesh>
    </RigidBody>
  );
}

export function FallingLetters() {
  const letters = ["A", "U", "W"];
  const spacing = 2.5;
  const stringLength = 15;

  const { letterColor, metalness, roughness } = useControls("Letters", {
    letterColor: { value: "#ffffff", label: "Color" },
    metalness: { value: 0.9, min: 0, max: 1, step: 0.1, label: "Metalness" },
    roughness: { value: 0.0, min: 0, max: 1, step: 0.1, label: "Roughness" },
  });

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
            color={letterColor}
            metalness={metalness}
            roughness={roughness}
          />
        );
      })}
      <MouseSphere />
    </group>
  );
}
