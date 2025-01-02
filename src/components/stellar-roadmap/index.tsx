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
import Minimap from './minimap/index'

interface StellarRoadmapProps {
  nodes: FlowNode[]
  edges: FlowEdge[]
}


const CameraController = ({ onCameraReady }: { onCameraReady: (camera: THREE.Camera) => void }) => {
  const { camera, scene } = useThree()
  const initialSetupDone = useRef(false)
  
  // Calculate optimal camera settings based on scene content
  const calculateOptimalView = useCallback(() => {
    // Calculate scene bounds including all nodes
    const box = new THREE.Box3().setFromObject(scene)
    const size = box.getSize(new THREE.Vector3())
    const center = box.getCenter(new THREE.Vector3())
    
    // Calculate optimal distance based on scene size and aspect ratio
    const aspectRatio = window.innerWidth / window.innerHeight
    const maxDimension = Math.max(size.x, size.y, size.z)
    const fov = camera.fov * (Math.PI / 180)
    
    // Add padding factor for consistent spacing
    const paddingFactor = 1.2
    
    // Calculate base distance needed to fit scene
    let distance = (maxDimension / 2) / Math.tan(fov / 2) * paddingFactor
    
    // Adjust for aspect ratio
    if (aspectRatio < 1) {
      // Mobile/portrait: need more distance to fit width
      distance *= (1 + (1 - aspectRatio))
    }
    
    // Ensure distance is within bounds
    distance = Math.max(
      Math.min(distance, CAMERA_SETTINGS.MAX_DISTANCE * 0.5),
      CAMERA_SETTINGS.MIN_DISTANCE * 2
    )
    
    return { center, distance }
  }, [camera, scene])

  // Initial setup
  useEffect(() => {
    if (!initialSetupDone.current) {
      const setupCamera = () => {
        const { center, distance } = calculateOptimalView()
        
        // Position camera for top-down view with slight angle
        camera.position.set(
          center.x,
          center.y + distance * 0.3, // Add elevation for perspective
          center.z + distance
        )
        
        camera.lookAt(center)
        camera.updateProjectionMatrix()
        
        // Update orbit controls if available
        if (scene.userData.controls) {
          scene.userData.controls.target.set(center.x, center.y, center.z)
          scene.userData.controls.update()
        }
        
        onCameraReady(camera)
        initialSetupDone.current = true
      }
      
      // Wait for scene to be ready
      requestAnimationFrame(() => {
        setupCamera()
      })
    }
  }, [camera, scene, calculateOptimalView, onCameraReady])

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      if (initialSetupDone.current) {
        const { center, distance } = calculateOptimalView()
        
        // Smoothly update camera position
        const newPosition = new THREE.Vector3(
          center.x,
          center.y + distance * 0.3,
          center.z + distance
        )
        
        camera.position.lerp(newPosition, 0.5)
        camera.lookAt(center)
        camera.updateProjectionMatrix()
        
        if (scene.userData.controls) {
          scene.userData.controls.target.set(center.x, center.y, center.z)
          scene.userData.controls.update()
        }
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [camera, scene, calculateOptimalView])

  // Ensure proper cleanup
  useEffect(() => {
    return () => {
      initialSetupDone.current = false
    }
  }, [])

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
  if (controlsRef.current && camera) {
    // Calculate bounding box of all nodes
    const positions = Array.from(nodePositions.values());
    const bbox = new THREE.Box3();
    positions.forEach(pos => {
      bbox.expandByPoint(new THREE.Vector3(...pos));
    });
    
    // Calculate ideal camera position
    const size = bbox.getSize(new THREE.Vector3());
    const center = bbox.getCenter(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y);
    const fov = camera.fov * (Math.PI / 180);
    const distance = Math.max(maxDim / Math.tan(fov / 2) * 1.5, CAMERA_SETTINGS.MIN_DISTANCE);
    
    // Set new camera position
    camera.position.set(center.x, center.y, distance);
    controlsRef.current.target.set(center.x, center.y, 0);
    camera.lookAt(center.x, center.y, 0);
    camera.updateProjectionMatrix();
    controlsRef.current.update();
    
    setActiveNode(null);
    setSelectedNode(null);
    setNodePositions(calculateNodePositions(nodes));
  }
}, [camera, nodes, nodePositions]);

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
      className="relative w-full h-full rounded-lg overflow-hidden bg-gray-950"
    >
      <ControlButtons 
        isLocked={isLocked}
        setIsLocked={setIsLocked}
        handleZoom={handleZoom}
        handleReset={handleReset}
      />
      <Minimap 
        nodes={nodes}
        edges={edges} 
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
