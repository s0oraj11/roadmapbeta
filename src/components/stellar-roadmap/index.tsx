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
      {/* Control buttons outside Canvas */}
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-gray-800/80 p-2 rounded-lg border border-gray-700">
        <button
          onClick={() => setIsLocked(!isLocked)}
          className="p-2 hover:bg-gray-700 rounded text-white"
          title={isLocked ? "Unlock group drag" : "Lock for group drag"}
        >
          {isLocked ? "🔒" : "🔓"}
        </button>
        <button
          onClick={() => cameraControlsRef.current?.zoomIn()}
          className="p-2 hover:bg-gray-700 rounded text-white"
        >
          🔍+
        </button>
        <button
          onClick={() => cameraControlsRef.current?.zoomOut()}
          className="p-2 hover:bg-gray-700 rounded text-white"
        >
          🔍-
        </button>
        <button
          onClick={() => {
            cameraControlsRef.current?.reset()
            setActiveNode(null)
            setSelectedNode(null)
          }}
          className="p-2 hover:bg-gray-700 rounded text-white"
        >
          🔄
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

      {/* Minimap outside Canvas */}
      <div className="absolute bottom-4 right-4 z-10 w-48 h-48 bg-gray-800/80 rounded-lg border border-gray-700 p-2">
        <div className="relative w-full h-full">
          {/* We need to call updateMinimapPositions here */}
          {/* This is a placeholder and might need adjustment */}
          {flowNodes.map(node => (
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
      </div>
    </motion.div>
  )
}

export default StellarRoadmap

