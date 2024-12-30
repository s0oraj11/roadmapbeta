// src/components/stellar/minimap/Minimap.tsx
import React from 'react'
import { NodeType } from '../types'

interface MinimapProps {
  nodes: NodeType[]
  activeNode: string | null
  nodePositions: Map<string, [number, number, number]>
}

export const Minimap: React.FC<MinimapProps> = ({
  nodes,
  activeNode,
  nodePositions
}) => {
  const updateMinimapPositions = () => {
    return nodes.map(node => ({
      ...node,
      position: {
        x: (nodePositions.get(node.id)?.[0] ?? 0) * 50 + 400,
        y: -(nodePositions.get(node.id)?.[1] ?? 0) * 50 + 400
      }
    }))
  }

  return (
    <div className="absolute bottom-4 right-4 z-10 w-48 h-48 bg-gray-800/80 rounded-lg border border-gray-700 p-2">
      <div className="relative w-full h-full">
        {updateMinimapPositions().map(node => (
          <div
            key={node.id}
            className={`absolute w-2 h-2 rounded-full transition-colors duration-200
              ${node.id === activeNode 
                ? 'bg-blue-400' 
                : node.className === 'start-node'
                ? 'bg-yellow-400'
                : node.className === 'pattern-node'
                ? 'bg-indigo-400'
                : 'bg-gray-400'
              }`}
            style={{
              left: `${(node.position.x / 800) * 100}%`,
              top: `${(node.position.y / 800) * 100}%`,
            }}
          />
        ))}
      </div>
    
