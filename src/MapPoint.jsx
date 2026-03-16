import { useState, useRef, useMemo, useEffect, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import { MAP_POINT } from './constants/theme'

function easeOutQuart(t) {
  return 1 - (1 - t) ** 4
}

export default function MapPoint({
  position,
  label,
  onClick,
  selected = false,
  onProject,
  onHover,
  staggerIndex = 0,
  revealStartTime = null,
}) {
  const [hovered, setHovered] = useState(false)
  const groupRef = useRef()
  const currentScaleRef = useRef(MAP_POINT.SCALE_IDLE)
  const tempVec = useMemo(() => new THREE.Vector3(), [])
  const { size, camera } = useThree()

  const {
    OUTER_RADIUS,
    MIDDLE_RADIUS,
    INNER_RADIUS,
    HIT_AREA_RADIUS,
    SCALE_IDLE,
    SCALE_ACTIVE,
    Z_OFFSET,
    STAGGER_MS,
    ENTER_DURATION_MS,
  } = MAP_POINT

  const outerRingGeometry = useMemo(() => new THREE.RingGeometry(OUTER_RADIUS - 1.2, OUTER_RADIUS, 64), [OUTER_RADIUS])
  const middleRingGeometry = useMemo(() => new THREE.RingGeometry(MIDDLE_RADIUS - 1.1, MIDDLE_RADIUS, 64), [MIDDLE_RADIUS])
  const coreDiskGeometry = useMemo(() => new THREE.CircleGeometry(INNER_RADIUS, 48), [INNER_RADIUS])
  const hitAreaGeometry = useMemo(() => new THREE.CircleGeometry(HIT_AREA_RADIUS, 48), [HIT_AREA_RADIUS])

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
    if (!groupRef.current) return

    let entranceScale = 0
    if (revealStartTime != null) {
      const now = performance.now()
      const start = revealStartTime + staggerIndex * STAGGER_MS
      const t = now - start
      if (t < 0) {
        entranceScale = 0
      } else if (t < ENTER_DURATION_MS) {
        const progress = t / ENTER_DURATION_MS
        entranceScale = easeOutQuart(progress)
      } else {
        entranceScale = 1
      }
    }

    const pulse = isActive ? 0 : Math.sin(performance.now() * 0.003 + staggerIndex * 0.5) * 0.04
    const targetScale = entranceScale * (isActive ? SCALE_ACTIVE : SCALE_IDLE + pulse)
    currentScaleRef.current = THREE.MathUtils.lerp(
      currentScaleRef.current,
      targetScale,
      0.15
    )
    groupRef.current.scale.setScalar(currentScaleRef.current)
  })

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
    <group rotation={[Math.PI, 0, 0]} position={[position[0], position[1], Z_OFFSET]}>
      <group ref={groupRef}>
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
          onPointerOver={() => { setHovered(true); onHover?.(true) }}
          onPointerOut={() => { setHovered(false); onHover?.(false) }}
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
