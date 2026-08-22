import { useRef, useEffect } from 'react'

export default function FloatingOrbsCSS() {
  const containerRef = useRef(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const orbs = container.querySelectorAll('.orb')
    let animationId
    let time = 0

    const animate = () => {
      time += 0.01
      orbs.forEach((orb, i) => {
        const speed = 0.5 + i * 0.2
        const x = Math.sin(time * speed + i * 2) * 30
        const y = Math.cos(time * speed * 0.7 + i * 3) * 20
        orb.style.transform = `translate(${x}px, ${y}px)`
      })
      animationId = requestAnimationFrame(animate)
    }

    animate()
    return () => cancelAnimationFrame(animationId)
  }, [])

  const orbColors = [
    'bg-accent-orange/20',
    'bg-accent-teal/20',
    'bg-accent-cyan/20',
    'bg-accent-purple/20',
    'bg-accent-pink/20',
  ]

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden pointer-events-none">
      {orbColors.map((color, i) => (
        <div
          key={i}
          className={`orb absolute rounded-full blur-3xl ${color}`}
          style={{
            width: `${200 + i * 50}px`,
            height: `${200 + i * 50}px`,
            left: `${15 + i * 18}%`,
            top: `${10 + i * 15}%`,
            transition: 'transform 0.1s linear',
          }}
        />
      ))}
    </div>
  )
}
