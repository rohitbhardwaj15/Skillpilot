import { useRef, useMemo, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

function Particles({ count = 500 }) {
  const mesh = useRef()
  const mouse = useRef({ x: 0, y: 0 })

  const particles = useMemo(() => {
    const temp = []
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 20
      const y = (Math.random() - 0.5) * 20
      const z = (Math.random() - 0.5) * 10
      temp.push({ x, y, z, vx: (Math.random() - 0.5) * 0.01, vy: (Math.random() - 0.5) * 0.01 })
    }
    return temp
  }, [count])

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3)
    particles.forEach((p, i) => {
      pos[i * 3] = p.x
      pos[i * 3 + 1] = p.y
      pos[i * 3 + 2] = p.z
    })
    return pos
  }, [particles, count])

  useEffect(() => {
    const handleMouseMove = (e) => {
      mouse.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  useFrame(() => {
    if (!mesh.current) return
    const posArray = mesh.current.geometry.attributes.position.array

    for (let i = 0; i < count; i++) {
      const i3 = i * 3
      posArray[i3] += particles[i].vx
      posArray[i3 + 1] += particles[i].vy

      // Mouse interaction
      const dx = mouse.current.x * 5 - posArray[i3]
      const dy = mouse.current.y * 5 - posArray[i3 + 1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist < 3) {
        posArray[i3] -= dx * 0.01
        posArray[i3 + 1] -= dy * 0.01
      }

      // Boundary check
      if (Math.abs(posArray[i3]) > 10) particles[i].vx *= -1
      if (Math.abs(posArray[i3 + 1]) > 10) particles[i].vy *= -1
    }

    mesh.current.geometry.attributes.position.needsUpdate = true
    mesh.current.rotation.y += 0.0005
  })

  return (
    <points ref={mesh}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.035}
        color="#D97B0F"
        transparent
        opacity={0.35}
        sizeAttenuation
      />
    </points>
  )
}

function FloatingOrbs() {
  const group = useRef()

  const orbs = useMemo(() => [
    { position: [-4, 2, -3], color: '#D97B0F', scale: 0.8 },
    { position: [3, -2, -2], color: '#0E9C8F', scale: 0.6 },
    { position: [-2, -3, -4], color: '#6D28D9', scale: 0.5 },
    { position: [4, 3, -5], color: '#0E9C8F', scale: 0.7 },
  ], [])

  useFrame((state) => {
    if (!group.current) return
    group.current.children.forEach((child, i) => {
      child.position.y = orbs[i].position[1] + Math.sin(state.clock.elapsedTime * 0.5 + i) * 0.5
      child.rotation.x = state.clock.elapsedTime * 0.2
      child.rotation.y = state.clock.elapsedTime * 0.3
    })
  })

  return (
    <group ref={group}>
      {orbs.map((orb, i) => (
        <mesh key={i} position={orb.position} scale={orb.scale}>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color={orb.color}
            transparent
            opacity={0.08}
            emissive={orb.color}
            emissiveIntensity={0.15}
          />
        </mesh>
      ))}
    </group>
  )
}

export default function ParticleBackground() {
  return (
    <div className="fixed inset-0 -z-10">
      <Canvas
        camera={{ position: [0, 0, 8], fov: 60 }}
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        <Particles count={300} />
        <FloatingOrbs />
      </Canvas>
    </div>
  )
}
