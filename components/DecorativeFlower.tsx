'use client'

interface DecorativeFlowerProps {
  className?: string
  size?: number
  opacity?: number
}

export default function DecorativeFlower({ 
  className = '', 
  size = 200,
  opacity = 0.1 
}: DecorativeFlowerProps) {
  return (
    <svg 
      className={className}
      width={size} 
      height={size} 
      viewBox="0 0 200 200" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ opacity }}
    >
      {/* Line-art flower - elegant and minimal */}
      <path
        d="M100 50C100 50 80 60 80 80C80 100 100 110 100 110C100 110 120 100 120 80C120 60 100 50 100 50Z"
        stroke="#bca37f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M100 150C100 150 80 140 80 120C80 100 100 90 100 90C100 90 120 100 120 120C120 140 100 150 100 150Z"
        stroke="#bca37f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M50 100C50 100 60 80 80 80C100 80 110 100 110 100C110 100 100 120 80 120C60 120 50 100 50 100Z"
        stroke="#bca37f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path
        d="M150 100C150 100 140 80 120 80C100 80 90 100 90 100C90 100 100 120 120 120C140 120 150 100 150 100Z"
        stroke="#bca37f"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      {/* Center circle */}
      <circle
        cx="100"
        cy="100"
        r="15"
        stroke="#bca37f"
        strokeWidth="2"
        fill="none"
      />
      {/* Decorative leaves */}
      <path
        d="M100 30 Q90 40 85 50"
        stroke="#bca37f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M100 30 Q110 40 115 50"
        stroke="#bca37f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M100 170 Q90 160 85 150"
        stroke="#bca37f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M100 170 Q110 160 115 150"
        stroke="#bca37f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M30 100 Q40 90 50 85"
        stroke="#bca37f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M30 100 Q40 110 50 115"
        stroke="#bca37f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M170 100 Q160 90 150 85"
        stroke="#bca37f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M170 100 Q160 110 150 115"
        stroke="#bca37f"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  )
}

