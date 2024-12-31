// src/components/stellar-roadmap/utils.ts
import * as THREE from 'three'
import { NodeType } from './types'

export const CAMERA_SETTINGS = {
  INITIAL_POSITION: [0, 0, 15] as const,
  MIN_DISTANCE: 5,
  MAX_DISTANCE: 100,
  ZOOM_IN_FACTOR: 0.75,
  ZOOM_OUT_FACTOR: 1.25
}

export const MINIMAP_CONFIG = {
  WIDTH: 800,
  HEIGHT: 800,
  SCALE_FACTOR: 50,
  OFFSET_X: 400
}

export const NODE_TRANSFORM = {
  SCALE_FACTOR: 25,
  OFFSET_X: 8,
  OFFSET_Y: 8
}

export const calculateNodePositions = (nodes: NodeType[]) => {
  return new Map(nodes.map(node => [
    node.id,
    [
      node.position.x / NODE_TRANSFORM.SCALE_FACTOR - NODE_TRANSFORM.OFFSET_X,
      node.position.y / NODE_TRANSFORM.SCALE_FACTOR + NODE_TRANSFORM.OFFSET_Y,
      0
    ] as [number, number, number]
  ]))
}

export const updateMinimapPosition = (node: NodeType, position: { x: number, y: number }) => ({
  ...node,
  position: {
    x: position.x * MINIMAP_CONFIG.SCALE_FACTOR + MINIMAP_CONFIG.OFFSET_X,
    y: -position.y * MINIMAP_CONFIG.SCALE_FACTOR + MINIMAP_CONFIG.OFFSET_X
  }
})

export const calculateNewCameraPosition = (
  camera: THREE.Camera,
  targetPosition: [number, number, number],
  controlsTarget: THREE.Vector3,
  distance: number
) => {
  const direction = camera.position.clone().sub(controlsTarget).normalize()
  return controlsTarget.clone().add(direction.multiplyScalar(distance))
}
