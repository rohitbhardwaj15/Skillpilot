import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Same palette as tailwind.config.js `wave` colors / wave-gradient — kept
// in sync so the 3D mesh reads as the same theme, just with real depth.
const WAVE_PALETTE = ['#1c2b52', '#3d3568', '#6b3f70', '#a9527f', '#d9789f', '#f3c3ca']

function lerpColor(colors, t) {
  const clamped = Math.min(Math.max(t, 0), 1)
  const scaled = clamped * (colors.length - 1)
  const i = Math.floor(scaled)
  const frac = scaled - i
  const c1 = new THREE.Color(colors[i])
  const c2 = new THREE.Color(colors[Math.min(i + 1, colors.length - 1)])
  return c1.clone().lerp(c2, frac)
}

const WIDTH = 24
const DEPTH = 14
const SEG_X = 32
const SEG_Y = 18

function WaveMesh() {
  const meshRef = useRef()

  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(WIDTH, DEPTH, SEG_X, SEG_Y)
    const pos = geo.attributes.position
    const colors = new Float32Array(pos.count * 3)

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      // Diagonal gradient factor, echoing the CSS wave-gradient's 165deg angle.
      const t = (x / WIDTH + 0.5) * 0.5 + (1 - (y / DEPTH + 0.5)) * 0.5
      const color = lerpColor(WAVE_PALETTE, t)
      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    return geo
  }, [])

  useFrame((state) => {
    if (!meshRef.current) return
    const time = state.clock.elapsedTime
    const pos = meshRef.current.geometry.attributes.position

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i)
      const y = pos.getY(i)
      const z =
        Math.sin(x * 0.35 + time * 0.6) * 0.35 +
        Math.sin(y * 0.5 + time * 0.4) * 0.25 +
        Math.sin((x + y) * 0.25 + time * 0.3) * 0.2
      pos.setZ(i, z)
    }

    pos.needsUpdate = true
    meshRef.current.geometry.computeVertexNormals()
  })

  return (
    <mesh ref={meshRef} geometry={geometry} rotation={[-Math.PI / 2.6, 0, 0]} position={[0, -1.4, 0]}>
      <meshStandardMaterial
        vertexColors
        roughness={0.6}
        metalness={0.15}
        transparent
        opacity={0.8}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

// Renders a subtle animated wave-plane using the site's existing wave
// palette. Meant to sit UNDER the existing SVG ribbon lines / CSS gradient
// (see WaveBackground.jsx) — it adds real depth/motion without replacing
// them, so if WebGL is ever unavailable the flat gradient still shows.
export default function Wave3D() {
  return (
    <Canvas
      camera={{ position: [0, 2.2, 7], fov: 50 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <ambientLight intensity={0.7} />
      <pointLight position={[5, 5, 5]} intensity={0.6} color="#f3c3ca" />
      <pointLight position={[-5, 2, -5]} intensity={0.4} color="#3d3568" />
      <WaveMesh />
    </Canvas>
  )
}
