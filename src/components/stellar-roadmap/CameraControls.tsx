import React, { useRef, useCallback, useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import * as THREE from 'three'

interface CameraControlsProps {
  isLocked: boolean
  onCameraReady: (camera: THREE.Camera) => void
  initialPosition?: THREE.Vector3
  minDistance?: number
  maxDistance?: number
}

interface CameraControlsHandle {
  zoomIn: () => void
  zoomOut: () => void
  reset: () => void
  focusPosition: (position: [number, number, number]) => void
}

export const CameraControls = React.forwardRef<CameraControlsHandle, CameraControlsProps>(({
  isLocked,
  onCameraReady,
  initialPosition = new THREE.Vector3(0, 0, 15),
  minDistance = 5,
  maxDistance = 100
}, ref) => {
  const { camera } = useThree()
  const controlsRef = useRef<any>()
  const initialCameraPosition = useRef<THREE.Vector3>(initialPosition)

  useEffect(() => {
    camera.position.copy(initialCameraPosition.current)
    camera.lookAt(0, 0, 0)
    onCameraReady(camera)
  }, [camera, onCameraReady])

  React.useImperativeHandle(ref, () => ({
    zoomIn: () => {
      if (controlsRef.current && camera) {
        const zoomFactor = 0.75
        const currentDistance = camera.position.distanceTo(controlsRef.current.target)
        const newDistance = Math.max(currentDistance * zoomFactor, controlsRef.current.minDistance)
        
        const direction = camera.position.clone().sub(controlsRef.current.target).normalize()
        const newPosition = controlsRef.current.target.clone().add(direction.multiplyScalar(newDistance))
        
        camera.position.copy(newPosition)
        camera.updateProjectionMatrix()
        controlsRef.current.update()
      }
    },
    zoomOut: () => {
      if (controlsRef.current && camera) {
        const zoomFactor = 1.25
        const currentDistance = camera.position.distanceTo(controlsRef.current.target)
        const newDistance = Math.min(currentDistance * zoomFactor, controlsRef.current.maxDistance)
        
        const direction = camera.position.clone().sub(controlsRef.current.target).normalize()
        const newPosition = controlsRef.current.target.clone().add(direction.multiplyScalar(newDistance))
        
        camera.position.copy(newPosition)
        camera.updateProjectionMatrix()
        controlsRef.current.update()
      }
    },
    reset: () => {
      if (controlsRef.current && camera) {
        camera.position.copy(initialCameraPosition.current)
        controlsRef.current.target.set(0, 0, 0)
        camera.updateProjectionMatrix()
        controlsRef.current.update()
      }
    },
    focusPosition: (position: [number, number, number]) => {
      if (controlsRef.current && camera) {
        const offset = new THREE.Vector3(
          camera.position.x - position[0],
          camera.position.y - position[1],
          camera.position.z - position[2]
        )
        
        controlsRef.current.target.set(...position)
        camera.position.set(
          position[0] + offset.x,
          position[1] + offset.y,
          position[2] + offset.z
        )
        camera.updateProjectionMatrix()
        controlsRef.current.update()
      }
    }
  }))

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={!isLocked}
      enableRotate={!isLocked}
      enableZoom={true}
      minDistance={minDistance}
      maxDistance={maxDistance}
      makeDefault
    />
  )
})

export default CameraControls
