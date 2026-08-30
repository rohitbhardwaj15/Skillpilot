// Recreates the flowing "wave ribbon" motif from the abstract-wave landing
// page template as a lightweight, dependency-free SVG (no three.js needed).
export default function WaveBackground() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden wave-hero-bg">
      <svg
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 1440 900"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="waveLine1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="waveLine2" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
            <stop offset="55%" stopColor="#ffffff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Layered ribbon strokes sweeping across the hero, echoing the template */}
        {Array.from({ length: 14 }).map((_, i) => {
          const offset = i * 5
          const yShift = i * 3
          return (
            <path
              key={i}
              d={`M -100 ${520 - offset + yShift}
                  C 300 ${380 - offset}, 520 ${620 - offset}, 820 ${300 - offset}
                  S 1300 ${520 - offset}, 1600 ${260 - offset}`}
              fill="none"
              stroke={i % 2 === 0 ? 'url(#waveLine1)' : 'url(#waveLine2)'}
              strokeWidth={i === 6 ? 2 : 1}
              opacity={0.9 - i * 0.045}
            />
          )
        })}
      </svg>

      {/* Soft glow accents for depth, matching the pink/purple tones */}
      <div className="absolute top-1/3 right-[-10%] w-[45vw] h-[45vw] rounded-full bg-wave-pink/20 blur-3xl" />
      <div className="absolute bottom-[-15%] left-[-5%] w-[35vw] h-[35vw] rounded-full bg-wave-plum/25 blur-3xl" />
    </div>
  )
}
