import React from 'react'
import { Node as FlowNode } from '@xyflow/react'
import * as THREE from 'three'

interface MinimapProps {
  nodes: FlowNode<any>[]
  nodePositions: Map<string, [number, number, number]>
  activeNode: string | null
  // New props for viewport tracking
  camera?: THREE.Camera | null
  controls?: any  // OrbitControls ref
  viewportBounds?: {
    min: THREE.Vector3
    max: THREE.Vector3
  }
}

const Minimap: React.FC<MinimapProps> = ({ 
  nodes, 
  nodePositions, 
  activeNode,
  camera,
  controls,
  viewportBounds 
}) => {
  // Calculate viewport rectangle based on camera frustum
  const getViewportRect = () => {
    if (!camera || !controls) return null
    
    const frustum = new THREE.Frustum()
    const matrix = new THREE.Matrix4()
    matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum.setFromProjectionMatrix(matrix)
    
    // Convert frustum to 2D minimap coordinates
    const bounds = frustum.getBoundingSphere()
    if (!bounds) return null

    return {
      left: `${((bounds.center.x + 8) * 50) / 8}%`,
      top: `${((bounds.center.y - 8) * -50) / 8}%`,
      width: `${(bounds.radius * 2 * 50) / 8}%`,
      height: `${(bounds.radius * 2 * 50) / 8}%`
    }
  }

  const viewport = getViewportRect()

  return (
    <div className="absolute bottom-4 right-4 z-10 w-64 h-64 bg-gray-800/80 rounded-lg border border-gray-700 p-2">
      <div className="relative w-full h-full">
        {/* Nodes */}
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

        {/* Viewport indicator */}
        {viewport && (
          <div 
            className="absolute border-2 border-white/30 rounded pointer-events-none"
            style={{
              left: viewport.left,
              top: viewport.top,
              width: viewport.width,
              height: viewport.height,
            }}
          />
        )}
      </div>
    </div>
  )
}

export default Minimap
