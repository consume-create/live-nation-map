import { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Text, Center } from '@react-three/drei'
import * as THREE from 'three'
import { useFlashlightGUI } from './useFlashlightGUI'

export default function ShaderText({
  text = 'Default Text',
  position = [0, 50, 0],
  size = 5,
  configureParams,
  showControls = false,
  textAlign = 'center',
  lineHeight = 1.0
}) {
  const textRef = useRef()
  const materialRef = useRef()

  const params = useMemo(() => {
    const base = {
      colorTop: { r: 255, g: 255, b: 255 },
      colorBottom: { r: 80, g: 80, b: 80 },
      colorMid: { r: 160, g: 160, b: 160 },
      colorLow: { r: 40, g: 40, b: 40 },
      midPosition: 0.45,
      lowPosition: 0.2,
      colorExponent: 1.0,
      flashlightAutoSpeed: 0.3,
      flashlightAutoY: 0.0,
      flashlightRadius: 0.4,
      flashlightFeather: 0.25,
      flashlightIntensity: 1.8,
      flashlightColor: { r: 255, g: 255, b: 255 }
    }

    if (typeof configureParams === 'function') {
      configureParams(base)
    }

    return base
  }, [configureParams])

  useFlashlightGUI(params, showControls)

  useEffect(() => {
    const text = textRef.current
    if (!text) return

    const ensureMaterial = () => {
      const material = text.material
      if (!material) return
      setupFlashlightMaterial(material)
      materialRef.current = material
    }

    if (text.sync) {
      text.sync(ensureMaterial)
    } else {
      ensureMaterial()
    }
  }, [])

  useFrame((state) => {
    let material = materialRef.current
    const text = textRef.current

    if ((!material || !material.userData.flashlightSetup) && text?.material) {
      setupFlashlightMaterial(text.material)
      material = text.material
      materialRef.current = material
    }

    if (!material || !material.uniforms) return

    const uniforms = material.uniforms

    const speed = Math.max(params.flashlightAutoSpeed, 0.0001)
    const cycle = state.clock.elapsedTime * speed
    const phase = cycle - Math.floor(cycle)
    const sweepX = THREE.MathUtils.lerp(-1, 1, phase)
    const holdY = THREE.MathUtils.clamp(params.flashlightAutoY, -1, 1)
    uniforms.uPointerNDC.value.set(sweepX, holdY)

    uniforms.uResolution.value.set(state.gl.domElement.width, state.gl.domElement.height)
    uniforms.uColorTop.value.set(
      params.colorTop.r / 255,
      params.colorTop.g / 255,
      params.colorTop.b / 255
    )
    uniforms.uColorBottom.value.set(
      params.colorBottom.r / 255,
      params.colorBottom.g / 255,
      params.colorBottom.b / 255
    )
    uniforms.uColorMid.value.set(
      params.colorMid.r / 255,
      params.colorMid.g / 255,
      params.colorMid.b / 255
    )
    uniforms.uColorLow.value.set(
      params.colorLow.r / 255,
      params.colorLow.g / 255,
      params.colorLow.b / 255
    )
    uniforms.uColorExponent.value = Math.max(params.colorExponent, 0.0001)
    const clampedMid = THREE.MathUtils.clamp(params.midPosition, 0.05, 0.95)
    const clampedLow = THREE.MathUtils.clamp(params.lowPosition, 0.0, clampedMid - 0.01)
    params.midPosition = clampedMid
    params.lowPosition = clampedLow
    uniforms.uMidPosition.value = clampedMid
    uniforms.uLowPosition.value = clampedLow
    uniforms.uFlashlightRadius.value = params.flashlightRadius
    uniforms.uFlashlightFeather.value = params.flashlightFeather
    uniforms.uFlashlightIntensity.value = params.flashlightIntensity
    uniforms.uFlashlightColor.value.set(
      params.flashlightColor.r / 255,
      params.flashlightColor.g / 255,
      params.flashlightColor.b / 255
    )
  })

  return (
    <Center position={position}>
      <Text
        ref={textRef}
        fontSize={size}
        anchorX="center"
        anchorY="middle"
        lineHeight={lineHeight}
        textAlign={textAlign}
      >
        {text}
      </Text>
    </Center>
  )
}

function setupFlashlightMaterial(material) {
  if (!material || material.userData.flashlightSetup) return

  material.userData.flashlightSetup = true
  material.transparent = true

  const uniforms = material.uniforms
  uniforms.uColorTop = { value: new THREE.Color(1, 1, 1) }
  uniforms.uColorBottom = { value: new THREE.Color(0.3, 0.3, 0.3) }
  uniforms.uColorMid = { value: new THREE.Color(0.6, 0.6, 0.6) }
  uniforms.uColorLow = { value: new THREE.Color(0.15, 0.15, 0.15) }
  uniforms.uColorExponent = { value: 1.0 }
  uniforms.uMidPosition = { value: 0.45 }
  uniforms.uLowPosition = { value: 0.2 }
  uniforms.uResolution = { value: new THREE.Vector2(1, 1) }
  uniforms.uPointerNDC = { value: new THREE.Vector2(0, 0) }
  uniforms.uFlashlightRadius = { value: 0.4 }
  uniforms.uFlashlightFeather = { value: 0.25 }
  uniforms.uFlashlightIntensity = { value: 1.8 }
  uniforms.uFlashlightColor = { value: new THREE.Color(1, 1, 1) }
  uniforms.uAmbientAlpha = { value: 0.3 }

  material.userData.flashlightPatched = false

  material.onBeforeCompile = (shader) => {
    if (!material.userData.flashlightPatched) {
      shader.vertexShader = shader.vertexShader
        .replace(
          'varying vec2 vTroikaGlyphDimensions;',
          'varying vec2 vTroikaGlyphDimensions;\nvarying vec2 vFlashUv;'
        )
        .replace(
          'vTroikaTextureChannel = mod(aTroikaGlyphIndex, 4.0);',
          'vTroikaTextureChannel = mod(aTroikaGlyphIndex, 4.0);\n  vFlashUv = uv;'
        )

      shader.fragmentShader = shader.fragmentShader
        .replace(
          'uniform bool uTroikaSDFDebug;',
        'uniform bool uTroikaSDFDebug;\nuniform vec3 uColorTop;\nuniform vec3 uColorMid;\nuniform vec3 uColorLow;\nuniform vec3 uColorBottom;\nuniform float uColorExponent;\nuniform float uMidPosition;\nuniform float uLowPosition;\nuniform float uAmbientAlpha;\nuniform vec2 uResolution;\nuniform vec2 uPointerNDC;\nuniform float uFlashlightRadius;\nuniform float uFlashlightFeather;\nuniform float uFlashlightIntensity;\nuniform vec3 uFlashlightColor;'
        )
        .replace(
          'varying vec2 vTroikaGlyphDimensions;',
          'varying vec2 vTroikaGlyphDimensions;\nvarying vec2 vFlashUv;'
        )
        .replace(
          'gl_FragColor.a *= edgeAlpha;',
        `gl_FragColor.a *= edgeAlpha;\n  float shadeCoord = pow(clamp(vFlashUv.y, 0.0, 1.0), uColorExponent);\n  float midPos = clamp(uMidPosition, 0.0, 1.0);\n  float lowPos = clamp(uLowPosition, 0.0, midPos - 0.01);\n  vec3 gradientColor;\n  if (shadeCoord < lowPos) {\n    float seg = shadeCoord / max(lowPos, 0.0001);\n    gradientColor = mix(uColorBottom, uColorLow, seg);\n  } else if (shadeCoord < midPos) {\n    float seg = (shadeCoord - lowPos) / max(midPos - lowPos, 0.0001);\n    gradientColor = mix(uColorLow, uColorMid, seg);\n  } else {\n    float seg = (shadeCoord - midPos) / max(1.0 - midPos, 0.0001);\n    gradientColor = mix(uColorMid, uColorTop, seg);\n  }\n  float beamCenter = clamp(uPointerNDC.x * 0.5 + 0.5, 0.0, 1.0);\n  float beamVertical = clamp(uPointerNDC.y * 0.5 + 0.5, 0.0, 1.0);\n  float distX = abs(vFlashUv.x - beamCenter);\n  float distY = abs(vFlashUv.y - beamVertical);\n  float dist = max(distX, distY * 0.1);\n  float radius = max(uFlashlightRadius, 0.0001);\n  float feather = max(uFlashlightFeather, 0.0001);\n  float blend = clamp((dist - radius + feather) / feather, 0.0, 1.0);\n  vec3 spotlight = uFlashlightColor * uFlashlightIntensity;\n  vec3 finalFlash = mix(spotlight, gradientColor, blend);\n  gl_FragColor.rgb = finalFlash;\n  float proximity = clamp(1.0 - blend, 0.0, 1.0);\n  float alphaMix = mix(uAmbientAlpha, 1.0, proximity);\n  gl_FragColor.a *= alphaMix;`
        )

      material.userData.flashlightPatched = true
    }

    shader.uniforms.uColorTop = uniforms.uColorTop
    shader.uniforms.uColorBottom = uniforms.uColorBottom
    shader.uniforms.uColorMid = uniforms.uColorMid
    shader.uniforms.uColorLow = uniforms.uColorLow
    shader.uniforms.uColorExponent = uniforms.uColorExponent
    shader.uniforms.uMidPosition = uniforms.uMidPosition
    shader.uniforms.uLowPosition = uniforms.uLowPosition
    shader.uniforms.uAmbientAlpha = uniforms.uAmbientAlpha
    shader.uniforms.uResolution = uniforms.uResolution
    shader.uniforms.uPointerNDC = uniforms.uPointerNDC
    shader.uniforms.uFlashlightRadius = uniforms.uFlashlightRadius
    shader.uniforms.uFlashlightFeather = uniforms.uFlashlightFeather
    shader.uniforms.uFlashlightIntensity = uniforms.uFlashlightIntensity
    shader.uniforms.uFlashlightColor = uniforms.uFlashlightColor
  }

  material.needsUpdate = true
}
