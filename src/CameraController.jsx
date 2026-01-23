import { useRef, useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export default function CameraController({ targetPosition, onComplete }) {
  const { camera, controls } = useThree()
  const targetRef = useRef(null)
  const isAnimating = useRef(false)
  const startPosition = useRef(new THREE.Vector3())
  const startTarget = useRef(new THREE.Vector3())
  const startOffset = useRef(new THREE.Vector3())
  const endOffset = useRef(new THREE.Vector3())
  const progress = useRef(0)

  useEffect(() => {
    if (targetPosition) {
      // Start animation
      isAnimating.current = true
      progress.current = 0
      startPosition.current.copy(camera.position)
      if (controls) {
        startTarget.current.copy(controls.target)
      } else {
        startTarget.current.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(50))
      }

      // Calculate the starting offset (current camera offset from its target)
      // Use clone() to avoid mutation
      const baseOffset = startPosition.current.clone().sub(startTarget.current)
      startOffset.current.copy(baseOffset)

      // Calculate END offset (where camera should be relative to final target)
      const manualOffset = getVectorFromTarget(targetPosition.offset)
      if (manualOffset) {
        endOffset.current.copy(manualOffset)
      } else if (typeof targetPosition.zoomFactor === 'number') {
        // Clone baseOffset before scaling to avoid mutation
        endOffset.current.copy(baseOffset.clone().multiplyScalar(targetPosition.zoomFactor))
      } else {
        endOffset.current.copy(baseOffset)
      }

      if (targetPosition.position) {
        const explicitPosition = getVectorFromTarget(targetPosition.position)
        targetRef.current = explicitPosition ? explicitPosition : new THREE.Vector3(targetPosition.position.x, targetPosition.position.y, targetPosition.position.z)
      } else if (targetPosition.isVector3) {
        targetRef.current = targetPosition.clone()
      } else {
        targetRef.current = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z)
      }
    }
  }, [targetPosition, camera, controls])

  useFrame((state, delta) => {
    if (!isAnimating.current || !targetRef.current) return

    progress.current += delta * 0.33 // Animation speed - slower for 3 second duration

    if (progress.current >= 1) {
      progress.current = 1
      isAnimating.current = false
      if (onComplete) onComplete()
    }

    // Smooth easing function
    const t = easeInOutCubic(progress.current)

    // Interpolate the look-at target from start to end
    const currentTarget = new THREE.Vector3().lerpVectors(
      startTarget.current,
      targetRef.current,
      t
    )

    // Interpolate the offset from target to camera
    // This ensures smooth transition from current view to zoomed view
    const currentOffset = new THREE.Vector3().lerpVectors(
      startOffset.current,
      endOffset.current,
      t
    )

    // Camera position = current target + current offset
    const newPosition = currentTarget.clone().add(currentOffset)
    camera.position.copy(newPosition)

    // Update controls target
    if (controls) {
      controls.target.copy(currentTarget)
      controls.update()
    } else {
      camera.lookAt(currentTarget)
    }
  })

  return null
}

function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function getVectorFromTarget(value) {
  if (!value) return null
  if (value.isVector3) return value.clone()
  if (Array.isArray(value) && value.length >= 3) {
    return new THREE.Vector3(value[0], value[1], value[2])
  }
  if (typeof value === 'object') {
    return new THREE.Vector3(value.x ?? 0, value.y ?? 0, value.z ?? 0)
  }
  return null
}
