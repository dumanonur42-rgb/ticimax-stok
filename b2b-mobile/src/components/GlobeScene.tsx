import { useEffect, useRef, type ReactNode } from 'react'
import globeImageUrl from '../assets/globe.png'

const BALLS = 18
const RING_STEPS = 72
const TAU = Math.PI * 2
const TILT = (36 * Math.PI) / 180
const ROLL = (-18 * Math.PI) / 180
const SPIN_DURATION = 9000
const GLOBE_IN_DURATION = 900

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
    const context = canvas?.getContext('2d', { alpha: true })
    if (!canvas || !context) return

    const pixelRatio = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3)
    canvas.width = Math.round(size * pixelRatio)
    canvas.height = Math.round(size * pixelRatio)
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'

    const radius = size * 0.48
    const height = size * 0.096
    const outerRaceWidth = size * 0.032
    const innerRaceWidth = size * 0.046
    const grooveWidth = size * 0.095
    const outerGrooveRadius = radius - outerRaceWidth
    const innerRadius = outerGrooveRadius - grooveWidth - innerRaceWidth
    const innerGrooveRadius = innerRadius + innerRaceWidth
    const pitchRadius = (outerGrooveRadius + innerGrooveRadius) / 2
    const ballRadius = grooveWidth * 0.425
    const globeSize = size * 0.76
    const tiltSin = Math.sin(TILT)
    const tiltCos = Math.cos(TILT)
    const topZ = height / 2
    const bottomZ = -height / 2
    const overlap = 0.5
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

    const traceEllipse = (target: CanvasRenderingContext2D, ringRadius: number, z: number): void => {
      target.ellipse(0, z * tiltCos, ringRadius, ringRadius * tiltSin, 0, 0, TAU)
    }

    const fillAnnulus = (
      target: CanvasRenderingContext2D,
      outerRadius: number,
      innerAnnulusRadius: number,
      z: number,
      fillStyle: string | CanvasGradient
    ): void => {
      target.beginPath()
      traceEllipse(target, outerRadius, z)
      traceEllipse(target, innerAnnulusRadius, z)
      target.fillStyle = fillStyle
      target.fill('evenodd')
    }

    const traceWall = (target: CanvasRenderingContext2D, ringRadius: number): void => {
      target.beginPath()
      for (let index = 0; index <= RING_STEPS; index += 1) {
        const angle = (TAU * index) / RING_STEPS
        const x = ringRadius * Math.cos(angle)
        const y = ringRadius * Math.sin(angle) * tiltSin + topZ * tiltCos
        if (index === 0) target.moveTo(x, y)
        else target.lineTo(x, y)
      }
      for (let index = RING_STEPS; index >= 0; index -= 1) {
        const angle = (TAU * index) / RING_STEPS
        target.lineTo(
          ringRadius * Math.cos(angle),
          ringRadius * Math.sin(angle) * tiltSin + bottomZ * tiltCos
        )
      }
      target.closePath()
    }

    const strokeEllipse = (
      target: CanvasRenderingContext2D,
      ringRadius: number,
      z: number,
      color: string,
      lineWidth: number
    ): void => {
      target.beginPath()
      traceEllipse(target, ringRadius, z)
      target.strokeStyle = color
      target.lineWidth = lineWidth
      target.stroke()
    }

    const clipHalf = (target: CanvasRenderingContext2D, farSide: boolean): void => {
      target.beginPath()
      if (farSide) {
        target.rect(-size * 2, -size * 2, size * 4, size * 2 + overlap)
      } else {
        target.rect(-size * 2, -overlap, size * 4, size * 2 + overlap)
      }
      target.clip()
    }

    const drawRingHalf = (
      target: CanvasRenderingContext2D,
      farSide: boolean,
      includeOuterLip: boolean
    ): void => {
      target.save()
      target.rotate(ROLL)
      clipHalf(target, farSide)

      const topY = topZ * tiltCos - radius * tiltSin
      const bottomY = bottomZ * tiltCos + radius * tiltSin
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

      const wall = target.createLinearGradient(0, bottomZ * tiltCos, 0, topZ * tiltCos)
      wall.addColorStop(0, '#444c55')
      wall.addColorStop(1, '#8a939d')

      fillAnnulus(target, outerGrooveRadius, innerGrooveRadius, bottomZ, '#161b20')
      fillAnnulus(target, radius, outerGrooveRadius, bottomZ, '#424a53')
      fillAnnulus(target, innerGrooveRadius, innerRadius, bottomZ, '#343b43')

      for (const [wallRadius, wallFill] of [
        [radius, wall],
        [outerGrooveRadius, darkMetal],
        [innerGrooveRadius, darkMetal],
        [innerRadius, wall]
      ] as const) {
        traceWall(target, wallRadius)
        target.fillStyle = wallFill
        target.fill()
      }

      const groove = target.createLinearGradient(0, topZ * tiltCos - grooveWidth, 0, topZ * tiltCos + grooveWidth)
      groove.addColorStop(0, '#2a3037')
      groove.addColorStop(0.5, '#1b2026')
      groove.addColorStop(1, '#30363d')
      fillAnnulus(target, outerGrooveRadius, innerGrooveRadius, topZ, groove)
      fillAnnulus(target, innerGrooveRadius, innerRadius, topZ, darkMetal)
      if (includeOuterLip) fillAnnulus(target, radius, outerGrooveRadius, topZ, metal)

      strokeEllipse(target, radius, topZ, 'rgba(255,255,255,.65)', size * 0.003)
      strokeEllipse(target, outerGrooveRadius, topZ, 'rgba(20,25,31,.65)', size * 0.0025)
      strokeEllipse(target, innerGrooveRadius, topZ, 'rgba(236,240,244,.45)', size * 0.002)
      strokeEllipse(target, innerRadius, topZ, 'rgba(20,25,31,.6)', size * 0.0025)
      target.restore()
    }

    const drawBalls = (
      target: CanvasRenderingContext2D,
      farSide: boolean,
      spinAngle: number
    ): void => {
      const balls = Array.from({ length: BALLS }, (_, index) => {
        const angle = (TAU * index) / BALLS + spinAngle
        const depth = Math.sin(angle)
        return {
          x: pitchRadius * Math.cos(angle),
          y: pitchRadius * depth * tiltSin,
          depth,
          farSide: depth <= 0.000001
        }
      }).filter((ball) => ball.farSide === farSide).sort((left, right) => left.y - right.y)

      target.save()
      target.rotate(ROLL)
      for (const ball of balls) {
        const scale = 0.9 + ((ball.depth + 1) / 2) * 0.15
        const drawnSize = spriteSize * scale
        target.drawImage(sprite, ball.x - drawnSize / 2, ball.y - drawnSize / 2, drawnSize, drawnSize)
      }
      target.restore()
    }

    const drawOuterLip = (target: CanvasRenderingContext2D): void => {
      target.save()
      target.rotate(ROLL)
      clipHalf(target, false)

      const topY = topZ * tiltCos - radius * tiltSin
      const bottomY = bottomZ * tiltCos + radius * tiltSin
      const metal = target.createLinearGradient(0, topY, 0, bottomY)
      metal.addColorStop(0, '#f4f6f8')
      metal.addColorStop(0.14, '#b8c0c9')
      metal.addColorStop(0.4, '#6b7580')
      metal.addColorStop(0.58, '#444c55')
      metal.addColorStop(0.8, '#8a939d')
      metal.addColorStop(0.94, '#d5dae0')
      metal.addColorStop(1, '#7d868f')
      fillAnnulus(target, radius, outerGrooveRadius, topZ, metal)
      strokeEllipse(target, radius, topZ, 'rgba(255,255,255,.65)', size * 0.003)
      strokeEllipse(target, outerGrooveRadius, topZ, 'rgba(20,25,31,.65)', size * 0.0025)
      target.restore()
    }

    const renderLayer = (draw: (target: CanvasRenderingContext2D) => void): HTMLCanvasElement | null => {
      const layer = document.createElement('canvas')
      layer.width = canvas.width
      layer.height = canvas.height
      const layerContext = layer.getContext('2d')
      if (!layerContext) return null
      layerContext.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      layerContext.translate(size / 2, size / 2)
      draw(layerContext)
      return layer
    }

    const backRingLayer = renderLayer((target) => drawRingHalf(target, true, true))
    const frontRingLayer = renderLayer((target) => drawRingHalf(target, false, false))
    const frontLipLayer = renderLayer(drawOuterLip)

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

      context.save()
      context.translate(size / 2, size / 2)
      context.scale(0.7 + ease * 0.3, 0.7 + ease * 0.3)
      context.globalAlpha = ease

      if (backRingLayer) context.drawImage(backRingLayer, -size / 2, -size / 2, size, size)
      else drawRingHalf(context, true, true)
      drawBalls(context, true, spinAngle)

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
      else drawRingHalf(context, false, false)
      drawBalls(context, false, spinAngle)
      if (frontLipLayer) context.drawImage(frontLipLayer, -size / 2, -size / 2, size, size)
      else drawOuterLip(context)
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
