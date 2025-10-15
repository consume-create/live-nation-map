import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { TextureLoader, PlaneGeometry, Box3, Vector3, Sphere } from 'three'
import FlashlightPlane from './FlashlightPlane'

export default function Building({ position, venue, onReady }) {
  const groupRef = useRef()
  const modelSource = venue?.modelUrl || '/models/Live-Nation-20v2y-Warsaw.glb'
  const logoSource = venue?.logoUrl || '/images/warsaw.svg'
  const gltf = useLoader(GLTFLoader, modelSource, (loader) => {
    loader.setCrossOrigin?.('anonymous')
  })
  const logoTexture = useLoader(TextureLoader, logoSource)
  const logoGeometry = useMemo(() => new PlaneGeometry(160, 25.14), [])
  const buildingScene = useMemo(() => {
    if (!gltf?.scene) return null
    const clone = gltf.scene.clone(true)
    clone.scale.set(18, 18, 18)
    return clone
  }, [gltf])

  useEffect(() => {
    if (!buildingScene || typeof onReady !== 'function') return
    buildingScene.updateMatrixWorld(true)
    const bounds = new Box3().setFromObject(buildingScene)
    const center = new Vector3()
    const size = new Vector3()
    const sphere = new Sphere()
    bounds.getCenter(center)
    bounds.getSize(size)
    bounds.getBoundingSphere(sphere)

    onReady({
      center: center.toArray(),
      size: size.toArray(),
      radius: Number.isFinite(sphere.radius) ? sphere.radius : 0,
    })
  }, [buildingScene, onReady])

  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.05
    }
  })

  return (
    <group ref={groupRef} position={position}>
      {buildingScene && <primitive object={buildingScene} />}
      <FlashlightPlane texture={logoTexture} geometry={logoGeometry} scale={[0.5, 0.5, 0.5]} position={[0, 120, 50]} />
    </group>
  )
}
