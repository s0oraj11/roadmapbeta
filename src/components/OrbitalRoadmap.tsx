"use client"

import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Text } from '@react-three/drei'
import { motion } from 'framer-motion-3d'

interface Node {
  id: string
  data: { label: string }
  position: { x: number, y: number }
  className: string
}

interface Edge {
  id: string
  source: string
  target: string
  animated?: boolean
}

// Import your roadmap data
import { initialNodes, initialEdges } from './roadmapData'

const Node3D: React.FC<{ node: Node, position: [number, number, number], isActive: boolean, onClick: () => void }> = ({ node, position, isActive, onClick }) => {
  const color = useMemo(() => {
    if (node.className.includes('start-node')) return '#60A5FA'
    if (node.className.includes('pattern-node')) return '#34D399'
    if (node.className.includes('subpattern-node')) return '#F59E0B'
    return '#4B5563'
  }, [node.className])

  return (
    <motion.group position={position} onClick={onClick} whileHover={{ scale: 1.1 }} animate={{ scale: isActive ? 1.2 : 1 }}>
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <Html distanceFactor={10}>
        <div className="bg-gray-800/90 backdrop-blur-sm p-2 rounded-lg text-white text-xs whitespace-nowrap">
          {node.data.label}
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
      <lineDashedMaterial color="#6B7280" dashSize={0.5} gapSize={0.25} />
    </line>
  )
}

const OrbitalRoadmap: React.FC = () => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  
  const nodePositions = useMemo(() => {
    const centerX = 450
    const centerY = 300
    return new Map(initialNodes.map(node => {
      const angle = Math.atan2(node.position.y - centerY, node.position.x - centerX)
      const distance = Math.sqrt(Math.pow(node.position.x - centerX, 2) + Math.pow(node.position.y - centerY, 2)) / 100
      return [
        node.id,
        [
          Math.cos(angle) * distance,
          Math.sin(angle) * distance,
          0
        ] as [number, number, number]
      ]
    }))
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

export default OrbitalRoadmap

