import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Stars } from '@react-three/drei'
import { motion } from 'framer-motion-3d'
import * as THREE from 'three'

// Define initial nodes and edges
const initialNodes = [
  { 
    id: 'start',
    data: { label: 'Level 1: Foundation' },
    position: { x: 450, y: 50 },
  },
  { 
    id: 'p1',
    data: { label: '1. Arrays & Strings' },
    position: { x: 200, y: 180 },
  },
  { 
    id: 'p2',
    data: { label: '2. Linked Lists' },
    position: { x: 700, y: 200 },
  },
]

const initialEdges = [
  { 
    id: 'e-start-p1', 
    source: 'start', 
    target: 'p1',
  },
  { 
    id: 'e-start-p2', 
    source: 'start', 
    target: 'p2',
  },
]

interface NodeType {
  id: string
  data: { label: string }
  position: { x: number; y: number }
}

interface EdgeType {
  id: string
  source: string
  target: string
}

const StellarNode = ({ 
  node, 
  position,
  isActive, 
  onClick, 
  isPrimary 
}: { 
  node: NodeType
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
  isPrimary: boolean
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.01
    }
  })

  const nodeScale = isPrimary ? 1.2 : 0.8
  const nodeColor = isPrimary ? "#FFD700" : "#4B5563"
  
  return (
    <motion.group
      position={position}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      animate={{ scale: isActive ? 1.2 : 1 }}
    >
      <mesh ref={meshRef}>
        <sphereGeometry args={[nodeScale, 32, 32]} />
        <meshStandardMaterial 
          color={isActive ? "#60A5FA" : nodeColor}
          metalness={0.8}
          roughness={0.2}
          emissive={isPrimary ? nodeColor : "#000000"}
          emissiveIntensity={isPrimary ? 0.5 : 0}
        />
      </mesh>
      <Html center distanceFactor={10}>
        <div className={`
          px-3 py-1.5 rounded-lg text-sm whitespace-nowrap
          ${isPrimary ? 'bg-yellow-500/20 text-yellow-200' : 'bg-gray-800/90 text-white'}
        `}>
          {node.data.label}
        </div>
      </Html>
    </motion.group>
  )
}

const ConstellationEdge = ({ 
  start, 
  end 
}: { 
  start: [number, number, number]
  end: [number, number, number]
}) => {
  return (
    <line>
      <bufferGeometry>
        <float32BufferAttribute 
          attach="attributes-position" 
          args={[new Float32Array([...start, ...end]), 3]} 
        />
      </bufferGeometry>
      <lineBasicMaterial color="#4B5563" linewidth={1} />
    </line>
  )
}

const StellarRoadmap = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const controlsRef = useRef()

  // Convert 2D positions to 3D with better spacing
  const nodePositions = useMemo(() => 
    new Map(initialNodes.map(node => [
      node.id,
      [
        node.position.x / 100,
        node.position.y / 100,
        0
      ] as [number, number, number]
    ])), 
  [])

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId)
    if (controlsRef.current) {
      const position = nodePositions.get(nodeId)
      controlsRef.current.target.set(...position)
    }
  }

  return (
    <div className="w-full h-[800px] bg-gray-950 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 20], fov: 60 }}>
        <color attach="background" args={['#030712']} />
        
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        
        <Stars 
          radius={50}
          depth={50}
          count={3000}
          factor={4}
          fade
          speed={1}
        />

        {/* Edges */}
        {initialEdges.map(edge => (
          <ConstellationEdge
            key={edge.id}
            start={nodePositions.get(edge.source)}
            end={nodePositions.get(edge.target)}
          />
        ))}

        {/* Nodes */}
        {initialNodes.map(node => (
          <StellarNode
            key={node.id}
            node={node}
            position={nodePositions.get(node.id)}
            isActive={node.id === activeNode}
            onClick={() => handleNodeClick(node.id)}
            isPrimary={node.id === 'start'}
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
    </div>
  )
}

// Main page component
const Index = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">
            Learning Roadmap
          </h1>
          <p className="text-lg text-gray-400">
            Navigate your learning journey through the stars
          </p>
        </div>
        <StellarRoadmap />
      </div>
    </div>
  )
}

export default Index
