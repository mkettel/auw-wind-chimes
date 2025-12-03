import React, { useRef, useState, useEffect, createContext, useContext } from "react";
import { RigidBody, useRopeJoint } from "@react-three/rapier";
import { useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import * as THREE from "three";
import { useControls } from "leva";
import { LetterAModel } from "./LetterA";
import { LetterUModel } from "./LetterU";
import { LetterWModel } from "./LetterW";
import { RegisterModel } from "./Register";

// Grab state context for managing letter grabbing
interface GrabState {
  grabbedLetter: string | null;
  setGrabbedLetter: (letter: string | null) => void;
  mouseWorldPos: React.MutableRefObject<THREE.Vector3>;
}

const GrabContext = createContext<GrabState | null>(null);

const useGrab = () => {
  const context = useContext(GrabContext);
  if (!context) throw new Error('useGrab must be used within GrabProvider');
  return context;
};

// Audio context for wind chime sounds
let audioContext: AudioContext | null = null;

const getAudioContext = () => {
  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
  }
  return audioContext;
};

// Play a realistic wind chime sound with harmonics
const playChimeSound = (frequency: number, volume: number = 0.3) => {
  const ctx = getAudioContext();
  const now = ctx.currentTime;
  const decayTime = 3.5; // Longer, more realistic decay

  // Create fundamental tone (main frequency)
  const fundamental = ctx.createOscillator();
  const fundamentalGain = ctx.createGain();

  fundamental.type = "sine";
  fundamental.frequency.setValueAtTime(frequency, now);

  // Add subtle harmonic overtones for metallic quality
  const harmonic1 = ctx.createOscillator();
  const harmonic1Gain = ctx.createGain();
  harmonic1.type = "sine";
  harmonic1.frequency.setValueAtTime(frequency * 2.76, now); // Metallic overtone

  const harmonic2 = ctx.createOscillator();
  const harmonic2Gain = ctx.createGain();
  harmonic2.type = "sine";
  harmonic2.frequency.setValueAtTime(frequency * 5.4, now); // Higher overtone

  // Natural exponential decay envelope (like real bells)
  // Fundamental (loudest)
  fundamentalGain.gain.setValueAtTime(volume * 0.7, now);
  fundamentalGain.gain.exponentialRampToValueAtTime(0.001, now + decayTime);

  // First harmonic (quieter, faster decay)
  harmonic1Gain.gain.setValueAtTime(volume * 0.15, now);
  harmonic1Gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime * 0.6);

  // Second harmonic (very quiet, fastest decay)
  harmonic2Gain.gain.setValueAtTime(volume * 0.05, now);
  harmonic2Gain.gain.exponentialRampToValueAtTime(0.001, now + decayTime * 0.3);

  // Connect everything
  fundamental.connect(fundamentalGain);
  harmonic1.connect(harmonic1Gain);
  harmonic2.connect(harmonic2Gain);

  fundamentalGain.connect(ctx.destination);
  harmonic1Gain.connect(ctx.destination);
  harmonic2Gain.connect(ctx.destination);

  // Start all oscillators
  fundamental.start(now);
  harmonic1.start(now);
  harmonic2.start(now);

  // Stop all oscillators
  fundamental.stop(now + decayTime);
  harmonic1.stop(now + decayTime * 0.6);
  harmonic2.stop(now + decayTime * 0.3);
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

// GrabController: Tracks mouse world position
function GrabController({ children }: { children: React.ReactNode }) {
  const [grabbedLetter, setGrabbedLetter] = useState<string | null>(null);
  const mouseWorldPos = useRef(new THREE.Vector3(0, 0, 0));
  const { camera } = useThree();

  // Track mouse world position
  useFrame((state) => {
    // Convert mouse to world space at z=0
    const vector = new THREE.Vector3(state.pointer.x, state.pointer.y, 0.5);
    vector.unproject(camera);
    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z;
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    mouseWorldPos.current.copy(pos);
  });

  // Handle global pointer up to release grabbed letter
  useEffect(() => {
    const handlePointerUp = () => {
      document.body.style.cursor = 'auto';
      setGrabbedLetter(null);
    };
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('mouseup', handlePointerUp);
    return () => {
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mouseup', handlePointerUp);
    };
  }, []);

  return (
    <GrabContext.Provider
      value={{
        grabbedLetter,
        setGrabbedLetter,
        mouseWorldPos,
      }}
    >
      {children}
    </GrabContext.Provider>
  );
}

// Different attachment points for each letter shape. strings are attached to the top of the letter.
const getLetterAttachment = (letter: string) => {
  switch (letter) {
    case "A":
      return new THREE.Vector3(-1.55, 0.9, 0.25); // Top center of A
    case "U":
      return new THREE.Vector3(0.2, 0.9, 0.25); // Top center of U
    case "W":
      return new THREE.Vector3(2.4, 0.9, 0.25); // Top center of W
    case "R":
      return new THREE.Vector3(4.0, 0.5, 0.5); // Top center of Register
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
  attachmentPoint,
  secondAttachmentPoint,
  letterOffset,
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
  frequencies: { A: number; U: number; W: number; R: number };
  attachmentPoint: THREE.Vector3;
  secondAttachmentPoint?: THREE.Vector3;
  letterOffset: THREE.Vector3;
}) {
  const anchorRef = useRef<any>(null);
  const anchorRef2 = useRef<any>(null); // Second anchor for U and W
  const anchorRef3 = useRef<any>(null); // Third anchor for W
  const letterRef = useRef<any>(null);
  const lastCollisionTime = useRef(0);
  const wasGrabbedRef = useRef(false);
  const grabOffsetRef = useRef(new THREE.Vector3()); // Offset from mouse to letter center at grab time

  // Grab state
  const { grabbedLetter, setGrabbedLetter, mouseWorldPos } = useGrab();
  const isGrabbed = grabbedLetter === letter;

  // Grab tuning parameter
  const GRAB_STIFFNESS = 15; // How quickly letter moves toward target

  // Different frequencies for each letter (like wind chimes)
  const getChimeFrequency = (letter: string) => {
    switch (letter) {
      case "A":
        return frequencies.A;
      case "U":
        return frequencies.U;
      case "W":
        return frequencies.W;
      case "R":
        return frequencies.R;
      default:
        return 440;
    }
  };

  const handleCollision = (event: any) => {
    if (!soundEnabled) return; // Skip if sound is disabled

    // Check if collision is with another letter (not anchor)
    const otherBody = event.other.rigidBodyObject;
    if (!otherBody || !otherBody.name) {
      return;
    }

    const now = Date.now();
    // Prevent sound spam - only play if 200ms has passed since last collision
    if (now - lastCollisionTime.current > 100) {
      const frequency = getChimeFrequency(letter);
      playChimeSound(frequency, soundVolume);
      lastCollisionTime.current = now;
    }
  };

  // Pointer event handlers for grab interaction
  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation();

    // Store offset between mouse and letter position at grab time
    if (letterRef.current) {
      const letterPos = letterRef.current.translation();
      grabOffsetRef.current.set(
        letterPos.x - mouseWorldPos.current.x,
        letterPos.y - mouseWorldPos.current.y,
        0
      );
    }

    document.body.style.cursor = 'grabbing';
    setGrabbedLetter(letter);
  };

  const handlePointerEnter = () => {
    if (!grabbedLetter) {
      document.body.style.cursor = 'grab';
    }
  };

  const handlePointerLeave = () => {
    if (!grabbedLetter) {
      document.body.style.cursor = 'auto';
    }
  };

  useRopeJoint(anchorRef, letterRef, [
    [0, 0, 0],
    [attachmentPoint.x, attachmentPoint.y, attachmentPoint.z],
    stringLength,
  ]);

  // Second rope joint - for U, W, and R
  const hasSecondString = letter === "U" || letter === "W" || letter === "R";

  // Get second attachment point based on letter type
  const getSecondAttachment = (): [number, number, number] => {
    if (letter === "W") return [3.8, 0.9, 0.25];
    if (letter === "U") return [1.5, 0.9, 0.25];
    if (letter === "R" && secondAttachmentPoint) {
      return [
        secondAttachmentPoint.x,
        secondAttachmentPoint.y,
        secondAttachmentPoint.z,
      ];
    }
    return [0, 0, 0];
  };

  useRopeJoint(hasSecondString ? anchorRef2 : anchorRef, letterRef, [
    [0, 0, 0],
    getSecondAttachment(),
    stringLength,
  ]);

  // Third rope joint - only for W
  const hasThirdString = letter === "W";
  useRopeJoint(hasThirdString ? anchorRef3 : anchorRef, letterRef, [
    [0, 0, 0],
    [4.9, 0.9, 0.25],
    stringLength,
  ]);

  // Apply gentle wind force and handle grab/drag
  useFrame((state) => {
    if (!letterRef.current) return;

    const time = state.clock.elapsedTime;
    const mass = letterRef.current.mass();

    // Handle grab behavior
    if (isGrabbed) {
      const letterPos = letterRef.current.translation();

      // Target position = mouse position + the offset we stored at grab time
      const targetX = mouseWorldPos.current.x + grabOffsetRef.current.x;
      const targetY = mouseWorldPos.current.y + grabOffsetRef.current.y;

      // Calculate difference to target
      const dx = targetX - letterPos.x;
      const dy = targetY - letterPos.y;

      // Set velocity directly toward target
      letterRef.current.setLinvel(
        {
          x: dx * GRAB_STIFFNESS,
          y: dy * GRAB_STIFFNESS,
          z: 0,
        },
        true
      );

      wasGrabbedRef.current = true;
    } else if (wasGrabbedRef.current) {
      // Just released - let physics take over naturally
      wasGrabbedRef.current = false;
    } else {
      // Normal wind behavior when not grabbed
      const windX =
        Math.sin(time * windSpeed + xPosition) * windStrength * mass;
      const windZ =
        Math.sin(time * (windSpeed * 1.5) + xPosition * 0.5) *
        (windStrength * 0.3) *
        mass;

      letterRef.current.applyImpulse({ x: windX, y: 0, z: windZ }, true);
    }
  });

  return (
    <>
      {/* Fixed anchor point */}
      <RigidBody
        ref={anchorRef}
        type="fixed"
        position={[
          letter === "R" ? xPosition + 0.5 : xPosition,
          stringLength,
          0,
        ]}
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

      {/* Second anchor point for R */}
      {letter === "R" && (
        <RigidBody
          ref={anchorRef2}
          type="fixed"
          position={[xPosition + 1.5, stringLength, 0]}
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
      )}

      {/* Second anchor point for U */}
      {letter === "U" && (
        <RigidBody
          ref={anchorRef2}
          type="fixed"
          position={[xPosition + 1.2, stringLength, 0]}
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
      )}

      {/* Second anchor point for W */}
      {letter === "W" && (
        <RigidBody
          ref={anchorRef2}
          type="fixed"
          position={[xPosition + 1.2, stringLength, 0]}
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
      )}

      {/* Third anchor point for W letter */}
      {letter === "W" && (
        <RigidBody
          ref={anchorRef3}
          type="fixed"
          position={[xPosition + 2.4, stringLength, 0]}
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
      )}

      {/* Letter with physics */}
      <RigidBody
        ref={letterRef}
        colliders="hull"
        linearDamping={damping}
        angularDamping={damping}
        onCollisionEnter={handleCollision}
        name={`letter-${letter}`}
        position={letter === "R" ? [xPosition + 1.0, 0, 0] : undefined}
        mass={letter === "R" ? 11 : 0.5}
      >
        <group
          position={[
            letter === "R" ? letterOffset.x : xPosition + letterOffset.x,
            letter === "R" ? 2.0 + letterOffset.y : -1.1 + letterOffset.y,
            letterOffset.z,
          ]}
          onPointerDown={handlePointerDown}
          onPointerEnter={handlePointerEnter}
          onPointerLeave={handlePointerLeave}
        >
          {letter === "A" && (
            <LetterAModel
              color={color}
              metalness={metalness}
              roughness={roughness}
            />
          )}
          {letter === "U" && (
            <LetterUModel
              color={color}
              metalness={metalness}
              roughness={roughness}
            />
          )}
          {letter === "W" && (
            <LetterWModel
              color={color}
              metalness={metalness}
              roughness={roughness}
            />
          )}
          {letter === "R" && (
            <RegisterModel
              color={color}
              metalness={metalness}
              roughness={roughness}
            />
          )}
        </group>
      </RigidBody>

      {/* Visual string */}
      <String
        anchorRef={anchorRef}
        letterRef={letterRef}
        offset={attachmentPoint}
        color={stringColor}
        opacity={stringOpacity}
      />

      {/* Second string for R */}
      {letter === "R" && secondAttachmentPoint && (
        <String
          anchorRef={anchorRef2}
          letterRef={letterRef}
          offset={secondAttachmentPoint}
          color={stringColor}
          opacity={stringOpacity}
        />
      )}

      {/* Second string for U */}
      {letter === "U" && (
        <String
          anchorRef={anchorRef2}
          letterRef={letterRef}
          offset={new THREE.Vector3(1.5, 0.9, 0.25)}
          color={stringColor}
          opacity={stringOpacity}
        />
      )}

      {/* Second string for W */}
      {letter === "W" && (
        <String
          anchorRef={anchorRef2}
          letterRef={letterRef}
          offset={new THREE.Vector3(3.8, 0.9, 0.25)}
          color={stringColor}
          opacity={stringOpacity}
        />
      )}

      {/* Third string for W letter */}
      {letter === "W" && (
        <String
          anchorRef={anchorRef3}
          letterRef={letterRef}
          offset={new THREE.Vector3(5.15, 0.9, 0.25)}
          color={stringColor}
          opacity={stringOpacity}
        />
      )}
    </>
  );
}

interface FallingLettersProps {
  soundEnabled?: boolean;
}

export function FallingLetters({ soundEnabled = false }: FallingLettersProps) {
  const letters = ["A", "U", "W", "R"];
  const spacing = 2.5;
  const stringLength = 15;

  // Hardcoded values (to enable GUI, comment these out and uncomment useControls blocks below)
  const letterColor = "#000000";
  const metalness = 0.9;
  const roughness = 0.0;
  const windStrength = 0.001;
  const windSpeed = 0.3;
  const damping = 0.2;
  const stringColor = "#000000";
  const stringOpacity = 0.1;
  const soundVolume = 0.2;
  // Pentatonic scale frequencies for harmonious wind chime sounds
  const freqA = 523.25; // C5
  const freqU = 392.0; // G4
  const freqW = 293.66; // D4
  const freqR = 261.63; // C4

  // Uncomment these blocks to enable Leva GUI controls
  // const { letterColor, metalness, roughness } = useControls("Letters", {
  //   letterColor: { value: "#ffffff", label: "Color" },
  //   metalness: { value: 0.9, min: 0, max: 1, step: 0.1, label: "Metalness" },
  //   roughness: { value: 0.0, min: 0, max: 1, step: 0.1, label: "Roughness" },
  // });

  // const { windStrength, windSpeed, damping } = useControls("Physics", {
  //   windStrength: {
  //     value: 0.001,
  //     min: 0,
  //     max: 0.05,
  //     step: 0.001,
  //     label: "Wind Strength",
  //   },
  //   windSpeed: { value: 0.3, min: 0.1, max: 2, step: 0.1, label: "Wind Speed" },
  //   damping: { value: 0.2, min: 0, max: 2, step: 0.1, label: "Damping" },
  // });

  // const { stringOpacity, stringColor } = useControls("Strings", {
  //   stringColor: { value: "#000000", label: "String Color" },
  //   stringOpacity: { value: 0.1, min: 0, max: 1, step: 0.1, label: "Opacity" },
  // });

  // const { soundEnabled, soundVolume, freqA, freqU, freqW, freqR } = useControls(
  //   "Sound",
  //   {
  //     soundEnabled: { value: false, label: "Enable Sound" },
  //     soundVolume: { value: 0.2, min: 0, max: 1, step: 0.05, label: "Volume" },
  //     freqA: {
  //       value: 396.25,
  //       min: 200,
  //       max: 1000,
  //       step: 1,
  //       label: "A Frequency (Hz)",
  //     },
  //     freqU: {
  //       value: 265.25,
  //       min: 200,
  //       max: 1000,
  //       step: 1,
  //       label: "U Frequency (Hz)",
  //     },
  //     freqW: {
  //       value: 200.99,
  //       min: 200,
  //       max: 1000,
  //       step: 1,
  //       label: "W Frequency (Hz)",
  //     },
  //     freqR: {
  //       value: 528.0,
  //       min: 200,
  //       max: 1000,
  //       step: 1,
  //       label: "R Frequency (Hz)",
  //     },
  //   }
  // );

  // String attachment points (hardcoded)
  const attachmentPoints = React.useMemo(
    () => ({
      A: new THREE.Vector3(-0.6, 0.08, 0.3),
      U: new THREE.Vector3(0.2, 0.9, 0.25),
      W: new THREE.Vector3(2.4, 0.9, 0.25),
      R: new THREE.Vector3(4.18, 1.91, 0.44),
    }),
    []
  );

  const secondAttachmentPoints = React.useMemo(
    () => ({
      R: new THREE.Vector3(4.1, 1.48, 0.68),
    }),
    []
  );

  const letterOffsets = React.useMemo(
    () => ({
      A: new THREE.Vector3(0, 0, 0),
      U: new THREE.Vector3(0, 0, 0),
      W: new THREE.Vector3(0, 0, 0),
      R: new THREE.Vector3(3.62, -0.4, 0.0),
    }),
    []
  );

  // Helper to get attachment point for each letter (first string)
  const getAttachmentPoint = (letter: string) => {
    return (
      attachmentPoints[letter as keyof typeof attachmentPoints] ||
      new THREE.Vector3(0, 1, 0.25)
    );
  };

  // Helper to get second attachment point for R
  const getSecondAttachmentPoint = (letter: string) => {
    return secondAttachmentPoints[
      letter as keyof typeof secondAttachmentPoints
    ];
  };

  // Helper to get letter offset for each letter
  const getLetterOffset = (letter: string) => {
    return (
      letterOffsets[letter as keyof typeof letterOffsets] ||
      new THREE.Vector3(0, 0, 0)
    );
  };

  return (
    <GrabController>
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
              frequencies={{ A: freqA, U: freqU, W: freqW, R: freqR }}
              attachmentPoint={getAttachmentPoint(letter)}
              secondAttachmentPoint={getSecondAttachmentPoint(letter)}
              letterOffset={getLetterOffset(letter)}
            />
          );
        })}
      </group>
    </GrabController>
  );
}
