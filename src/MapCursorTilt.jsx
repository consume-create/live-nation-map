import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

const MAX_TILT = 0.025 // ~1.4° – keep small so hotspots stay usable
const SMOOTH = 0.03 // lerp per frame – more delay/damper for subtler feel

export default function MapCursorTilt({ children, enabled }) {
  const groupRef = useRef(null)
  const { pointer } = useThree()
  const current = useRef({ x: 0, z: 0 })

  useFrame(() => {
    if (!enabled || !groupRef.current) return

    const targetX = pointer.y * MAX_TILT // cursor down → tilt bottom up
    const targetZ = -pointer.x * MAX_TILT // cursor right → tilt right up

    current.current.x += (targetX - current.current.x) * SMOOTH
    current.current.z += (targetZ - current.current.z) * SMOOTH

    groupRef.current.rotation.x = current.current.x
    groupRef.current.rotation.z = current.current.z
  })

  return (
    <group ref={groupRef} position={[25, 0, 0]} rotation={[0, 0, 0]}>
      {children}
    </group>
  )
}
