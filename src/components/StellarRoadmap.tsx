import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Stars, PerspectiveCamera } from '@react-three/drei'
import { motion } from 'framer-motion-3d'
import * as THREE from 'three'
import { Card } from '@/components/ui/card'

interface NodeType {
  id: string
  data: { label: string }
  position: { x: number; y: number }
  className?: string
}

interface EdgeType {
  id: string
  source: string
  target: string
  animated?: boolean
}

interface StellarRoadmapProps {
  nodes: NodeType[]
  edges: EdgeType[]
}

// Custom Controls component that mimics ReactFlow controls
const Controls = () => {
  const { camera, gl } = useThree()
  
  const handleZoomIn = () => {
    camera.position.z *= 0.8
  }
  
  const handleZoomOut = () => {
    camera.position.z *= 1.2
  }
  
  const handleFitView = () => {
    camera.position.set(0, 0, 20)
    camera.lookAt(0, 0, 0)
  }

  return (
    <Html position={[-10, -8, 0]}>
      <div className="flex flex-col gap-2 bg-gray-800/80 p-2 rounded-lg border border-gray-700">
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-700 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-700 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button
          onClick={handleFitView}
          className="p-2 hover:bg-gray-700 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
          </svg>
        </button>
      </div>
    </Html>
  )
}

// Minimap component
const Minimap = ({ nodes, currentPosition }: { nodes: NodeType[], currentPosition: THREE.Vector3 }) => {
  const scale = 0.1
  
  return (
    <Html position={[8, -8, 0]}>
      <div className="w-48 h-48 bg-gray-800/80 rounded-lg border border-gray-700 p-2">
        <div className="relative w-full h-full">
          {nodes.map(node => (
            <div
              key={node.id}
              className="absolute w-2 h-2 bg-blue-400 rounded-full"
              style={{
                left: `${(node.position.x / 100) * 50 + 50}%`,
                top: `${(node.position.y / 100) * 50 + 50}%`,
              }}
            />
          ))}
          <div
            className="absolute w-3 h-3 bg-yellow-400 rounded-full transform -translate-x-1/2 -translate-y-1/2"
            style={{
              left: `${(currentPosition.x + 10) * 2.5}%`,
              top: `${(currentPosition.y + 10) * 2.5}%`,
            }}
          />
        </div>
      </div>
    </Html>
  )
}

const StellarNode = ({ 
  node,
  position,
  isActive,
  onClick,
}: { 
  node: NodeType
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const isPrimary = node.className === 'start-node'
  
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
          ${node.className === 'start-node' ? 'bg-yellow-500/20 text-yellow-200' : 'bg-gray-800/90 text-white'}
        `}>
          {node.data.label}
        </div>
      </Html>
    </motion.group>
  )
}

const ConstellationEdge = ({ 
  start, 
  end,
  animated
}: { 
  start: [number, number, number]
  end: [number, number, number]
  animated?: boolean
}) => {
  const ref = useRef<THREE.Line>(null)
  
  useFrame(({ clock }) => {
    if (animated && ref.current) {
      ref.current.material.opacity = Math.sin(clock.getElapsedTime() * 2) * 0.5 + 0.5
    }
  })

  return (
    <line ref={ref}>
      <bufferGeometry>
        <float32BufferAttribute 
          attach="attributes-position" 
          args={[new Float32Array([...start, ...end]), 3]} 
        />
      </bufferGeometry>
      <lineBasicMaterial 
        color="#4B5563" 
        transparent={animated}
        opacity={animated ? 0.5 : 1}
      />
    </line>
  )
}

const StellarRoadmap: React.FC<StellarRoadmapProps> = ({ nodes, edges }) => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [cameraPosition, setCameraPosition] = useState(new THREE.Vector3(0, 0, 20))
  const controlsRef = useRef<any>()

  // Convert 2D positions to 3D with better spacing
  const nodePositions = new Map(nodes.map(node => [
    node.id,
    [
      node.position.x / 100 - 4,
      -node.position.y / 100 + 4,
      0
    ] as [number, number, number]
  ]))

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId)
    if (controlsRef.current) {
      const position = nodePositions.get(nodeId)
      if (position) {
        controlsRef.current.target.set(...position)
      }
    }
  }

  useEffect(() => {
    const updateCameraPosition = () => {
      if (controlsRef.current) {
        setCameraPosition(controlsRef.current.object.position)
      }
      requestAnimationFrame(updateCameraPosition)
    }
    updateCameraPosition()
  }, [])

  return (
    <div className="w-full h-[800px] bg-gray-950 rounded-lg overflow-hidden">
      <Canvas>
        <color attach="background" args={['#030712']} />
        
        <PerspectiveCamera makeDefault position={[0, 0, 20]} />
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

        {edges.map(edge => (
          <ConstellationEdge
            key={edge.id}
            start={nodePositions.get(edge.source) || [0, 0, 0]}
            end={nodePositions.get(edge.target) || [0, 0, 0]}
            animated={edge.animated}
          />
        ))}

        {nodes.map(node => (
          <StellarNode
            key={node.id}
            node={node}
            position={nodePositions.get(node.id) || [0, 0, 0]}
            isActive={node.id === activeNode}
            onClick={() => handleNodeClick(node.id)}
          />
        ))}

        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          minDistance={5}
          maxDistance={50}
        />
        
        <Controls />
        <Minimap nodes={nodes} currentPosition={cameraPosition} />
      </Canvas>
    </div>
  )
}

export default StellarRoadmap
