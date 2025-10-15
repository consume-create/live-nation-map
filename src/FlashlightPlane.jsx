import { useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { PlaneGeometry, Vector2, MathUtils } from 'three'
import { useFlashlightPlaneGUI } from './useFlashlightPlaneGUI'

export default function FlashlightPlane({
  texture,
  geometry,
  width = 579,
  height = 91,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  configureParams,
  showControls = false
}) {
  const generatedGeometry = useMemo(() => {
    if (geometry) return null
    return new PlaneGeometry(width, height)
  }, [geometry, height, width])

  useEffect(() => {
    if (!generatedGeometry) return
    return () => generatedGeometry.dispose()
  }, [generatedGeometry])

  const planeGeometry = geometry ?? generatedGeometry

  const params = useMemo(() => {
    const base = {
      radius: 0.63,
      feather: 0.83,
      intensity: 3.0,
      ambient: 0.09,
      sweepSpeed: 0.18,
      sweepMin: 0.0,
      sweepMax: 1.0,
      sweepY: 0.5,
      pingPong: true
    }

    if (typeof configureParams === 'function') {
      configureParams(base)
    }

    return base
  }, [configureParams])

  useFlashlightPlaneGUI(params, showControls)

  const uniforms = useMemo(
    () => ({
      uMap: { value: texture },
      uPointer: { value: new Vector2(0.5, 0.5) },
      uRadius: { value: params.radius },
      uFeather: { value: params.feather },
      uIntensity: { value: params.intensity },
      uAmbient: { value: params.ambient },
      uTime: { value: 0 }
    }),
    [params.ambient, params.feather, params.intensity, params.radius, texture]
  )

  useFrame((state) => {
    if (!planeGeometry) return
    const elapsed = state.clock.elapsedTime

    uniforms.uTime.value = elapsed

    const speed = Math.max(params.sweepSpeed, 0.0001)
    const phaseTime = elapsed * speed

    const sweepPhase = params.pingPong
      ? 0.5 * (Math.sin(phaseTime * Math.PI * 2.0) + 1.0)
      : phaseTime - Math.floor(phaseTime)

    const minX = MathUtils.clamp(Math.min(params.sweepMin, params.sweepMax), 0, 1)
    const maxX = MathUtils.clamp(Math.max(params.sweepMin, params.sweepMax), 0, 1)
    const pointerX = MathUtils.lerp(minX, maxX, sweepPhase)
    const pointerY = MathUtils.clamp(params.sweepY, 0, 1)

    uniforms.uPointer.value.set(pointerX, pointerY)
    uniforms.uRadius.value = Math.max(params.radius, 0.0001)
    uniforms.uFeather.value = Math.max(params.feather, 0.0001)
    uniforms.uIntensity.value = Math.max(params.intensity, 0.0)
    uniforms.uAmbient.value = MathUtils.clamp(params.ambient, 0.0, 1.0)
  })

  if (!planeGeometry) return null

  return (
    <mesh position={position} geometry={planeGeometry} scale={scale}>
      <shaderMaterial
        uniforms={uniforms}
        transparent
        depthWrite={false}
        vertexShader={`varying vec2 vUv;\nvoid main(){\n vUv = uv;\n gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);\n}`}
        fragmentShader={`uniform sampler2D uMap;\nuniform vec2 uPointer;\nuniform float uRadius;\nuniform float uFeather;\nuniform float uIntensity;\nuniform float uAmbient;\nvarying vec2 vUv;\nvoid main(){\n vec4 tex = texture2D(uMap, vUv);\n float dist = distance(vUv, uPointer);\n float blend = clamp((dist - uRadius + uFeather) / max(uFeather, 1e-4), 0.0, 1.0);\n vec3 lit = tex.rgb * uIntensity;\n vec3 color = mix(lit, tex.rgb, blend);\n float alpha = tex.a * mix(1.0, uAmbient, blend);\n gl_FragColor = vec4(color, alpha);\n}`}
      />
    </mesh>
  )
}
