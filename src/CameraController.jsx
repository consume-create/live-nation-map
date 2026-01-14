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
  const progress = useRef(0)

  useEffect(() => {
    if (targetPosition) {
      // Start animation
      console.log('[CameraController] Starting animation')
      console.log('[CameraController] Current camera position:', camera.position.toArray())
      isAnimating.current = true
      progress.current = 0
      startPosition.current.copy(camera.position)
      console.log('[CameraController] Captured startPosition:', startPosition.current.toArray())
      if (controls) {
        startTarget.current.copy(controls.target)
      } else {
        startTarget.current.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(50))
      }
      console.log('[CameraController] startTarget:', startTarget.current.toArray())
      const baseOffset = startPosition.current.clone().sub(startTarget.current)

      const manualOffset = getVectorFromTarget(targetPosition.offset)
      if (manualOffset) {
        startOffset.current.copy(manualOffset)
      } else if (typeof targetPosition.zoomFactor === 'number') {
        startOffset.current.copy(baseOffset.multiplyScalar(targetPosition.zoomFactor))
      } else {
        startOffset.current.copy(baseOffset)
      }

      if (targetPosition.position) {
        const explicitPosition = getVectorFromTarget(targetPosition.position)
        targetRef.current = explicitPosition ? explicitPosition : new THREE.Vector3(targetPosition.position.x, targetPosition.position.y, targetPosition.position.z)
      } else if (targetPosition.isVector3) {
        targetRef.current = targetPosition.clone()
      } else {
        targetRef.current = new THREE.Vector3(targetPosition.x, targetPosition.y, targetPosition.z)
      }
      console.log('[CameraController] targetRef (target center):', targetRef.current.toArray())
      console.log('[CameraController] startOffset:', startOffset.current.toArray())
      const targetCameraPos = targetRef.current.clone().add(startOffset.current)
      console.log('[CameraController] targetCameraPos (final position):', targetCameraPos.toArray())
    }
  }, [targetPosition, camera, controls])

  useFrame((state, delta) => {
    if (!isAnimating.current || !targetRef.current) return

    progress.current += delta * 0.8 // Animation speed

    if (progress.current >= 1) {
      progress.current = 1
      isAnimating.current = false
      if (onComplete) onComplete()
    }

    // Smooth easing function
    const t = easeInOutCubic(progress.current)

    // Pin/Building center position
    const targetCenter = targetRef.current.clone()

    // Calculate camera position - position camera relative to target
    const targetCameraPos = targetCenter.clone().add(startOffset.current)

    // Animate camera position
    const newPosition = new THREE.Vector3().lerpVectors(
      startPosition.current,
      targetCameraPos,
      t
    )
    camera.position.copy(newPosition)

    // Animate controls target - point at the center
    if (controls) {
      const newTarget = new THREE.Vector3().lerpVectors(
        startTarget.current,
        targetCenter,
        t
      )
      controls.target.copy(newTarget)
      controls.update()
    } else {
      camera.lookAt(targetCenter)
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
