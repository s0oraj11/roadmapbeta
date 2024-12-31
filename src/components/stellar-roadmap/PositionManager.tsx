import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Node as FlowNode } from '@xyflow/react'
import * as THREE from 'three'

interface PositionManagerProps {
  initialNodes: FlowNode[]
  isLocked: boolean
  onPositionsChange?: (positions: Map<string, [number, number, number]>) => void
  children: (props: {
    nodePositions: Map<string, [number, number, number]>
    handleNodeDrag: (nodeId: string, newPosition: [number, number, number]) => void
    handleEdgeDrag: (delta: [number, number, number]) => void
    resetPositions: () => void
  }) => React.ReactNode
}

export const PositionManager = React.forwardRef<any, PositionManagerProps>(({
  initialNodes,
  isLocked,
  onPositionsChange,
  children
}, ref) => {
  // Initialize node positions from flow nodes with more precise scaling
  const [nodePositions, setNodePositions] = useState(() => {
    const initialPositions = new Map<string, [number, number, number]>()
    initialNodes.forEach(node => {
      initialPositions.set(node.id, [
        (node.position.x / 100) - 2, // Adjusted scaling factor
        (node.position.y / 100) + 2, // Adjusted scaling factor
        0
      ])
    })
    return initialPositions
  })

  // Allow external access to positions and reset functionality
  React.useImperativeHandle(ref, () => ({
    nodePositions,
    resetPositions: () => {
      const resetPositions = new Map<string, [number, number, number]>()
      initialNodes.forEach(node => {
        resetPositions.set(node.id, [
          (node.position.x / 100) - 2,
          (node.position.y / 100) + 2,
          0
        ])
      })
      setNodePositions(resetPositions)
      onPositionsChange?.(resetPositions)
    }
  }))

  // Notify parent of position changes
  useEffect(() => {
    onPositionsChange?.(nodePositions)
  }, [nodePositions, onPositionsChange])

  const handleNodeDrag = useCallback((nodeId: string, newPosition: [number, number, number]) => {
    setNodePositions(prev => {
      const updated = new Map(prev)
      
      if (isLocked) {
        // Calculate the movement delta
        const oldPos = prev.get(nodeId)
        if (!oldPos) return prev
        
        const delta: [number, number, number] = [
          newPosition[0] - oldPos[0],
          newPosition[1] - oldPos[1],
          newPosition[2] - oldPos[2]
        ]

        // Move all nodes by the same delta
        prev.forEach((pos, id) => {
          updated.set(id, [
            pos[0] + delta[0],
            pos[1] + delta[1],
            pos[2] + delta[2]
          ])
        })
      } else {
        // Move only the dragged node
        updated.set(nodeId, newPosition)
      }

      return updated
    })
  }, [isLocked])

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
        return updated
      })
    }
  }, [isLocked])

  return children({
    nodePositions,
    handleNodeDrag,
    handleEdgeDrag,
    resetPositions: () => {
      const resetPositions = new Map<string, [number, number, number]>()
      initialNodes.forEach(node => {
        resetPositions.set(node.id, [
          (node.position.x / 100) - 2,
          (node.position.y / 100) + 2,
          0
        ])
      })
      setNodePositions(resetPositions)
      onPositionsChange?.(resetPositions)
    }
  })
})

export default PositionManager
