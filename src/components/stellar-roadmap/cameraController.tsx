// cameraController.tsx
import React, { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'

export const CAMERA_SETTINGS = {
  INITIAL_POSITION: [20, 20, 20] as [number, number, number],
  ZOOM_IN_FACTOR: 0.9,
  ZOOM_OUT_FACTOR: 1.1,
  MIN_DISTANCE: 5,
  MAX_DISTANCE: 100
}

interface CameraControllerProps {
  onCameraReady: (camera: THREE.Camera) => void
}

export const CameraController: React.FC<CameraControllerProps> = ({ onCameraReady }) => {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(...CAMERA_SETTINGS.INITIAL_POSITION)
    onCameraReady(camera)
  }, [camera, onCameraReady])
  
  return null
}

export const calculateNewCameraPosition = (
  camera: THREE.Camera,
  targetPosition: [number, number, number],
  target: THREE.Vector3,
  distance: number
): THREE.Vector3 => {
  const direction = camera.position.clone().sub(target).normalize()
  return target.clone().add(direction.multiplyScalar(distance))
}
