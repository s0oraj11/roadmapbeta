import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Html, Stars, Trail } from '@react-three/drei'
import { motion } from 'framer-motion-3d'
import { Node, Edge, MarkerType } from '@xyflow/react'

interface StellarNodeProps {
  node: Node
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
  isPrimary: boolean
}

const NodeGlow = ({ color, scale }: { color: string; scale: number }) => (
  <mesh>
    <sphereGeometry args={[1.2 * scale, 16, 16]} />
    <meshBasicMaterial color={color} transparent opacity={0.3} />
  </mesh>
)

const StellarNode: React.FC<StellarNodeProps> = ({ 
  node, 
  position, 
  isActive, 
  onClick,
  isPrimary 
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const rotationSpeed = useRef(Math.random() * 0.01 + 0.005)
  
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += rotationSpeed.current
    }
  })

  const nodeScale = isPrimary ? 1.2 : 0.8
  const baseColor = isPrimary ? "#FFD700" : "#4B5563"
  const activeColor = isPrimary ? "#FFA500" : "#60A5FA"
  
  return (
    <motion.group
      position={position}
      whileHover={{ scale: 1.1 }}
      animate={{
        scale: isActive ? 1.2 : 1,
      }}
      onClick={onClick}
    >
      {/* Glow effect */}
      {(isActive || isPrimary) && (
        <NodeGlow 
          color={isActive ? activeColor : baseColor} 
          scale={nodeScale}
        />
      )}
      
      {/* Main body */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[nodeScale, 32, 32]} />
        <meshStandardMaterial 
          color={isActive ? activeColor : baseColor}
          metalness={0.8}
          roughness={0.2}
          emissive={isPrimary ? baseColor : "#000000"}
          emissiveIntensity={isPrimary ? 0.5 : 0}
        />
      </mesh>

      {/* Label */}
      <Html distanceFactor={15}>
        <div className={`
          backdrop-blur-sm p-2 rounded-lg text-sm whitespace-nowrap
          ${isPrimary ? 'bg-yellow-500/20 text-yellow-200' : 'bg-gray-800/90 text-white'}
        `}>
          {node.data.label}
        </div>
      </Html>
    </motion.group>
  )
}

interface ConstellationEdgeProps {
  start: [number, number, number]
  end: [number, number, number]
  isHighlighted?: boolean
}

const ConstellationEdge: React.FC<ConstellationEdgeProps> = ({ 
  start, 
  end,
  isHighlighted = false 
}) => {
  const points = useMemo(() => {
    const curve = new THREE.LineCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...end)
    )
    return curve.getPoints(50)
  }, [start, end])

  return (
    <group>
      <line>
        <bufferGeometry>
          <float32BufferAttribute 
            attach="attributes-position" 
            args={[new Float32Array([...start, ...end]), 3]} 
          />
        </bufferGeometry>
        <lineBasicMaterial 
          color={isHighlighted ? "#60A5FA" : "#4B5563"} 
          linewidth={1}
          transparent
          opacity={0.6}
        />
      </line>
      
      {/* Arrow head using small sphere */}
      <mesh position={end}>
        <sphereGeometry args={[0.2, 16, 16]} />
        <meshBasicMaterial 
          color={isHighlighted ? "#60A5FA" : "#4B5563"}
          transparent
          opacity={0.8}
        />
      </mesh>
    </group>
  )
}

interface StellarRoadmapProps {
  nodes: Node[]
  edges: Edge[]
}

const StellarRoadmap: React.FC<StellarRoadmapProps> = ({ nodes, edges }) => {
  const [activeNode, setActiveNode] = useState<string | null>(null)
  const controlsRef = useRef()
  
  // Convert 2D positions to 3D space
  const nodePositions = useMemo(() => new Map(nodes.map(node => [
    node.id,
    [
      node.position.x / 50,
      node.position.y / 50,
      Math.random() * 2 - 1 // Small random Z offset for depth
    ] as [number, number, number]
  ])), [nodes])

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId)
    
    if (controlsRef.current) {
      const position = nodePositions.get(nodeId)
      controlsRef.current.target.set(...position)
    }
  }

  // Determine which edges should be highlighted
  const getEdgeHighlight = (edge: Edge) => {
    return activeNode === edge.source || activeNode === edge.target
  }

  // Determine if a node is a primary node (star vs planet)
  const isPrimaryNode = (nodeId: string) => {
    return edges.filter(e => e.source === nodeId).length > 2
  }

  return (
    <div className="w-full h-[800px] bg-gray-900 rounded-lg overflow-hidden">
      <Canvas camera={{ position: [0, 0, 20], fov: 50 }}>
        <color attach="background" args={['#111827']} />
        
        {/* Ambient lighting */}
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} />
        
        {/* Star field background */}
        <Stars 
          radius={100}
          depth={50}
          count={5000}
          factor={4}
          saturation={0}
          fade
          speed={1}
        />
        
        {/* Constellation edges */}
        {edges.map(edge => (
          <ConstellationEdge
            key={`${edge.source}-${edge.target}`}
            start={nodePositions.get(edge.source)}
            end={nodePositions.get(edge.target)}
            isHighlighted={getEdgeHighlight(edge)}
          />
        ))}
        
        {/* Stellar nodes */}
        {nodes.map(node => (
          <StellarNode
            key={node.id}
            node={node}
            position={nodePositions.get(node.id)}
            isActive={node.id === activeNode}
            onClick={() => handleNodeClick(node.id)}
            isPrimary={isPrimaryNode(node.id)}
          />
        ))}
        
        {/* Controls */}
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          minDistance={5}
          maxDistance={50}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
      
      {/* UI Controls */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 space-x-4">
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

export default StellarRoadmap
