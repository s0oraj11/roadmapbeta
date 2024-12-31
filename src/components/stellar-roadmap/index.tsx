import React, { useState, useCallback, useRef, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react'
import { StellarNode } from './StellarNode'
import { ConstellationEdge } from './ConstellationEdge'
import { CameraControls } from './CameraControls'
import { PositionManager } from './PositionManager'

interface StellarRoadmapProps {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const StellarRoadmap: React.FC<StellarRoadmapProps> = ({ nodes: flowNodes, edges: flowEdges }) => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [camera, setCamera] = useState<THREE.Camera | null>(null)
  const cameraControlsRef = useRef<any>()
  const positionManagerRef = useRef<any>()

  const handleNodeClick = useCallback((nodeId: string) => {
    if (!isLocked) {
      setActiveNode(nodeId)
      setSelectedNode(nodeId)
    }
  }, [isLocked])

  const handleNodeSelect = useCallback((nodeId: string) => {
    if (!isLocked && cameraControlsRef.current) {
      cameraControlsRef.current.focusPosition(nodeId)
    }
  }, [isLocked])

  const handleReset = useCallback(() => {
    if (cameraControlsRef.current) {
      cameraControlsRef.current.reset()
      setActiveNode(null)
      setSelectedNode(null)
      if (positionManagerRef.current?.resetPositions) {
        positionManagerRef.current.resetPositions()
      }
    }
  }, [])

  useEffect(() => {
    const setCursor = () => {
      document.body.style.cursor = isLocked ? 'grab' : 'auto'
    }
    setCursor()
    window.addEventListener('mousemove', setCursor)
    return () => window.removeEventListener('mousemove', setCursor)
  }, [isLocked])

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full h-[800px] bg-gray-950 rounded-lg overflow-hidden"
    >
      {/* Control buttons with SVG icons */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-gray-800/80 p-2 rounded-lg border border-gray-700">
        <button
          onClick={() => setIsLocked(!isLocked)}
          className="p-2 hover:bg-gray-700 rounded text-white"
          title={isLocked ? "Unlock group drag" : "Lock for group drag"}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d={isLocked ? "M7 11V7a5 5 0 0 1 10 0v4" : "M7 11V7a5 5 0 0 1 9.9-1"}/>
          </svg>
        </button>
        <button
          onClick={() => cameraControlsRef.current?.zoomIn()}
          className="p-2 hover:bg-gray-700 rounded text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button
          onClick={() => cameraControlsRef.current?.zoomOut()}
          className="p-2 hover:bg-gray-700 rounded text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button
          onClick={handleReset}
          className="p-2 hover:bg-gray-700 rounded text-white"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </button>
      </div>

      <Canvas>
        <color attach="background" args={['#030712']} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <Stars 
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          fade
          speed={1}
        />

        <CameraControls
          ref={cameraControlsRef}
          isLocked={isLocked}
          onCameraReady={setCamera}
        />

        <PositionManager
          ref={positionManagerRef}
          initialNodes={flowNodes}
          isLocked={isLocked}
        >
          {({ nodePositions, handleNodeDrag, handleEdgeDrag, updateMinimapPositions }) => (
            <>
              {flowEdges.map(edge => {
                const startPos = nodePositions.get(edge.source)
                const endPos = nodePositions.get(edge.target)
                if (startPos && endPos) {
                  return (
                    <ConstellationEdge
                      key={edge.id}
                      start={startPos}
                      end={endPos}
                      animated={edge.animated}
                      isLocked={isLocked}
                      onDrag={handleEdgeDrag}
                    />
                  )
                }
                return null
              })}

              {flowNodes.map(node => {
                const position = nodePositions.get(node.id)
                if (position) {
                  return (
                    <StellarNode
                      key={node.id}
                      node={node}
                      position={position}
                      isActive={!isLocked && node.id === activeNode}
                      onClick={() => handleNodeClick(node.id)}
                      onDrag={(newPos) => handleNodeDrag(node.id, newPos)}
                      isLocked={isLocked}
                      onSelect={() => handleNodeSelect(node.id)}
                    />
                  )
                }
                return null
              })}
            </>
          )}
        </PositionManager>
      </Canvas>

      {/* Minimap with proper positioning */}
      <div className="absolute bottom-4 right-4 z-10 w-48 h-48 bg-gray-800/80 rounded-lg border border-gray-700 p-2">
        <div className="relative w-full h-full">
          {positionManagerRef.current?.updateMinimapPositions?.().map((node: FlowNode) => {
            const nodePos = positionManagerRef.current?.getNodePosition?.(node.id)
            if (nodePos) {
              return (
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
                    left: `${((nodePos[0] + 8) * 25 / 800) * 100}%`,
                    top: `${((nodePos[1] - 8) * 25 / 800) * 100}%`,
                  }}
                />
              )
            }
            return null
          })}
        </div>
      </div>
    </motion.div>
  )
}

export default StellarRoadmap
