import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Text, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

function Node({ position, color, label, completed, status, onClick, isActive }) {
  const meshRef = useRef()
  const ringRef = useRef()

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.5
      const scale = isActive ? 1.2 + Math.sin(state.clock.elapsedTime * 2) * 0.1 : 1
      meshRef.current.scale.setScalar(scale)
    }
    if (ringRef.current) {
      ringRef.current.rotation.z = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <group position={position} onClick={onClick}>
      {/* Outer ring */}
      <mesh ref={ringRef}>
        <torusGeometry args={[0.6, 0.02, 16, 100]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={0.4}
          emissive={color}
          emissiveIntensity={0.5}
        />
      </mesh>

      {/* Core sphere */}
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.35, 1]} />
        <meshStandardMaterial
          color={completed ? '#0E9C8F' : color}
          emissive={completed ? '#0E9C8F' : color}
          emissiveIntensity={0.6}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      {/* Glow effect */}
      <mesh scale={1.5}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Label */}
      <Text
        position={[0, -0.9, 0]}
        fontSize={0.2}
        color="#F3F4F8"
        anchorX="center"
        anchorY="middle"
        maxWidth={3}
      >
        {label}
      </Text>
    </group>
  )
}

function Connection({ start, end, color, animated = false }) {
  const lineRef = useRef()

  const points = useMemo(() => {
    return [new THREE.Vector3(...start), new THREE.Vector3(...end)]
  }, [start, end])

  useFrame((state) => {
    if (lineRef.current && animated) {
      const material = lineRef.current.material
      material.dashOffset = -state.clock.elapsedTime * 2
    }
  })

  return (
    <line ref={lineRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={2}
          array={new Float32Array([...start, ...end])}
          itemSize={3}
        />
      </bufferGeometry>
      <lineDashedMaterial
        color={color}
        linewidth={1}
        dashSize={0.2}
        gapSize={0.1}
        transparent
        opacity={0.5}
      />
    </line>
  )
}

function SkillTreeScene({ nodes, connections, onNodeClick, activeNode }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.3} color="#D97B0F" />

      {connections.map((conn, i) => (
        <Connection
          key={`conn-${i}`}
          start={conn.start}
          end={conn.end}
          color={conn.color}
          animated={conn.animated}
        />
      ))}

      {nodes.map((node, i) => (
        <Node
          key={`node-${i}`}
          position={node.position}
          color={node.color}
          label={node.label}
          completed={node.completed}
          status={node.status}
          isActive={activeNode === node.id}
          onClick={() => onNodeClick?.(node)}
        />
      ))}

      <OrbitControls
        enableZoom={true}
        enablePan={true}
        enableRotate={true}
        autoRotate
        autoRotateSpeed={0.5}
        maxDistance={15}
        minDistance={5}
      />
    </>
  )
}

export default function SkillTree3D({ nodes, connections, onNodeClick, activeNode }) {
  return (
    <div className="w-full h-[600px] rounded-2xl overflow-hidden border border-border bg-surface-alt/40">
      <Canvas
        camera={{ position: [0, 0, 10], fov: 50 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <SkillTreeScene
          nodes={nodes}
          connections={connections}
          onNodeClick={onNodeClick}
          activeNode={activeNode}
        />
      </Canvas>
    </div>
  )
}
