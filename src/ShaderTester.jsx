import { Suspense, useEffect, useMemo } from 'react'
import { Canvas, useLoader } from '@react-three/fiber'
import { PerspectiveCamera } from '@react-three/drei'
import { TextureLoader, PlaneGeometry } from 'three'
import FlashlightPlane from './FlashlightPlane'

export default function ShaderTester({ onExit }) {
  const configureFlashlight = useMemo(
    () => (params) => {
      params.radius = 0.63
      params.feather = 0.83
      params.intensity = 3.0
      params.ambient = 0.09
      params.sweepSpeed = 0.18
      params.sweepMin = 0.0
      params.sweepMax = 1.0
      params.sweepY = 0.5
      params.pingPong = true
    },
    []
  )

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        background: '#040404',
        position: 'relative',
        color: '#fff'
      }}
    >
      <button
        onClick={onExit}
        style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          zIndex: 210,
          padding: '10px 18px',
          background: '#4a90e2',
          border: 'none',
          borderRadius: '8px',
          color: '#fff',
          cursor: 'pointer',
          fontWeight: '600'
        }}
      >
        ← Back
      </button>

      <Canvas dpr={[1, 1.5]}>
        <color attach="background" args={[0, 0, 0]} />
        <PerspectiveCamera makeDefault position={[0, 0, 120]} />
        <ambientLight intensity={0.6} />
        <Suspense fallback={null}>
          <FlashlightPlaneScene configureParams={configureFlashlight} showControls />
        </Suspense>
      </Canvas>
    </div>
  )
}

function FlashlightPlaneScene({ configureParams, showControls }) {
  const warsawTexture = useLoader(TextureLoader, '/images/warsaw.svg')
  const logoGeometry = useMemo(() => new PlaneGeometry(160, 25.14), [])

  useEffect(() => {
    return () => {
      logoGeometry.dispose()
    }
  }, [logoGeometry])

  return (
    <FlashlightPlane
      texture={warsawTexture}
      geometry={logoGeometry}
      position={[0, 0, 0]}
      scale={[0.5, 0.5, 0.5]}
      configureParams={configureParams}
      showControls={showControls}
    />
  )
}
