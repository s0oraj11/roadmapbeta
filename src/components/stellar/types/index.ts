// src/components/stellar/types/index.ts

import { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react'
import * as THREE from 'three'

export interface NodeType {
  id: string
  data: { label: string }
  position: { x: number; y: number }
  className?: string
}

export interface EdgeType {
  id: string
  source: string
  target: string
  animated?: boolean
}

export interface StellarRoadmapProps {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

export interface StellarNodeProps {
  node: NodeType
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
  onDrag: (position: [number, number, number]) => void
  isLocked: boolean
  onSelect: () => void
}

export interface ConstellationEdgeProps {
  start: [number, number, number]
  end: [number, number, number]
  animated?: boolean
  isLocked: boolean
  onDrag: (startDelta: [number, number, number]) => void
}

export interface CameraControllerProps {
  onCameraReady: (camera: THREE.Camera) => void
}
