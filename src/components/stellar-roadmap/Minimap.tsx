import React from 'react'
import { Node as FlowNode } from '@xyflow/react'

interface MinimapProps {
  nodes: FlowNode[]
  nodePositions: Map<string, [number, number, number]>
  activeNode: string | null
}

const Minimap: React.FC<MinimapProps> = ({ nodes, nodePositions, activeNode }) => {
  return (
    <div className="absolute bottom-4 right-4 z-10 w-48 h-48 bg-gray-800/80 rounded-lg border border-gray-700 p-2">
      <div className="relative w-full h-full">
        {nodes.map(node => {
          const position = nodePositions.get(node.id)
          return position && (
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
                left: `${((position[0] + 8) * 50) / 8}%`,
                top: `${((position[1] - 8) * -50) / 8}%`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

export default Minimap
