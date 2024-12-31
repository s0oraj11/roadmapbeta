import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react'
import { StellarNode } from './StellarNode'
import { ConstellationEdge } from './ConstellationEdge'
import { NodeType, EdgeType } from './types'
import { 
  CAMERA_SETTINGS, 
  calculateNodePositions,
  updateMinimapPosition,
  calculateNewCameraPosition
} from './utils'
import ControlButtons from './ControlButtons'
import Minimap from './Minimap'

interface StellarRoadmapProps {
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const CameraController = ({ onCameraReady }: { onCameraReady: (camera: THREE.Camera) => void }) => {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(...CAMERA_SETTINGS.INITIAL_POSITION)
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
  const [nodePositions, setNodePositions] = useState(() => calculateNodePositions(nodes))
  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)

  const handleNodeClick = useCallback((nodeId: string) => {
    if (!isLocked) {
      setActiveNode(nodeId)
      setSelectedNode(nodeId)
      const position = nodePositions.get(nodeId)
      if (position && controlsRef.current) {
        controlsRef.current.target.set(...position)
        controlsRef.current.update()
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
        const delta = newPosition.map((val, i) => val - (prev.get(nodeId)?.[i] ?? 0)) as [number, number, number]
        prev.forEach((pos, id) => {
          updated.set(id, pos.map((val, i) => val + delta[i]) as [number, number, number])
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
          updated.set(id, pos.map((val, i) => val + delta[i]) as [number, number, number])
        })
        return updated
      })
    }
  }, [isLocked])

  const handleZoom = useCallback((zoomIn: boolean) => {
    if (controlsRef.current && camera) {
      const factor = zoomIn ? CAMERA_SETTINGS.ZOOM_IN_FACTOR : CAMERA_SETTINGS.ZOOM_OUT_FACTOR
      const currentDistance = camera.position.distanceTo(controlsRef.current.target)
      const newDistance = Math.min(
        Math.max(currentDistance * factor, CAMERA_SETTINGS.MIN_DISTANCE),
        CAMERA_SETTINGS.MAX_DISTANCE
      )
      
      const newPosition = calculateNewCameraPosition(
        camera,
        controlsRef.current.target.toArray() as [number, number, number],
        controlsRef.current.target,
        newDistance
      )
      
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
      setNodePositions(calculateNodePositions(nodes))
    }
  }, [camera, nodes])

  const handleCameraReady = useCallback((camera: THREE.Camera) => {
    setCamera(camera)
    if (!initialCameraPosition.current) {
      initialCameraPosition.current = new THREE.Vector3(...CAMERA_SETTINGS.INITIAL_POSITION)
    }
  }, [])

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
      <ControlButtons 
        isLocked={isLocked}
        setIsLocked={setIsLocked}
        handleZoom={handleZoom}
        handleReset={handleReset}
      />
      <Minimap 
        nodes={nodes}
        nodePositions={nodePositions}
        activeNode={activeNode}
        camera={camera}
        controls={controlsRef.current}
        />

      <Canvas>
        <CameraController onCameraReady={handleCameraReady} />
        <color attach="background" args={['#030712']} />
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <Stars radius={100} depth={50} count={5000} factor={4} fade speed={1} />

        {edges.map(edge => {
          const startPos = nodePositions.get(edge.source)
          const endPos = nodePositions.get(edge.target)
          return startPos && endPos && (
            <ConstellationEdge
              key={edge.id}
              start={startPos}
              end={endPos}
              animated={edge.animated}
              isLocked={isLocked}
              onDrag={handleEdgeDrag}
            />
          )
        })}

        {nodes.map(node => {
          const position = nodePositions.get(node.id)
          return position && (
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
        })}

        <OrbitControls
          ref={controlsRef}
          enablePan={!isLocked}
          enableRotate={!isLocked}
          enableZoom={true}
          minDistance={CAMERA_SETTINGS.MIN_DISTANCE}
          maxDistance={CAMERA_SETTINGS.MAX_DISTANCE}
          makeDefault
        />
      </Canvas>
    </motion.div>
  )
}

export default StellarRoadmap
