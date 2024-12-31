import React, { useState, useCallback } from 'react'
import { Node as FlowNode } from '@xyflow/react'
import * as THREE from 'three'

interface PositionManagerProps {
  initialNodes: FlowNode[]
  onPositionsChange?: (positions: Map<string, [number, number, number]>) => void
  isLocked: boolean
  children: (props: {
    nodePositions: Map<string, [number, number, number]>
    handleNodeDrag: (nodeId: string, newPosition: [number, number, number]) => void
    handleEdgeDrag: (delta: [number, number, number]) => void
    resetPositions: () => void
    updateMinimapPositions: () => FlowNode[]
  }) => React.ReactNode
}

export const PositionManager: React.FC<PositionManagerProps> = ({
  initialNodes,
  onPositionsChange,
  isLocked,
  children
}) => {
  // Initialize node positions from flow nodes
  const [nodePositions, setNodePositions] = useState(() => new Map(initialNodes.map(node => [
    node.id,
    [
      node.position.x / 25 - 8,
      node.position.y / 25 + 8,
      0
    ] as [number, number, number]
  ])))

  const handleNodeDrag = useCallback((nodeId: string, newPosition: [number, number, number]) => {
    setNodePositions(prev => {
      const updated = new Map(prev)
      if (isLocked) {
        const delta = [
          newPosition[0] - (prev.get(nodeId)?.[0] ?? 0),
          newPosition[1] - (prev.get(nodeId)?.[1] ?? 0),
          newPosition[2] - (prev.get(nodeId)?.[2] ?? 0),
        ] as [number, number, number]
        
        prev.forEach((pos, id) => {
          updated.set(id, [
            pos[0] + delta[0],
            pos[1] + delta[1],
            pos[2] + delta[2]
          ])
        })
      } else {
        updated.set(nodeId, newPosition)
      }
      onPositionsChange?.(updated)
      return updated
    })
  }, [isLocked, onPositionsChange])

  const handleEdgeDrag = useCallback((delta: [number, number, number]) => {
    if (isLocked) {
      setNodePositions(prev => {
        const updated = new Map()
        prev.forEach((pos, id) => {
          updated.set(id, [
            pos[0] + delta[0],
            pos[1] + delta[1],
            pos[2] + delta[2]
          ])
        })
        onPositionsChange?.(updated)
        return updated
      })
    }
  }, [isLocked, onPositionsChange])

  const resetPositions = useCallback(() => {
    const initialPositions = new Map(initialNodes.map(node => [
      node.id,
      [
        node.position.x / 25 - 8,
        node.position.y / 25 + 8,
        0
      ] as [number, number, number]
    ]))
    setNodePositions(initialPositions)
    onPositionsChange?.(initialPositions)
  }, [initialNodes, onPositionsChange])

  const updateMinimapPositions = useCallback(() => {
    return initialNodes.map(node => ({
      ...node,
      position: {
        x: (nodePositions.get(node.id)?.[0] ?? 0) * 50 + 400,
        y: -(nodePositions.get(node.id)?.[1] ?? 0) * 50 + 400
      }
    }))
  }, [initialNodes, nodePositions])

  return children({
    nodePositions,
    handleNodeDrag,
    handleEdgeDrag,
    resetPositions,
    updateMinimapPositions
  })
}

export default PositionManager
