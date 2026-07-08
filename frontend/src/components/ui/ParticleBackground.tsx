'use client';

import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Line } from '@react-three/drei';
import * as THREE from 'three';

// 1. Twinkling Starfield (Optimized to 700 stars)
function TwinklingStars() {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 700;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = -3 - Math.random() * 8;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.z = state.clock.elapsedTime * 0.003;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color="#ffffff"
        size={0.007}
        sizeAttenuation
        depthWrite={false}
        opacity={0.5}
      />
    </Points>
  );
}

// 2. Glowing Sun (Optimized segments & corona layers)
function Sun() {
  const sunRef = useRef<THREE.Mesh>(null);
  const flareRef = useRef<THREE.Points>(null);

  const flareCount = 60;
  const flarePositions = useMemo(() => {
    const pos = new Float32Array(flareCount * 3);
    for (let i = 0; i < flareCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 0.6 + Math.random() * 0.15;
      pos[i * 3] = Math.cos(angle) * radius;
      pos[i * 3 + 1] = Math.sin(angle) * radius;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 0.05;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (sunRef.current) {
      sunRef.current.rotation.y = state.clock.elapsedTime * 0.03;
    }
    if (flareRef.current) {
      flareRef.current.rotation.z = -state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <group position={[-1.6, 0.2, 0]}>
      {/* Core Sun (Reduced segments to 16) */}
      <mesh ref={sunRef}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color="#FFB300" toneMapped={false} />
      </mesh>
      
      {/* Corona Glow (Single optimized layer) */}
      <mesh>
        <sphereGeometry args={[0.66, 16, 16]} />
        <meshBasicMaterial color="#FF6F00" transparent opacity={0.2} depthWrite={false} />
      </mesh>

      {/* Solar Flares Points */}
      <Points ref={flareRef} positions={flarePositions} stride={3}>
        <PointMaterial
          transparent
          color="#FF3D00"
          size={0.015}
          sizeAttenuation
          depthWrite={false}
          opacity={0.7}
        />
      </Points>
      
      <pointLight color="#FFD54F" intensity={2.0} distance={8} decay={1.5} />
    </group>
  );
}

// 3. Planet (Optimized segments & basic materials)
interface PlanetProps {
  radius: number;
  speed: number;
  size: number;
  color: string;
  hasRings?: boolean;
  hasMoon?: boolean;
  startAngle?: number;
}

function Planet({ radius, speed, size, color, hasRings = false, hasMoon = false, startAngle = 0 }: PlanetProps) {
  const planetRef = useRef<THREE.Mesh>(null);
  const orbitRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    const angle = startAngle + state.clock.elapsedTime * speed;
    if (orbitRef.current) {
      orbitRef.current.position.x = -1.6 + Math.cos(angle) * radius;
      orbitRef.current.position.y = 0.2 + Math.sin(angle) * radius * 0.7;
      orbitRef.current.position.z = Math.sin(angle) * radius * 0.4;
    }

    if (planetRef.current) {
      planetRef.current.rotation.y = state.clock.elapsedTime * 0.15;
    }

    if (moonRef.current && hasMoon) {
      const moonAngle = state.clock.elapsedTime * 1.2;
      moonRef.current.position.x = Math.cos(moonAngle) * 0.12;
      moonRef.current.position.y = Math.sin(moonAngle) * 0.08;
      moonRef.current.position.z = Math.sin(moonAngle) * 0.08;
    }
  });

  const pathPoints = useMemo(() => {
    const pts = [];
    const segments = 64; // Reduced from 100
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      pts.push(new THREE.Vector3(
        -1.6 + Math.cos(theta) * radius,
        0.2 + Math.sin(theta) * radius * 0.7,
        Math.sin(theta) * radius * 0.4
      ));
    }
    return pts;
  }, [radius]);

  return (
    <group>
      <Line points={pathPoints} color="#00E5FF" opacity={0.04} transparent lineWidth={1} />

      <group ref={orbitRef}>
        {/* Planet (Reduced segments to 8) */}
        <mesh ref={planetRef}>
          <sphereGeometry args={[size, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>

        {/* Saturn's Rings (Reduced segments) */}
        {hasRings && (
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <ringGeometry args={[size * 1.4, size * 2.2, 16]} />
            <meshBasicMaterial color="#C8A261" side={THREE.DoubleSide} transparent opacity={0.3} />
          </mesh>
        )}

        {/* Earth's Moon */}
        {hasMoon && (
          <mesh ref={moonRef}>
            <sphereGeometry args={[size * 0.3, 6, 6]} />
            <meshBasicMaterial color="#94a3b8" />
          </mesh>
        )}
      </group>
    </group>
  );
}

// 4. Space Nebula Cloud (Optimized to 80 points)
function NebulaCloud({ color, position }: { color: string; position: [number, number, number] }) {
  const pointsRef = useRef<THREE.Points>(null);
  const count = 80;
  
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = position[0] + (Math.random() - 0.5) * 3;
      pos[i * 3 + 1] = position[1] + (Math.random() - 0.5) * 2;
      pos[i * 3 + 2] = position[2] + (Math.random() - 0.5) * 2;
    }
    return pos;
  }, [position]);

  useFrame((state) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.005) * 0.05;
    }
  });

  return (
    <Points ref={pointsRef} positions={positions} stride={3} frustumCulled={false}>
      <PointMaterial
        transparent
        color={color}
        size={0.035}
        sizeAttenuation
        depthWrite={false}
        opacity={0.05}
      />
    </Points>
  );
}

export default function ParticleBackground() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none">
      <div className="absolute inset-0 bg-gradient-to-br from-[#010103] via-[#040409] to-[#010103]" />
      
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-amber-500/2 rounded-full blur-[140px]" />
      <div className="absolute top-[10%] right-[10%] w-[60%] h-[60%] bg-violet-600/2 rounded-full blur-[150px]" />
      <div className="absolute bottom-[10%] left-[20%] w-[50%] h-[50%] bg-cyan-500/2 rounded-full blur-[140px]" />

      <Canvas
        camera={{ position: [0, 0, 3], fov: 55 }}
        gl={{ antialias: false, powerPreference: "high-performance" }}
        dpr={[1, 1.5]}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.3} />
        <TwinklingStars />

        <NebulaCloud color="#00E5FF" position={[-1.5, 0.5, -2.5]} />
        <NebulaCloud color="#7C4DFF" position={[1.5, -0.5, -2.0]} />
        <NebulaCloud color="#00FFB3" position={[0.2, 0.8, -3.0]} />

        <Sun />

        <Planet radius={0.9} speed={0.16} size={0.045} color="#949494" startAngle={0.5} />
        <Planet radius={1.3} speed={0.11} size={0.065} color="#d4b273" startAngle={2.1} />
        <Planet radius={1.7} speed={0.08} size={0.075} color="#3585c5" hasMoon={true} startAngle={4.0} />
        <Planet radius={2.1} speed={0.06} size={0.055} color="#b84514" startAngle={1.2} />
        <Planet radius={2.7} speed={0.04} size={0.140} color="#a67b41" startAngle={3.3} />
        <Planet radius={3.4} speed={0.025} size={0.110} color="#d3b57c" hasRings={true} startAngle={5.1} />
        <Planet radius={4.1} speed={0.018} size={0.085} color="#5278db" startAngle={0.8} />
        <Planet radius={4.7} speed={0.012} size={0.080} color="#2b4ea1" startAngle={2.7} />
      </Canvas>

      <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.1)_50%)] bg-[size:100%_4px] pointer-events-none opacity-[0.2]" />
    </div>
  );
}
