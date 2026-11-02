import { useEffect, useRef, type ReactNode } from 'react'
import globeImageUrl from '../assets/globe.png'

const BALLS = 18
const TAU = Math.PI * 2
const TILT = (36 * Math.PI) / 180
const ROLL = (-18 * Math.PI) / 180
const SPIN_DURATION = 9000
const GLOBE_IN_DURATION = 900

type BallPosition = {
  x: number
  y: number
  depth: number
}

type RingMaterials = {
  metal: CanvasGradient
  darkMetal: CanvasGradient
  wall: CanvasGradient
  groove: CanvasGradient
}

let globeImagePromise: Promise<HTMLImageElement> | undefined

function loadGlobeImage(): Promise<HTMLImageElement> {
  if (!globeImagePromise) {
    globeImagePromise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image()
      image.decoding = 'async'
      image.onload = () => resolve(image)
      image.onerror = () => {
        globeImagePromise = undefined
        reject(new Error('Could not load globe image'))
      }
      image.src = globeImageUrl
      if (image.complete && image.naturalWidth > 0) resolve(image)
    })
  }
  return globeImagePromise
}

export function GlobeScene({ size = 220, className = '' }: { size?: number; className?: string }): ReactNode {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d', { alpha: true, willReadFrequently: true })
    if (!canvas || !context) return

    const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3)
    canvas.width = Math.round(size * pixelRatio)
    canvas.height = Math.round(size * pixelRatio)
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    const radius = size * 0.48
    const height = size * 0.096
    const outerRaceWidth = size * 0.03
    const innerRaceWidth = size * 0.035
    const grooveWidth = size * 0.085
    const outerGrooveRadius = radius - outerRaceWidth
    const innerRadius = outerGrooveRadius - grooveWidth - innerRaceWidth
    const innerGrooveRadius = innerRadius + innerRaceWidth
    const pitchRadius = (outerGrooveRadius + innerGrooveRadius) / 2
    const ballRadius = grooveWidth * 0.425
    const globeSize = (innerRadius - size * 0.012) * 2
    const tiltSin = Math.sin(TILT)
    const tiltCos = Math.cos(TILT)
    const topZ = height / 2
    const bottomZ = -height / 2
    const halfOverlap = 0.75 / radius
    const spritePadding = size * 0.02
    const spriteSize = ballRadius * 2 + spritePadding * 2
    const sprite = document.createElement('canvas')
    sprite.width = Math.ceil(spriteSize * pixelRatio)
    sprite.height = Math.ceil(spriteSize * pixelRatio)
    const spriteContext = sprite.getContext('2d')
    if (!spriteContext) return

    spriteContext.scale(pixelRatio, pixelRatio)
    spriteContext.shadowColor = 'rgba(0, 0, 0, .5)'
    spriteContext.shadowBlur = size * 0.01
    spriteContext.shadowOffsetY = size * 0.005
    const spriteCenter = spriteSize / 2
    const highlight = spriteContext.createRadialGradient(
      spriteCenter - ballRadius * 0.3,
      spriteCenter - ballRadius * 0.35,
      ballRadius * 0.05,
      spriteCenter,
      spriteCenter,
      ballRadius * 1.35
    )
    highlight.addColorStop(0, '#fff')
    highlight.addColorStop(0.12, '#f1f3f5')
    highlight.addColorStop(0.38, '#bcc4cc')
    highlight.addColorStop(0.64, '#737d88')
    highlight.addColorStop(0.84, '#3f474f')
    highlight.addColorStop(1, '#6f7882')
    spriteContext.beginPath()
    spriteContext.arc(spriteCenter, spriteCenter, ballRadius, 0, TAU)
    spriteContext.fillStyle = highlight
    spriteContext.fill()

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    let globeImage: HTMLImageElement | undefined
    let globeLayer: HTMLCanvasElement | null = null
    let animationFrame = 0
    let visibleSince: number | null = null
    let elapsedBeforePause = 0
    let disposed = false

    const createAnnularSector = (
      outerRadius: number,
      innerRadius: number,
      z: number,
      startAngle: number,
      endAngle: number
    ): Path2D => {
      const path = new Path2D()
      const centerY = -z * tiltCos
      path.ellipse(0, centerY, outerRadius, outerRadius * tiltSin, 0, startAngle, endAngle)
      path.lineTo(innerRadius * Math.cos(endAngle), centerY + innerRadius * Math.sin(endAngle) * tiltSin)
      path.ellipse(0, centerY, innerRadius, innerRadius * tiltSin, 0, endAngle, startAngle, true)
      path.closePath()
      return path
    }

    const createBand = (ringRadius: number, startAngle: number, endAngle: number): Path2D => {
      const path = new Path2D()
      path.ellipse(0, -topZ * tiltCos, ringRadius, ringRadius * tiltSin, 0, startAngle, endAngle)
      path.ellipse(0, -bottomZ * tiltCos, ringRadius, ringRadius * tiltSin, 0, endAngle, startAngle, true)
      path.closePath()
      return path
    }

    const createArcPath = (
      ringRadius: number,
      z: number,
      startAngle: number,
      endAngle: number
    ): Path2D => {
      const path = new Path2D()
      path.ellipse(0, -z * tiltCos, ringRadius, ringRadius * tiltSin, 0, startAngle, endAngle)
      return path
    }

    const createRingMaterials = (target: CanvasRenderingContext2D): RingMaterials => {
      const topY = -topZ * tiltCos - radius * tiltSin
      const bottomY = -bottomZ * tiltCos + radius * tiltSin
      const metal = target.createLinearGradient(0, topY, 0, bottomY)
      metal.addColorStop(0, '#f4f6f8')
      metal.addColorStop(0.14, '#b8c0c9')
      metal.addColorStop(0.4, '#6b7580')
      metal.addColorStop(0.58, '#444c55')
      metal.addColorStop(0.8, '#8a939d')
      metal.addColorStop(0.94, '#d5dae0')
      metal.addColorStop(1, '#7d868f')
      const darkMetal = target.createLinearGradient(0, topY, 0, bottomY)
      darkMetal.addColorStop(0, '#59616b')
      darkMetal.addColorStop(0.5, '#252b32')
      darkMetal.addColorStop(1, '#737c86')
      const wall = target.createLinearGradient(0, -bottomZ * tiltCos, 0, -topZ * tiltCos)
      wall.addColorStop(0, '#444c55')
      wall.addColorStop(1, '#8a939d')
      const groove = target.createLinearGradient(0, -topZ * tiltCos - grooveWidth, 0, -topZ * tiltCos + grooveWidth)
      groove.addColorStop(0, '#2a3037')
      groove.addColorStop(0.5, '#1b2026')
      groove.addColorStop(1, '#30363d')
      return { metal, darkMetal, wall, groove }
    }

    const drawHalf = (target: CanvasRenderingContext2D, back: boolean, materials: RingMaterials): void => {
      const start = (back ? Math.PI : 0) - halfOverlap
      const end = (back ? TAU : Math.PI) + halfOverlap
      const face = (outer: number, inner: number, z: number, fill: string | CanvasGradient): void => {
        target.fillStyle = fill
        target.fill(createAnnularSector(outer, inner, z, start, end))
      }
      const edge = (ringRadius: number, width: number, color: string): void => {
        target.lineWidth = width
        target.strokeStyle = color
        target.stroke(createArcPath(ringRadius, topZ, start, end))
      }
      face(outerGrooveRadius, innerGrooveRadius, bottomZ, '#161b20')
      face(radius, outerGrooveRadius, bottomZ, '#424a53')
      face(innerGrooveRadius, innerRadius, bottomZ, '#343b43')
      const walls = back
        ? [innerGrooveRadius, radius, outerGrooveRadius, innerRadius]
        : [outerGrooveRadius, innerRadius, innerGrooveRadius, radius]
      for (const wallRadius of walls) {
        target.fillStyle = wallRadius === radius || wallRadius === innerRadius ? materials.wall : materials.darkMetal
        target.fill(createBand(wallRadius, start, end))
      }
      face(outerGrooveRadius, innerGrooveRadius, topZ, materials.groove)
      face(innerGrooveRadius, innerRadius, topZ, materials.darkMetal)
      face(radius, outerGrooveRadius, topZ, materials.metal)
      target.lineCap = 'butt'
      edge(radius, size * 0.003, 'rgba(255,255,255,.65)')
      edge(outerGrooveRadius, size * 0.0025, 'rgba(20,25,31,.65)')
      edge(innerGrooveRadius, size * 0.002, 'rgba(236,240,244,.45)')
      edge(innerRadius, size * 0.0025, 'rgba(20,25,31,.6)')
    }

    const renderRingLayer = (back: boolean): HTMLCanvasElement | null => {
      const layer = document.createElement('canvas')
      layer.width = canvas.width
      layer.height = canvas.height
      const target = layer.getContext('2d')
      if (!target) return null
      target.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      target.translate(size / 2, size / 2)
      target.rotate(ROLL)
      drawHalf(target, back, createRingMaterials(target))
      return layer
    }

    const backRingLayer = renderRingLayer(true)
    const frontRingLayer = renderRingLayer(false)

    const drawBall = (target: CanvasRenderingContext2D, ball: BallPosition): void => {
      const scale = 0.9 + ((ball.depth + 1) / 2) * 0.15
      const drawnSize = spriteSize * scale
      target.drawImage(sprite, ball.x - drawnSize / 2, ball.y - drawnSize / 2, drawnSize, drawnSize)
    }

    const ballsByDepth = (spinAngle: number): { back: BallPosition[]; front: BallPosition[] } => {
      const balls = Array.from({ length: BALLS }, (_, index): BallPosition => {
        const angle = ((TAU * index) / BALLS + spinAngle) % TAU
        return {
          x: pitchRadius * Math.cos(angle),
          y: pitchRadius * Math.sin(angle) * tiltSin - topZ * tiltCos,
          depth: Math.sin(angle)
        }
      })
      const hiddenByGlobe = (ball: BallPosition): boolean => ball.depth < 0 && Math.hypot(ball.x, ball.y) < globeSize / 2 + ballRadius
      const byDepth = (left: BallPosition, right: BallPosition): number => left.depth - right.depth
      return { back: balls.filter(hiddenByGlobe).sort(byDepth), front: balls.filter((ball) => !hiddenByGlobe(ball)).sort(byDepth) }
    }

    const renderGlobeLayer = (image: HTMLImageElement): HTMLCanvasElement | null => {
      const padding = size * 0.15
      const layerSize = globeSize + padding * 2
      const layer = document.createElement('canvas')
      layer.width = Math.ceil(layerSize * pixelRatio)
      layer.height = Math.ceil(layerSize * pixelRatio)
      const layerContext = layer.getContext('2d')
      if (!layerContext) return null
      layerContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      layerContext.shadowColor = 'rgba(0,0,0,.4)'
      layerContext.shadowBlur = size * 0.035
      layerContext.shadowOffsetY = size * 0.04
      layerContext.drawImage(image, padding, padding, globeSize, globeSize)
      return layer
    }

    const drawFrame = (elapsed: number, staticFrame: boolean): void => {
      if (!globeImage || disposed) return

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      context.clearRect(0, 0, size, size)

      const progress = staticFrame ? 1 : Math.min(elapsed / GLOBE_IN_DURATION, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      const spinAngle = staticFrame ? 0 : ((elapsed % SPIN_DURATION) / SPIN_DURATION) * TAU
      const balls = ballsByDepth(spinAngle)

      context.save()
      context.translate(size / 2, size / 2)
      context.scale(0.7 + ease * 0.3, 0.7 + ease * 0.3)
      context.globalAlpha = ease

      if (backRingLayer) context.drawImage(backRingLayer, -size / 2, -size / 2, size, size)
      context.save()
      context.rotate(ROLL)
      for (const ball of balls.back) drawBall(context, ball)
      context.restore()

      if (globeLayer) {
        const layerSize = globeLayer.width / pixelRatio
        context.drawImage(globeLayer, -layerSize / 2, -layerSize / 2, layerSize, layerSize)
      } else {
        context.save()
        context.shadowColor = 'rgba(0,0,0,.4)'
        context.shadowBlur = size * 0.035
        context.shadowOffsetY = size * 0.04
        context.drawImage(globeImage, -globeSize / 2, -globeSize / 2, globeSize, globeSize)
        context.restore()
      }

      if (frontRingLayer) context.drawImage(frontRingLayer, -size / 2, -size / 2, size, size)
      context.save()
      context.rotate(ROLL)
      for (const ball of balls.front) drawBall(context, ball)
      context.restore()
      context.restore()
    }

    const renderFrame = (timestamp: number): void => {
      animationFrame = 0
      if (disposed || !globeImage || document.hidden || reducedMotion.matches) return
      if (visibleSince === null) visibleSince = timestamp
      const elapsed = elapsedBeforePause + timestamp - visibleSince
      drawFrame(elapsed, false)
      animationFrame = window.requestAnimationFrame(renderFrame)
    }

    const stopAnimation = (): void => {
      if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame)
      animationFrame = 0
      if (visibleSince !== null) {
        elapsedBeforePause += performance.now() - visibleSince
        visibleSince = null
      }
    }

    const startAnimation = (): void => {
      if (disposed || !globeImage || document.hidden) return
      if (reducedMotion.matches) {
        drawFrame(0, true)
        return
      }
      if (animationFrame === 0) animationFrame = window.requestAnimationFrame(renderFrame)
    }

    const handleVisibilityChange = (): void => {
      if (document.hidden) stopAnimation()
      else startAnimation()
    }

    const handleMotionChange = (): void => {
      stopAnimation()
      elapsedBeforePause = 0
      if (reducedMotion.matches) drawFrame(0, true)
      else startAnimation()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    reducedMotion.addEventListener('change', handleMotionChange)
    void loadGlobeImage().then((image) => {
      if (disposed) return
      globeImage = image
      globeLayer = renderGlobeLayer(image)
      startAnimation()
    }).catch(() => undefined)

    return () => {
      disposed = true
      stopAnimation()
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      reducedMotion.removeEventListener('change', handleMotionChange)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      className={`globe-scene ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    />
  )
}
