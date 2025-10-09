import React, { useRef, useState, useEffect } from "react";
import { Text3D } from "@react-three/drei";
import { RigidBody, useRopeJoint, RapierRigidBody } from "@react-three/rapier";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";

// Audio context for wind chime sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Play a wind chime sound with a specific frequency
const playChimeSound = (frequency: number, volume: number = 0.3) => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;

  // Create oscillator for the chime tone
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(frequency, now);

  // Envelope for natural chime decay
  gainNode.gain.setValueAtTime(volume, now);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 1.5); // make last number smaller to make sound more subtle

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + 1.5); // make last number smaller to make sound more subtle
};

function String({
  anchorRef,
  letterRef,
  offset,
  color,
  opacity,
}: {
  anchorRef: any;
  letterRef: any;
  offset: THREE.Vector3;
  color: string;
  opacity: number;
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
        color={color}
        linewidth={1}
        transparent={true}
        opacity={opacity}
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
  windStrength,
  windSpeed,
  damping,
  stringColor,
  stringOpacity,
  soundEnabled,
  soundVolume,
  frequencies,
}: {
  letter: string;
  xPosition: number;
  stringLength: number;
  color: string;
  metalness: number;
  roughness: number;
  windStrength: number;
  windSpeed: number;
  damping: number;
  stringColor: string;
  stringOpacity: number;
  soundEnabled: boolean;
  soundVolume: number;
  frequencies: { A: number; U: number; W: number };
}) {
  const anchorRef = useRef<any>(null);
  const letterRef = useRef<any>(null);
  const attachmentPoint = getLetterAttachment(letter);
  const lastCollisionTime = useRef(0);

  // Different frequencies for each letter (like wind chimes)
  const getChimeFrequency = (letter: string) => {
    switch (letter) {
      case "A":
        return frequencies.A;
      case "U":
        return frequencies.U;
      case "W":
        return frequencies.W;
      default:
        return 440;
    }
  };

  const handleCollision = (event: any) => {
    if (!soundEnabled) return; // Skip if sound is disabled

    // Check if collision is with another letter (not the mouse sphere or anchor)
    const otherBody = event.other.rigidBodyObject;
    if (!otherBody || !otherBody.name || otherBody.name === "mouseSphere") {
      return; // Don't play sound for mouse collisions
    }

    const now = Date.now();
    // Prevent sound spam - only play if 200ms has passed since last collision
    if (now - lastCollisionTime.current > 100) {
      const frequency = getChimeFrequency(letter);
      playChimeSound(frequency, soundVolume);
      lastCollisionTime.current = now;
    }
  };

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
      const windX = Math.sin(time * windSpeed + xPosition) * windStrength;
      const windZ =
        Math.sin(time * (windSpeed * 1.5) + xPosition * 0.5) *
        (windStrength * 0.3);

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
        linearDamping={damping}
        angularDamping={damping}
        onCollisionEnter={handleCollision}
        name={`letter-${letter}`}
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
        color={stringColor}
        opacity={stringOpacity}
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
      name="mouseSphere"
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

  const { windStrength, windSpeed, damping } = useControls("Physics", {
    windStrength: {
      value: 0.009,
      min: 0,
      max: 0.05,
      step: 0.001,
      label: "Wind Strength",
    },
    windSpeed: { value: 0.3, min: 0.1, max: 2, step: 0.1, label: "Wind Speed" },
    damping: { value: 0.2, min: 0, max: 2, step: 0.1, label: "Damping" },
  });

  const { stringOpacity, stringColor } = useControls("Strings", {
    stringColor: { value: "#cccccc", label: "String Color" },
    stringOpacity: { value: 0.1, min: 0, max: 1, step: 0.1, label: "Opacity" },
  });

  const { soundEnabled, soundVolume, freqA, freqU, freqW } = useControls(
    "Sound",
    {
      soundEnabled: { value: false, label: "Enable Sound" },
      soundVolume: { value: 0.2, min: 0, max: 1, step: 0.05, label: "Volume" },
      freqA: {
        value: 396.25,
        min: 200,
        max: 1000,
        step: 1,
        label: "A Frequency (Hz)",
      },
      freqU: {
        value: 265.25,
        min: 200,
        max: 1000,
        step: 1,
        label: "U Frequency (Hz)",
      },
      freqW: {
        value: 200.99,
        min: 200,
        max: 1000,
        step: 1,
        label: "W Frequency (Hz)",
      },
    }
  );

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
            windStrength={windStrength}
            windSpeed={windSpeed}
            damping={damping}
            stringColor={stringColor}
            stringOpacity={stringOpacity}
            soundEnabled={soundEnabled}
            soundVolume={soundVolume}
            frequencies={{ A: freqA, U: freqU, W: freqW }}
          />
        );
      })}
      <MouseSphere />
    </group>
  );
}
