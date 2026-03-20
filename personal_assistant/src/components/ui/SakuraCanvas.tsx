import React, { useEffect, useRef } from 'react'

interface Petal {
  x: number
  y: number
  r: number
  speed: number
  drift: number
  rotation: number
  rotSpeed: number
  opacity: number
  hue: number
}

export default function SakuraCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()

    const petals: Petal[] = Array.from({ length: 35 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: 4 + Math.random() * 7,
      speed: 0.4 + Math.random() * 1.2,
      drift: (Math.random() - 0.5) * 0.6,
      rotation: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.025,
      opacity: 0.25 + Math.random() * 0.45,
      hue: 340 + Math.random() * 30 // pink-red range
    }))

    function drawPetal(p: Petal) {
      if (!ctx) return
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rotation)
      ctx.beginPath()
      ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, Math.PI * 2)
      ctx.fillStyle = `hsla(${p.hue}, 80%, 85%, ${p.opacity})`
      ctx.fill()
      ctx.restore()
    }

    function animate() {
      if (!canvas || !ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      for (const p of petals) {
        p.y += p.speed
        p.x += p.drift + Math.sin(p.y * 0.02) * 0.3
        p.rotation += p.rotSpeed
        if (p.y > canvas.height + 10) {
          p.y = -10
          p.x = Math.random() * canvas.width
        }
        drawPetal(p)
      }
      rafRef.current = requestAnimationFrame(animate)
    }
    animate()

    const handleResize = () => resize()
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        pointerEvents: 'none',
        zIndex: 0,
        opacity: 0.6
      }}
    />
  )
}
