import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Stars } from '@react-three/drei'
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

// Node dragging context
const DragContext = React.createContext<{
  isDragging: boolean;
  setIsDragging: (value: boolean) => void;
}>({
  isDragging: false,
  setIsDragging: () => {},
});

const StellarNode = ({ 
  node,
  position,
  isActive,
  onClick,
  onDragStart,
  onDrag,
  onDragEnd,
}: { 
  node: NodeType
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
  onDragStart: () => void
  onDrag: (position: [number, number, number]) => void
  onDragEnd: () => void
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { isDragging } = React.useContext(DragContext)
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
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      whileHover={{ scale: 1.1 }}
      animate={{ scale: isActive ? 1.2 : 1 }}
      drag={!isDragging}
      dragConstraints={null}
      onDragStart={onDragStart}
      onDrag={(event, info) => {
        const newPosition: [number, number, number] = [
          position[0] + info.offset.x / 100,
          position[1] - info.offset.y / 100,
          position[2]
        ]
        onDrag(newPosition)
      }}
      onDragEnd={onDragEnd}
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
      <Html center distanceFactor={15}>
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

  const direction = new THREE.Vector3(
    end[0] - start[0],
    end[1] - start[1],
    end[2] - start[2]
  )
  
  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      ((start[2] + end[2]) / 2) + direction.length() * 0.2
    ),
    new THREE.Vector3(...end)
  )

  const points = curve.getPoints(50)
  const geometry = new THREE.BufferGeometry().setFromPoints(points)

  return (
    <line ref={ref} geometry={geometry}>
      <lineBasicMaterial 
        color="#4B5563" 
        transparent={animated}
        opacity={animated ? 0.5 : 1}
        linewidth={1}
      />
    </line>
  )
}

const StellarRoadmap: React.FC<StellarRoadmapProps> = ({ nodes, edges }) => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [nodePositions, setNodePositions] = useState(new Map(nodes.map(node => [
    node.id,
    [
      node.position.x / 50 - 8,
      -node.position.y / 50 + 8,
      0
    ] as [number, number, number]
  ])))
  
  const controlsRef = useRef<any>()

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId)
  }

  const handleNodeDrag = (nodeId: string, newPosition: [number, number, number]) => {
    setNodePositions(prev => new Map(prev).set(nodeId, newPosition))
  }

  const updateMinimapPositions = useCallback(() => {
    const minimapNodes = nodes.map(node => ({
      ...node,
      position: {
        x: (nodePositions.get(node.id)?.[0] ?? 0) * 50 + 400,
        y: -(nodePositions.get(node.id)?.[1] ?? 0) * 50 + 400
      }
    }))
    return minimapNodes
  }, [nodes, nodePositions])

  return (
    <DragContext.Provider value={{ isDragging, setIsDragging }}>
      <div className="relative w-full h-[800px] bg-gray-950 rounded-lg overflow-hidden">
        <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-gray-800/80 p-2 rounded-lg border border-gray-700">
          <button
            onClick={() => controlsRef.current?.zoomIn()}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button
            onClick={() => controlsRef.current?.zoomOut()}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
            </svg>
          </button>
          <button
            onClick={() => controlsRef.current?.reset()}
            className="p-2 hover:bg-gray-700 rounded"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
            </svg>
          </button>
        </div>

        <div className="absolute bottom-4 right-4 z-10 w-48 h-48 bg-gray-800/80 rounded-lg border border-gray-700 p-2">
          <div className="relative w-full h-full">
            {updateMinimapPositions().map(node => (
              <div
                key={node.id}
                className={`absolute w-2 h-2 rounded-full ${
                  node.id === activeNode ? 'bg-blue-400' : 'bg-gray-400'
                }`}
                style={{
                  left: `${(node.position.x / 800) * 100}%`,
                  top: `${(node.position.y / 800) * 100}%`,
                }}
              />
            ))}
          </div>
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
                  isActive={node.id === activeNode}
                  onClick={() => handleNodeClick(node.id)}
                  onDragStart={() => setIsDragging(true)}
                  onDrag={(newPos) => handleNodeDrag(node.id, newPos)}
                  onDragEnd={() => setIsDragging(false)}
                />
              )
            }
            return null
          })}

          <OrbitControls
            ref={controlsRef}
            enablePan={true}
            enableZoom={true}
            minDistance={5}
            maxDistance={100}
            makeDefault
          />
        </Canvas>
      </div>
    </DragContext.Provider>
  )
}

export default StellarRoadmap

