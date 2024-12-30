import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react'
import { StellarNode } from './StellarNode'
import { ConstellationEdge } from './ConstellationEdge'

interface StellarRoadmapProps {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const CameraController = ({ onCameraReady }: { onCameraReady: (camera: THREE.Camera) => void }) => {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(0, 0, 15)
    onCameraReady(camera)
  }, [camera, onCameraReady])
  
  return null
}

const StellarRoadmap: React.FC<StellarRoadmapProps> = ({ nodes: flowNodes, edges: flowEdges }) => {
  const nodes = useMemo(() => flowNodes.map(node => ({
    id: node.id,
    data: node.data,
    position: node.position,
    className: node.className
  })), [flowNodes])
  
  const edges = useMemo(() => flowEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.animated
  })), [flowEdges])

  const [activeNode, setActiveNode] = useState<string | null>(null)
  const controlsRef = useRef<any>()
  const [camera, setCamera] = useState<THREE.Camera | null>(null)
  const initialCameraPosition = useRef<THREE.Vector3 | null>(null)
  
  const [nodePositions, setNodePositions] = useState(() => new Map(nodes.map(node => [
    node.id,
    [
      node.position.x / 25 - 8,
      node.position.y / 25 + 8,
      0
    ] as [number, number, number]
  ])))

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

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

  const handleNodeSelect = useCallback((nodeId: string) => {
    if (controlsRef.current && camera && !isLocked) {
      const position = nodePositions.get(nodeId)
      if (position) {
        const offset = new THREE.Vector3(
          camera.position.x - position[0],
          camera.position.y - position[1],
          camera.position.z - position[2]
        )
        
        controlsRef.current.target.set(...position)
        camera.position.set(
          position[0] + offset.x,
          position[1] + offset.y,
          position[2] + offset.z
        )
        camera.updateProjectionMatrix()
        controlsRef.current.update()
      }
    }
  }, [nodePositions, camera, isLocked])

  const handleNodeDrag = useCallback((nodeId: string, newPosition: [number, number, number]) => {
    setNodePositions(prev => {
      const updated = new Map(prev)
      if (isLocked) {
        const delta = [
          newPosition[0] - (prev.get(nodeId)?.[0] ?? 0),
          newPosition[1] - (prev.get(nodeId)?.[1] ?? 0),
          newPosition[2] - (prev.get(nodeId)?.[2] ?? 0),
        ]
        prev.forEach((pos, id) => {
          updated.set(id, [
            pos[0] + delta[0],
            pos[1] + delta[1],
            pos[2] + delta[2]
          ])
        })
      } else {
        updated.set(nodeId, newPosition)
      }
      return updated
    })
  }, [isLocked])

  const handleEdgeDrag = useCallback((delta: [number, number, number]) => {
    if (isLocked) {
      setNodePositions(prev => {
        const updated = new Map()
        prev.forEach((pos, id) => {
          updated.set(id, [
            pos[0] + delta[0],
            pos[1] + delta[1],
            pos[2] + delta[2]
          ])
        })
        return updated
      })
    }
  }, [isLocked])

  const handleZoomIn = useCallback(() => {
    if (controlsRef.current && camera) {
      const zoomFactor = 0.75
      const currentDistance = camera.position.distanceTo(controlsRef.current.target)
      const newDistance = Math.max(currentDistance * zoomFactor, controlsRef.current.minDistance)
      
      const direction = camera.position.clone().sub(controlsRef.current.target).normalize()
      const newPosition = controlsRef.current.target.clone().add(direction.multiplyScalar(newDistance))
      
      camera.position.copy(newPosition)
      camera.updateProjectionMatrix()
      controlsRef.current.update()
    }
  }, [camera])

  const handleZoomOut = useCallback(() => {
    if (controlsRef.current && camera) {
      const zoomFactor = 1.25
      const currentDistance = camera.position.distanceTo(controlsRef.current.target)
      const newDistance = Math.min(currentDistance * zoomFactor, controlsRef.current.maxDistance)
      
      const direction = camera.position.clone().sub(controlsRef.current.target).normalize()
      const newPosition = controlsRef.current.target.clone().add(direction.multiplyScalar(newDistance))
      
      camera.position.copy(newPosition)
      camera.updateProjectionMatrix()
      controlsRef.current.update()
    }
  }, [camera])

  const handleReset = useCallback(() => {
    if (controlsRef.current && initialCameraPosition.current && camera) {
      camera.position.copy(initialCameraPosition.current)
      controlsRef.current.target.set(0, 0, 0)
      camera.updateProjectionMatrix()
      controlsRef.current.update()
      setActiveNode(null)
      setSelectedNode(null)
      setNodePositions(new Map(nodes.map(node => [
        node.id,
        [
          node.position.x / 25 - 8,
          node.position.y / 25 + 8,
          0
        ] as [number, number, number]
      ])))
    }
  }, [camera, nodes])

  const handleCameraReady = useCallback((camera: THREE.Camera) => {
    setCamera(camera)
    if (!initialCameraPosition.current) {
      initialCameraPosition.current = new THREE.Vector3(0, 0, 15)
    }
  }, [])

  const updateMinimapPositions = useCallback(() => {
    return nodes.map(node => ({
      ...node,
      position: {
        x: (nodePositions.get(node.id)?.[0] ?? 0) * 50 + 400,
        y: -(nodePositions.get(node.id)?.[1] ?? 0) * 50 + 400
      }
    }))
  }, [nodes, nodePositions])

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
      <div className="absolute bottom-4 left-4 z-10 flex flex-col gap-2 bg-gray-800/80 p-2 rounded-lg border border-gray-700">
        <button
          onClick={() => setIsLocked(!isLocked)}
          className="p-2 hover:bg-gray-700 rounded text-white"
          title={isLocked ? "Unlock group drag" : "Lock for group drag"}
        >
          {isLocked ? (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 9.9-1"/>
            </svg>
          )}
        </button>
        <button
          onClick={handleZoomIn}
          className="p-2 hover:bg-gray-700 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 hover:bg-gray-700 rounded"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/>
          </svg>
        </button>
        <button
          onClick={handleReset}
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
