import { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import usStatesData from './us-states.json'
import { US_BOUNDS } from './usStates'

export default function USMap() {
  const meshes = useMemo(() => {
    const allMeshes = []

    usStatesData.features.forEach((feature) => {
      const geometry = feature.geometry

      const pushShape = (ring) => {
        const shape = createShapeFromCoordinates(ring)
        if (shape) {
          allMeshes.push({ shape, feature })
        }
      }

      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach(pushShape)
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon) => {
          polygon.forEach(pushShape)
        })
      }
    })

    return allMeshes
  }, [])

  const extrudeSettings = {
    depth: 4,
    bevelEnabled: true,
    bevelThickness: 0.2,
    bevelSize: 0.2,
    bevelSegments: 3,
  }

  return (
    <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      {meshes.map(({ shape, feature }, index) => (
        <StateMesh key={index} shape={shape} feature={feature} settings={extrudeSettings} />
      ))}
    </group>
  )
}

function StateMesh({ shape, feature, settings }) {
  const geometry = useMemo(() => new THREE.ExtrudeGeometry(shape, settings), [shape, settings])
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry, 1), [geometry])
  const [topMaterial, bottomMaterial, sideMaterial] = useMemo(() => {
    const top = new THREE.MeshStandardMaterial({
      color: '#000000',
      roughness: 0.7,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1
    })
    const bottom = new THREE.MeshStandardMaterial({
      color: '#000000',
      roughness: 0.75,
      metalness: 0.05
    })
    const side = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      emissive: '#ffffff',
      emissiveIntensity: 0.3,
      roughness: 0.5,
      metalness: 0.0
    })
    return [top, bottom, side]
  }, [feature])

  useEffect(() => () => {
    geometry.dispose()
    edges.dispose()
    topMaterial.dispose()
    bottomMaterial.dispose()
    sideMaterial.dispose()
  }, [geometry, edges, topMaterial, bottomMaterial, sideMaterial])

  return (
    <group>
      <mesh geometry={geometry} material={[topMaterial, bottomMaterial, sideMaterial]} castShadow receiveShadow />
      <lineSegments
        geometry={edges}
        renderOrder={1}
        position={[0, 0, settings.depth + 0.15]}
      >
        <lineBasicMaterial color="#ffffff" linewidth={2} depthTest={false} />
      </lineSegments>
    </group>
  )
}

// Helper function to create THREE.Shape from GeoJSON coordinates
function createShapeFromCoordinates(coordinates) {
  if (!coordinates || coordinates.length < 3) return null

  const shape = new THREE.Shape()

  // Convert lat/lon to 3D coordinates
  coordinates.forEach((coord, index) => {
    const [lon, lat] = coord
    const { x, y } = projectCoordinates(lon, lat)

    if (index === 0) {
      shape.moveTo(x, y)
    } else {
      shape.lineTo(x, y)
    }
  })

  shape.closePath()
  return shape
}

// Mercator-like projection for US coordinates (same as latLonTo3D)
function projectCoordinates(lon, lat) {
  const { minLon, maxLon, minLat, maxLat, width, height } = US_BOUNDS

  const x = ((lon - minLon) / (maxLon - minLon)) * width - width / 2
  const y = ((lat - minLat) / (maxLat - minLat)) * height - height / 2

  return { x, y }
}
