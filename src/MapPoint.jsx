import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'

export default function MapPoint({ position, label, onClick, selected = false, onProject }) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef()
  const tempVec = useMemo(() => new THREE.Vector3(), [])
  const { size, camera } = useThree()

  const outerRadius = 13
  const middleRadius = 8.5
  const innerRadius = 4.5

  const outerRingGeometry = useMemo(() => new THREE.RingGeometry(outerRadius - 1.2, outerRadius, 64), [outerRadius])
  const middleRingGeometry = useMemo(() => new THREE.RingGeometry(middleRadius - 1.1, middleRadius, 64), [middleRadius])
  const coreDiskGeometry = useMemo(() => new THREE.CircleGeometry(innerRadius, 48), [innerRadius])
  const hitAreaGeometry = useMemo(() => new THREE.CircleGeometry(outerRadius + 1.5, 48), [outerRadius])

  useEffect(() => () => {
    outerRingGeometry.dispose()
    middleRingGeometry.dispose()
    coreDiskGeometry.dispose()
    hitAreaGeometry.dispose()
  }, [outerRingGeometry, middleRingGeometry, coreDiskGeometry, hitAreaGeometry])

  const isActive = hovered || selected
  const handleClick = useCallback((event) => {
    if (onClick) onClick(event)
  }, [onClick])

  useFrame(() => {
    if (!selected || !onProject || !groupRef.current) return

    groupRef.current.getWorldPosition(tempVec)
    tempVec.project(camera)

    const screenX = (tempVec.x * 0.5 + 0.5) * size.width
    const screenY = (-tempVec.y * 0.5 + 0.5) * size.height

    onProject({
      x: screenX,
      y: screenY,
      ndc: { x: tempVec.x, y: tempVec.y }
    })
  })

  return (
    <group rotation={[Math.PI, 0, 0]} position={[position[0], position[1], 12.5]}>
      <group ref={groupRef} scale={isActive ? 0.95 : 0.8}>
        <mesh geometry={outerRingGeometry} position={[0, 0, 0]}>
          <meshBasicMaterial
            transparent
            opacity={isActive ? 1 : 0.75}
            color="#ff0000"
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        <mesh geometry={middleRingGeometry} position={[0, 0, 0.25]}>
          <meshBasicMaterial
            transparent
            opacity={isActive ? 1 : 0.8}
            color="#ff0000"
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        <mesh geometry={coreDiskGeometry} position={[0, 0, 0.5]}>
          <meshBasicMaterial
            transparent
            opacity={1.0}
            color={isActive ? '#ff3535' : '#ff1414'}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </mesh>

        <mesh
          geometry={hitAreaGeometry}
          position={[0, 0, 0.6]}
          onPointerOver={() => setHovered(true)}
          onPointerOut={() => setHovered(false)}
          onClick={handleClick}
        >
          <meshBasicMaterial
            transparent
            opacity={0}
            side={THREE.DoubleSide}
            depthWrite={false}
            depthTest={false}
          />
        </mesh>
      </group>
    </group>
  )
}
