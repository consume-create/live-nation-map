import { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { TextureLoader, PlaneGeometry } from 'three'
import FlashlightPlane from './FlashlightPlane'

export default function Building({ position, venue }) {
  const groupRef = useRef()
  const modelSource = venue?.modelUrl || '/models/Live-Nation-20v2y-Warsaw.glb'
  const logoSource = venue?.logoUrl || '/images/warsaw.svg'
  const gltf = useLoader(GLTFLoader, modelSource, (loader) => {
    loader.setCrossOrigin?.('anonymous')
  })
  const logoTexture = useLoader(TextureLoader, logoSource)
  const logoGeometry = useMemo(() => new PlaneGeometry(160, 25.14), [])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={position}>
      <primitive object={gltf.scene.clone()} scale={[18, 18, 18]} />
      <FlashlightPlane texture={logoTexture} geometry={logoGeometry} scale={[0.5, 0.5, 0.5]} position={[0, 120, 50]} />
    </group>
  )
}
