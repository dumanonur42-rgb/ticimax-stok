import { useEffect, useRef, type ReactNode } from 'react'
import globeImageUrl from '../assets/globe.png'

const BALLS = 18
const RING_SEGMENTS = 360
const TAU = Math.PI * 2
const TILT = (36 * Math.PI) / 180
const ROLL = (-18 * Math.PI) / 180
const SPIN_DURATION = 9000
const GLOBE_IN_DURATION = 900

type RingSegment = {
  index: number
  startAngle: number
  endAngle: number
  depth: number
  farSide: boolean
  paths: {
    bottomGroove: Path2D
    bottomOuter: Path2D
    bottomInner: Path2D
    outerWall: Path2D
    outerGrooveWall: Path2D
    innerGrooveWall: Path2D
    innerWall: Path2D
    topGroove: Path2D
    topInner: Path2D
    topOuter: Path2D
    outerArc: Path2D
    outerGrooveArc: Path2D
    innerGrooveArc: Path2D
    innerArc: Path2D
  }
}

type BallPosition = {
  x: number
  y: number
  depth: number
  segmentIndex: number
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
    const segmentStep = TAU / RING_SEGMENTS
    const segmentOverlap = Math.min(segmentStep * 0.3, 0.75 / radius)
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
      const centerY = z * tiltCos
      path.ellipse(0, centerY, outerRadius, outerRadius * tiltSin, 0, startAngle, endAngle)
      path.lineTo(innerRadius * Math.cos(endAngle), centerY + innerRadius * Math.sin(endAngle) * tiltSin)
      path.ellipse(0, centerY, innerRadius, innerRadius * tiltSin, 0, endAngle, startAngle, true)
      path.closePath()
      return path
    }

    const createWallSection = (
      ringRadius: number,
      startAngle: number,
      endAngle: number,
      zTop: number,
      zBottom: number
    ): Path2D => {
      const pointAt = (angle: number, z: number): [number, number] => [
        ringRadius * Math.cos(angle),
        ringRadius * Math.sin(angle) * tiltSin + z * tiltCos
      ]
      const topStart = pointAt(startAngle, zTop)
      const topEnd = pointAt(endAngle, zTop)
      const bottomEnd = pointAt(endAngle, zBottom)
      const bottomStart = pointAt(startAngle, zBottom)
      const path = new Path2D()
      path.moveTo(...topStart)
      path.lineTo(...topEnd)
      path.lineTo(...bottomEnd)
      path.lineTo(...bottomStart)
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
      path.ellipse(0, z * tiltCos, ringRadius, ringRadius * tiltSin, 0, startAngle, endAngle)
      return path
    }

    const segmentAngles = (index: number): [number, number] => {
      const startAngle = segmentStep * index
      const endAngle = startAngle + segmentStep
      return [startAngle - segmentOverlap, endAngle + segmentOverlap]
    }

    const ringSegments: RingSegment[] = Array.from({ length: RING_SEGMENTS }, (_, index) => {
      const startAngle = segmentStep * index
      const endAngle = startAngle + segmentStep
      const [drawStart, drawEnd] = segmentAngles(index)
      const depth = Math.sin((startAngle + endAngle) / 2)
      return {
        index,
        startAngle,
        endAngle,
        depth,
        farSide: depth < 0,
        paths: {
          bottomGroove: createAnnularSector(outerGrooveRadius, innerGrooveRadius, bottomZ, drawStart, drawEnd),
          bottomOuter: createAnnularSector(radius, outerGrooveRadius, bottomZ, drawStart, drawEnd),
          bottomInner: createAnnularSector(innerGrooveRadius, innerRadius, bottomZ, drawStart, drawEnd),
          outerWall: createWallSection(radius, drawStart, drawEnd, topZ, bottomZ),
          outerGrooveWall: createWallSection(outerGrooveRadius, drawStart, drawEnd, topZ, bottomZ),
          innerGrooveWall: createWallSection(innerGrooveRadius, drawStart, drawEnd, topZ, bottomZ),
          innerWall: createWallSection(innerRadius, drawStart, drawEnd, topZ, bottomZ),
          topGroove: createAnnularSector(outerGrooveRadius, innerGrooveRadius, topZ, drawStart, drawEnd),
          topInner: createAnnularSector(innerGrooveRadius, innerRadius, topZ, drawStart, drawEnd),
          topOuter: createAnnularSector(radius, outerGrooveRadius, topZ, drawStart, drawEnd),
          outerArc: createArcPath(radius, topZ, startAngle, endAngle),
          outerGrooveArc: createArcPath(outerGrooveRadius, topZ, startAngle, endAngle),
          innerGrooveArc: createArcPath(innerGrooveRadius, topZ, startAngle, endAngle),
          innerArc: createArcPath(innerRadius, topZ, startAngle, endAngle)
        }
      }
    })
    const backSegments = ringSegments.filter((segment) => segment.farSide).sort((left, right) => left.depth - right.depth)
    const frontSegments = ringSegments.filter((segment) => !segment.farSide).sort((left, right) => left.depth - right.depth)

    const createRingMaterials = (target: CanvasRenderingContext2D): RingMaterials => {
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
      const groove = target.createLinearGradient(0, topZ * tiltCos - grooveWidth, 0, topZ * tiltCos + grooveWidth)
      groove.addColorStop(0, '#2a3037')
      groove.addColorStop(0.5, '#1b2026')
      groove.addColorStop(1, '#30363d')
      return { metal, darkMetal, wall, groove }
    }

    const drawOuterLipSegment = (
      target: CanvasRenderingContext2D,
      segment: RingSegment,
      materials: RingMaterials
    ): void => {
      target.fillStyle = materials.metal
      target.fill(segment.paths.topOuter)
      target.lineCap = 'round'
      target.lineWidth = size * 0.003
      target.strokeStyle = 'rgba(255,255,255,.65)'
      target.stroke(segment.paths.outerArc)
      target.lineWidth = size * 0.0025
      target.strokeStyle = 'rgba(20,25,31,.65)'
      target.stroke(segment.paths.outerGrooveArc)
    }

    const drawRingSegment = (
      target: CanvasRenderingContext2D,
      segment: RingSegment,
      includeOuterLip: boolean,
      materials: RingMaterials
    ): void => {
      const drawBottomFaces = (): void => {
      target.fillStyle = '#161b20'
      target.fill(segment.paths.bottomGroove)
      target.fillStyle = '#424a53'
      target.fill(segment.paths.bottomOuter)
      target.fillStyle = '#343b43'
      target.fill(segment.paths.bottomInner)
      }

      const drawWalls = (): void => {
      target.fillStyle = materials.wall
      target.fill(segment.paths.outerWall)
      target.fill(segment.paths.innerWall)
      target.fillStyle = materials.darkMetal
      target.fill(segment.paths.outerGrooveWall)
      target.fill(segment.paths.innerGrooveWall)
      }

      const drawTopFaces = (): void => {
      target.fillStyle = materials.groove
      target.fill(segment.paths.topGroove)
      target.fillStyle = materials.darkMetal
      target.fill(segment.paths.topInner)
      if (includeOuterLip) drawOuterLipSegment(target, segment, materials)
      target.lineCap = 'round'
      target.lineWidth = size * 0.002
      target.strokeStyle = 'rgba(236,240,244,.45)'
      target.stroke(segment.paths.innerGrooveArc)
      target.lineWidth = size * 0.0025
      target.strokeStyle = 'rgba(20,25,31,.6)'
      target.stroke(segment.paths.innerArc)
      }

      drawBottomFaces()
      drawWalls()
      drawTopFaces()
    }

    const renderRingLayer = (
      segments: RingSegment[],
      includeOuterLip: boolean,
      outerLipOnly = false
    ): HTMLCanvasElement | null => {
      const layer = document.createElement('canvas')
      layer.width = canvas.width
      layer.height = canvas.height
      const target = layer.getContext('2d')
      if (!target) return null

      target.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      target.translate(size / 2, size / 2)
      target.rotate(ROLL)
      const materials = createRingMaterials(target)
      for (const segment of segments) {
        if (outerLipOnly) drawOuterLipSegment(target, segment, materials)
        else drawRingSegment(target, segment, includeOuterLip, materials)
      }
      return layer
    }

    const backRingLayer = renderRingLayer(backSegments, true)
    const frontRingLayer = renderRingLayer(frontSegments, false)
    const frontLipLayer = renderRingLayer(frontSegments, false, true)

    const drawBall = (target: CanvasRenderingContext2D, ball: BallPosition): void => {
      const scale = 0.9 + ((ball.depth + 1) / 2) * 0.15
      const drawnSize = spriteSize * scale
      target.drawImage(sprite, ball.x - drawnSize / 2, ball.y - drawnSize / 2, drawnSize, drawnSize)
    }

    const ballsByDepth = (spinAngle: number): { back: BallPosition[]; front: BallPosition[] } => {
      const balls = Array.from({ length: BALLS }, (_, index): BallPosition => {
        const angle = ((TAU * index) / BALLS + spinAngle) % TAU
        const segmentIndex = Math.min(RING_SEGMENTS - 1, Math.floor(angle / segmentStep))
        return {
          x: pitchRadius * Math.cos(angle),
          y: pitchRadius * Math.sin(angle) * tiltSin,
          depth: Math.sin(angle),
          segmentIndex
        }
      })
      const back = balls.filter((ball) => ringSegments[ball.segmentIndex].farSide).sort((left, right) => left.depth - right.depth)
      const front = balls.filter((ball) => !ringSegments[ball.segmentIndex].farSide).sort((left, right) => left.depth - right.depth)
      return { back, front }
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
      if (frontLipLayer) context.drawImage(frontLipLayer, -size / 2, -size / 2, size, size)
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
