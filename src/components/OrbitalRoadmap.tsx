"use client"

import React, { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Environment } from '@react-three/drei'
import { motion } from 'framer-motion-3d'
import { Node, Edge } from '@xyflow/react'

// Sample data - you should replace this with your actual data
const sampleNodes: Node[] = [
  { id: '1', position: { x: 0, y: 0 }, data: { label: 'Arrays & Strings' } },
  { id: '2', position: { x: 200, y: 0 }, data: { label: 'Linked Lists' } },
  { id: '3', position: { x: 0, y: 200 }, data: { label: 'Trees & Graphs' } },
  { id: '4', position: { x: 200, y: 200 }, data: { label: 'Dynamic Programming' } },
]

const sampleEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2' },
  { id: 'e2-3', source: '2', target: '3' },
  { id: 'e3-4', source: '3', target: '4' },
]

interface RoadmapNodeProps {
  node: Node
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
}

const RoadmapNode: React.FC<RoadmapNodeProps> = ({ node, position, isActive, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  return (
    <motion.mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      animate={{
        scale: isActive ? 1.2 : 1,
      }}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        color={isActive ? "#60A5FA" : "#4B5563"}
        metalness={0.5}
        roughness={0.5}
      />
      <Html distanceFactor={10}>
        <div className="bg-gray-800/90 backdrop-blur-sm p-2 rounded-lg text-white text-sm whitespace-nowrap">
          {node.data.label}
        </div>
      </Html>
    </motion.mesh>
  )
}

interface RoadmapEdgeProps {
  start: [number, number, number]
  end: [number, number, number]
}

const RoadmapEdge: React.FC<RoadmapEdgeProps> = ({ start, end }) => {
  return (
    <line>
      <bufferGeometry>
        <float32BufferAttribute attach="attributes-position" args={[new Float32Array([...start, ...end]), 3]} />
      </bufferGeometry>
      <lineBasicMaterial color="#6B7280" linewidth={1} />
    </line>
  )
}

const OrbitalRoadmap: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const controlsRef = useRef()
  
  // Convert 2D positions to 3D with better spacing
  const nodePositions = new Map(sampleNodes.map(node => [
    node.id,
    [
      node.position.x / 50, // Adjusted scaling factor
      node.position.y / 50,
      0
    ] as [number, number, number]
  ]))

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId)
    
    if (controlsRef.current) {
      const position = nodePositions.get(nodeId)
      controlsRef.current.target.set(...position)
    }
  }

  return (
    <div className="w-full h-[800px] bg-gray-900 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 20], fov: 50 }}>
        <color attach="background" args={['#111827']} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Environment preset="city" />
        
        {/* Nodes */}
        {sampleNodes.map(node => (
          <RoadmapNode
            key={node.id}
            node={node}
            position={nodePositions.get(node.id)}
            isActive={node.id === activeNode}
            onClick={() => handleNodeClick(node.id)}
          />
        ))}
        
        {/* Edges */}
        {sampleEdges.map(edge => (
          <RoadmapEdge
            key={`${edge.source}-${edge.target}`}
            start={nodePositions.get(edge.source)}
            end={nodePositions.get(edge.target)}
          />
        ))}
        
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
      
      {/* UI Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
        <button
          onClick={() => setActiveNode(null)}
          className="bg-gray-800/80 hover:bg-gray-700/80 text-white px-4 py-2 rounded-full transition-colors"
        >
          Reset View
        </button>
      </div>
    </div>
  )
}

export default OrbitalRoadmap

