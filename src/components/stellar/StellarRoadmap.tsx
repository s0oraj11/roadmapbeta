// src/components/stellar/StellarRoadmap.tsx
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'

import { StellarNode } from './nodes/StellarNode'
import { ConstellationEdge } from './edges/ConstellationEdge'
import { CameraController } from './camera/CameraController'
import { ControlPanel } from './controls/ControlPanel'
import { Minimap } from './minimap/Minimap'
import { NodeType, EdgeType, StellarRoadmapProps } from './types'

const StellarRoadmap: React.FC<StellarRoadmapProps> = ({ nodes: flowNodes, edges: flowEdges }) => {
  const nodes: NodeType[] = useMemo(() => flowNodes.map(node => ({
    id: node.id,
    data: node.data,
    position: node.position,
    className: node.className
  })), [flowNodes])
  
  const edges: EdgeType[] = useMemo(() => flowEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.animated
  })), [flowEdges])

  const [activeNode, setActiveNode] = useState<string | null>(null)
  const controlsRef = useRef<any>()
  const [camera, setCamera] = useState<THREE.Camera | null>(null)
  const initialCameraPosition = useRef<THREE.Vector3 | null>(null)
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  
  const [nodePositions, setNodePositions] = useState(() => new Map(nodes.map(node => [
    node.id,
    [
      node.position.x / 25 - 8,
      node.position.y / 25 + 8,
      0
    ] as [number, number, number]
  ])))

  const handleNodeClick = useCallback((nodeId: string) => {
    if (!isLocked) {
      setActiveNode(nodeId)
      setSelectedNode(nodeId)
      if (controlsRef.current) {
        const position = nodePositions.get(nodeId)
        if (position) {
          controlsRef.current.target.set(...position)
          controlsRef.current.update()
        }
      }
    }
  }, [nodePositions, isLocked])

  // ... (other handlers remain the same)

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
      <ControlPanel
        isLocked={isLocked}
        onToggleLock={() => setIsLocked(!isLocked)}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onReset={handleReset}
      />

      <Minimap
        nodes={nodes}
        activeNode={activeNode}
        nodePositions={nodePositions}
      />

      <Canvas>
        <CameraController onCameraReady={handleCameraReady} />
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

        {edges.map(edge => {
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

        {nodes.map(node => {
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

        <OrbitControls
          ref={controlsRef}
          enablePan={!isLocked}
          enableRotate={!isLocked}
          enableZoom={true}
          minDistance={5}
          maxDistance={100}
          makeDefault
        />
      </Canvas>
    </motion.div>
  )
}

export default StellarRoadmap

// src/pages/index.tsx
import React, { Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { initialNodes, initialEdges } from '@/components/stellar/data/roadmapData'

const StellarRoadmap = lazy(() => import('@/components/stellar/StellarRoadmap'))

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            NeetCode.io Roadmap
          </h1>
          <p className="text-gray-300 text-lg">
            Master data structures and algorithms with this structured learning path
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Suspense fallback={<div className="text-white text-center">Loading roadmap...</div>}>
            <StellarRoadmap nodes={initialNodes} edges={initialEdges} />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}

export default Index
