import React, { useRef, useEffect, useState } from 'react'
import { Node as FlowNode } from '@xyflow/react'
import * as THREE from 'three'

interface MinimapProps {
  nodes: FlowNode<any>[]
  nodePositions: Map<string, [number, number, number]>
  activeNode: string | null
  camera?: THREE.Camera | null
  controls?: any
  onNodeSelect?: (nodeId: string) => void
}

interface MinimapControlsProps {
  zoom: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
}

const MinimapControls: React.FC<MinimapControlsProps> = ({ zoom, onZoomIn, onZoomOut, onReset }) => (
  <div className="absolute top-2 right-2 flex flex-col gap-1">
    <button
      onClick={onZoomIn}
      className="p-1 bg-gray-700/50 hover:bg-gray-600/50 rounded text-gray-300 text-xs"
    >
      +
    </button>
    <button
      onClick={onZoomOut}
      className="p-1 bg-gray-700/50 hover:bg-gray-600/50 rounded text-gray-300 text-xs"
    >
      -
    </button>
    <button
      onClick={onReset}
      className="p-1 bg-gray-700/50 hover:bg-gray-600/50 rounded text-gray-300 text-xs"
    >
      ↺
    </button>
    <div className="text-xs text-gray-400 text-center mt-1">
      {Math.round(zoom * 100)}%
    </div>
  </div>
)

const Minimap: React.FC<MinimapProps> = ({
  nodes,
  nodePositions,
  activeNode,
  camera,
  controls,
  onNodeSelect
}) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const [zoom, setZoom] = useState(100)
  const [viewportRect, setViewportRect] = useState<{
    left: string
    top: string
    width: string
    height: string
  } | null>(null)

  // Calculate viewport position and zoom level
  useEffect(() => {
    if (!camera || !controls) return

    const updateViewport = () => {
      const frustum = new THREE.Frustum()
      const matrix = new THREE.Matrix4()
      
      // Get current camera view
      matrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
      frustum.setFromProjectionMatrix(matrix)
      
      // Calculate viewport bounds
      const bounds = frustum.getBoundingSphere()
      if (!bounds) return

      // Update zoom based on camera distance
      const distance = camera.position.distanceTo(controls.target)
      const maxDistance = 20 // Adjust based on your scene scale
      const newZoom = Math.round((1 - (distance / maxDistance)) * 100)
      setZoom(newZoom)

      // Update viewport rectangle
      setViewportRect({
        left: `${((bounds.center.x + 8) * 50) / 8}%`,
        top: `${((bounds.center.y - 8) * -50) / 8}%`,
        width: `${(bounds.radius * 2 * 50) / 8}%`,
        height: `${(bounds.radius * 2 * 50) / 8}%`
      })
    }

    // Update on camera changes
    const animateFrame = requestAnimationFrame(updateViewport)
    return () => cancelAnimationFrame(animateFrame)
  }, [camera, controls])

  // Handle minimap interactions
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current || !controls) return
    isDragging.current = true
    handleMouseMove(e)
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !containerRef.current || !controls) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width - 0.5) * 16
    const y = -((e.clientY - rect.top) / rect.height - 0.5) * 16
    
    controls.target.set(x, y, 0)
    controls.update()
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  // Handle zoom controls
  const handleZoomIn = () => {
    if (!controls || !camera) return
    const newPosition = camera.position.clone()
    newPosition.multiplyScalar(0.8)
    camera.position.copy(newPosition)
    camera.updateProjectionMatrix()
    controls.update()
  }

  const handleZoomOut = () => {
    if (!controls || !camera) return
    const newPosition = camera.position.clone()
    newPosition.multiplyScalar(1.2)
    camera.position.copy(newPosition)
    camera.updateProjectionMatrix()
    controls.update()
  }

  const handleReset = () => {
    if (!controls || !camera) return
    camera.position.set(0, 0, 10)
    controls.target.set(0, 0, 0)
    camera.updateProjectionMatrix()
    controls.update()
  }

  return (
    <div className="absolute bottom-4 right-4 z-10 w-64 h-64 bg-gray-800/80 rounded-lg border border-gray-700 p-2">
      <MinimapControls
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
      />
      
      <div 
        ref={containerRef}
        className="relative w-full h-full cursor-move"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Node dots */}
        {nodes.map(node => {
          const position = nodePositions.get(node.id)
          return position && (
            <div
              key={node.id}
              className={`absolute w-2 h-2 rounded-full transition-colors duration-200 cursor-pointer
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
              onClick={() => onNodeSelect?.(node.id)}
            />
          )
        })}

        {/* Viewport indicator */}
        {viewportRect && (
          <div 
            className="absolute border-2 border-white/30 rounded pointer-events-none"
            style={viewportRect}
          />
        )}
      </div>
    </div>
  )
}

export default Minimap
