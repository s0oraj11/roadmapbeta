"use client"

import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Text } from '@react-three/drei'
import { motion } from 'framer-motion-3d'
import { initialNodes, initialEdges } from './roadmapData'
import TopicCard from './TopicCard'

interface Node3DProps {
  node: typeof initialNodes[0]
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
}

const Node3D: React.FC<Node3DProps> = ({ node, position, isActive, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.getElapsedTime() * 0.5
      meshRef.current.rotation.y = state.clock.getElapsedTime() * 0.3
    }
  })

  return (
    <motion.group
      position={position}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      animate={{ scale: isActive ? 1.2 : 1 }}
    >
      <mesh ref={meshRef}>
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial 
          color={node.className.includes('start-node') ? '#60A5FA' : 
                 node.className.includes('pattern-node') ? '#34D399' : '#F59E0B'} 
          wireframe={true}
        />
      </mesh>
      <Html distanceFactor={10}>
        <div className="w-40">
          <TopicCard
            title={node.data.label}
            difficulty={node.data.difficulty as 'foundation' | 'intermediate' | 'advanced'}
            isCompleted={node.data.isCompleted}
            data-id={node.id}
          />
        </div>
      </Html>
    </motion.group>
  )
}

const Edge3D: React.FC<{ start: [number, number, number], end: [number, number, number], animated?: boolean }> = ({ start, end, animated }) => {
  const ref = useRef<THREE.Line>(null)

  useFrame(({ clock }) => {
    if (animated && ref.current) {
      ref.current.material.dashOffset = -clock.getElapsedTime() * 0.5
    }
  })

  return (
    <line ref={ref}>
      <bufferGeometry>
        <float32BufferAttribute attach="attributes-position" args={[new Float32Array([...start, ...end]), 3]} />
      </bufferGeometry>
      <lineDashedMaterial color="#6B7280" dashSize={0.3} gapSize={0.2} />
    </line>
  )
}

const Orbital: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  
  const nodePositions = useMemo(() => {
    const centerX = 450
    const centerY = 300
    const centerZ = 0
    const scaleFactor = 0.05
    return new Map(initialNodes.map(node => [
      node.id,
      [
        (node.position.x - centerX) * scaleFactor,
        (node.position.y - centerY) * scaleFactor,
        (Math.random() - 0.5) * 10 * scaleFactor // Random Z position for depth
      ] as [number, number, number]
    ]))
  }, [])

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId)
  }

  return (
    <div className="w-full h-[800px]">
      <Canvas camera={{ position: [0, 0, 30], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {initialNodes.map(node => (
          <Node3D
            key={node.id}
            node={node}
            position={nodePositions.get(node.id) || [0, 0, 0]}
            isActive={node.id === activeNode}
            onClick={() => handleNodeClick(node.id)}
          />
        ))}
        
        {initialEdges.map(edge => (
          <Edge3D
            key={edge.id}
            start={nodePositions.get(edge.source) || [0, 0, 0]}
            end={nodePositions.get(edge.target) || [0, 0, 0]}
            animated={edge.animated}
          />
        ))}
        
        <OrbitControls enablePan={true} enableZoom={true} enableRotate={true} />
      </Canvas>
    </div>
  )
}

export default Orbital

