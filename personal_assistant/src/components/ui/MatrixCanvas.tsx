import React, { useEffect, useRef } from 'react'

export default function MatrixCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const CHARS = 'ｦｧｨｩｪｫｬｭｮｯｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789ABCDEF'
    const FONT_SIZE = 14
    let cols: number[] = []

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      cols = Array(Math.floor(canvas.width / FONT_SIZE)).fill(1)
    }
    resize()

    function draw() {
      if (!canvas || !ctx) return
      ctx.fillStyle = 'rgba(0, 3, 0, 0.05)'
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${FONT_SIZE}px monospace`
      for (let i = 0; i < cols.length; i++) {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const x = i * FONT_SIZE
        const y = cols[i] * FONT_SIZE

        // Brighter lead character
        ctx.fillStyle = cols[i] * FONT_SIZE < 30 ? '#afffbe' : '#00ff41'
        ctx.fillText(char, x, y)

        if (y > canvas.height && Math.random() > 0.975) {
          cols[i] = 0
        }
        cols[i]++
      }
      rafRef.current = requestAnimationFrame(draw)
    }
    draw()

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
        opacity: 0.35
      }}
    />
  )
}
