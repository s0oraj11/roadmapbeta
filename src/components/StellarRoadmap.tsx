import React, { useRef, useState, useEffect, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Html, Stars } from '@react-three/drei'
import { motion } from 'framer-motion'
import * as THREE from 'three'
import { Node as FlowNode, Edge as FlowEdge } from '@xyflow/react'

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
  nodes: FlowNode[]
  edges: FlowEdge[]
}

const StellarNode = ({ 
  node,
  position,
  isActive,
  onClick,
  onDrag,
  isLocked,
  onSelect,
  onDragStart,
}: { 
  node: NodeType
  position: [number, number, number]
  isActive: boolean
  onClick: () => void
  onDrag: (position: [number, number, number]) => void
  isLocked: boolean
  onSelect: () => void
  onDragStart: () => void
}) => {
  const meshRef = useRef<THREE.Mesh>(null)
  const { camera } = useThree()
  const isPrimary = node.className === 'start-node'
  const isPattern = node.className === 'pattern-node'
  const dragging = useRef(false)
  const previousPosition = useRef([0, 0])
  const velocity = useRef([0, 0])
  const lastTime = useRef(Date.now())
  
  useFrame(() => {
    if (meshRef.current && !isLocked) {
      meshRef.current.rotation.y += 0.01
    }
  })

  const nodeScale = isPrimary ? 1.2 : isPattern ? 1 : 0.8
  const nodeColor = isPrimary ? "#FFD700" : isPattern ? "#6366F1" : "#4B5563"

  const handlePointerDown = useCallback((e: THREE.Event<PointerEvent>) => {
    e.stopPropagation()
    dragging.current = true
    document.body.style.cursor = 'grabbing'
    previousPosition.current = [e.clientX, e.clientY]
    velocity.current = [0, 0]
    lastTime.current = Date.now()
    onDragStart()
  }, [onDragStart])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!dragging.current) return

    const currentTime = Date.now()
    const deltaTime = (currentTime - lastTime.current) / 1000
    lastTime.current = currentTime

    const x = (e.clientX - previousPosition.current[0])
    const y = -(e.clientY - previousPosition.current[1])

    velocity.current = [
      x / deltaTime,
      y / deltaTime
    ]

    const smoothingFactor = 0.2
    const smoothedX = x * smoothingFactor
    const smoothedY = y * smoothingFactor

    const newPosition: [number, number, number] = [
      position[0] + smoothedX / 100,
      position[1] + smoothedY / 100,
      position[2]
    ]

    onDrag(newPosition)
    previousPosition.current = [e.clientX, e.clientY]
  }, [position, onDrag])

  const handlePointerUp = useCallback(() => {
    if (!dragging.current) return

    dragging.current = false
    document.body.style.cursor = isLocked ? 'grab' : 'auto'

    const applyInertia = () => {
      if (Math.abs(velocity.current[0]) < 0.01 && Math.abs(velocity.current[1]) < 0.01) return

      const dampingFactor = 0.95
      velocity.current = [
        velocity.current[0] * dampingFactor,
        velocity.current[1] * dampingFactor
      ]

      const newPosition: [number, number, number] = [
        position[0] + velocity.current[0] / 1000,
        position[1] + velocity.current[1] / 1000,
        position[2]
      ]

      onDrag(newPosition)

      if (Math.abs(velocity.current[0]) > 0.01 || Math.abs(velocity.current[1]) > 0.01) {
        requestAnimationFrame(applyInertia)
      }
    }

    if (isLocked) {
      requestAnimationFrame(applyInertia)
    }
  }, [position, onDrag, isLocked])

  useEffect(() => {
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])
  
  return (
    <group
      position={position}
      onClick={(e) => {
        e.stopPropagation()
        if (!isLocked) {
          onClick()
          onSelect()
        }
      }}
      onPointerEnter={() => {
        document.body.style.cursor = isLocked ? 'grab' : 'pointer'
      }}
      onPointerLeave={() => {
        if (!dragging.current) {
          document.body.style.cursor = 'auto'
        }
      }}
      onPointerDown={handlePointerDown}
    >
      <mesh 
        ref={meshRef}
        scale={isActive ? 1.2 : 1}
      >
        <sphereGeometry args={[nodeScale, 32, 32]} />
        <meshStandardMaterial 
          color={isActive ? "#60A5FA" : nodeColor}
          metalness={0.8}
          roughness={0.2}
          emissive={isPrimary || isPattern ? nodeColor : "#000000"}
          emissiveIntensity={isPrimary ? 0.5 : isPattern ? 0.3 : 0}
        />
      </mesh>
      <Html 
        center 
        distanceFactor={15}
        style={{ 
          cursor: isLocked ? 'grab' : 'pointer',
          pointerEvents: 'none',
          userSelect: 'none'
        }}
      >
        <div className={`
          px-3 py-1.5 rounded-lg text-sm whitespace-nowrap
          ${node.className === 'start-node' 
            ? 'bg-yellow-500/20 text-yellow-200' 
            : node.className === 'pattern-node'
            ? 'bg-indigo-500/20 text-indigo-200'
            : 'bg-gray-800/90 text-white'}
        `}>
          {node.data.label}
        </div>
      </Html>
    </group>
  )
}

const ConstellationEdge = ({ 
  start, 
  end,
  animated,
  isLocked,
  onDrag,
}: { 
  start: [number, number, number]
  end: [number, number, number]
  animated?: boolean
  isLocked: boolean
  onDrag: (startDelta: [number, number, number]) => void
}) => {
  const ref = useRef<THREE.Line>(null)
  const dragging = useRef(false)
  const previousPosition = useRef([0, 0])
  const lastDelta = useRef([0, 0])
  const velocity = useRef([0, 0])
  const lastTime = useRef(Date.now())
  const animationFrame = useRef<number>()
  
  useFrame(({ clock }) => {
    if (animated && ref.current?.material) {
      (ref.current.material as THREE.Material).opacity = Math.sin(clock.getElapsedTime() * 2) * 0.5 + 0.5
    }
  })

  const applyInertia = useCallback(() => {
    if (Math.abs(velocity.current[0]) < 0.01 && Math.abs(velocity.current[1]) < 0.01) return

    const dampingFactor = 0.95
    velocity.current = [
      velocity.current[0] * dampingFactor,
      velocity.current[1] * dampingFactor
    ]

    const delta: [number, number, number] = [
      velocity.current[0] / 1000,
      velocity.current[1] / 1000,
      0
    ]

    onDrag(delta)

    if (Math.abs(velocity.current[0]) > 0.01 || Math.abs(velocity.current[1]) > 0.01) {
      animationFrame.current = requestAnimationFrame(applyInertia)
    }
  }, [onDrag])

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragging.current) return

      const currentTime = Date.now()
      const deltaTime = (currentTime - lastTime.current) / 1000
      lastTime.current = currentTime

      const x = (event.clientX - previousPosition.current[0])
      const y = -(event.clientY - previousPosition.current[1])

      velocity.current = [
        (x - lastDelta.current[0]) / deltaTime,
        (y - lastDelta.current[1]) / deltaTime
      ]

      const smoothingFactor = 0.15
      const smoothedX = x * smoothingFactor
      const smoothedY = y * smoothingFactor

      lastDelta.current = [x, y]

      const delta: [number, number, number] = [
        smoothedX / 100,
        smoothedY / 100,
        0
      ]

      onDrag(delta)
      previousPosition.current = [event.clientX, event.clientY]
    }

    const handleMouseUp = () => {
      if (!dragging.current) return

      dragging.current = false
      document.body.style.cursor = isLocked ? 'grab' : 'auto'

      if (isLocked) {
        requestAnimationFrame(applyInertia)
      }

      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    if (dragging.current) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      if (animationFrame.current) {
        cancelAnimationFrame(animationFrame.current)
      }
    }
  }, [onDrag, isLocked, applyInertia])

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
    <line 
      ref={ref} 
      geometry={geometry}
      onPointerEnter={() => {
        if (isLocked) document.body.style.cursor = 'grab'
      }}
      onPointerLeave={() => {
        if (!dragging.current) document.body.style.cursor = 'auto'
      }}
      onPointerDown={(e) => {
        if (isLocked) {
          e.stopPropagation()
          dragging.current = true
          document.body.style.cursor = 'grabbing'
          previousPosition.current = [e.clientX, e.clientY]
          lastDelta.current = [0, 0]
          velocity.current = [0, 0]
          lastTime.current = Date.now()
        }
      }}
    >
      <lineBasicMaterial 
        color={animated ? "#6366F1" : "#4B5563"}
        transparent={animated}
        opacity={animated ? 0.5 : 1}
        linewidth={1}
      />
    </line>
  )
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
  const nodes: NodeType[] = flowNodes.map(node => ({
    id: node.id,
    data: node.data,
    position: node.position,
    className: node.className
  }))
  
  const edges: EdgeType[] = flowEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    animated: edge.animated
  }))

  const [activeNode, setActiveNode] = useState<string | null>(null)
  const controlsRef = useRef<any>()
  const [camera, setCamera] = useState<THREE.Camera | null>(null)
  const initialCameraPosition = useRef<THREE.Vector3 | null>(null)
  
  const [nodePositions, setNodePositions] = useState(new Map(nodes.map(node => [
    node.id,
    [
      node.position.x / 25 - 8,
      node.position.y / 25 + 8,
      0
    ] as [number, number, number]
  ])))

  const [selectedNode, setSelectedNode] = useState<string | null>(null)
  const [isLocked, setIsLocked] = useState(false)
  const [dragInitialPositions, setDragInitialPositions] = useState<Map<string, [number, number, number]>>(new Map())

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

  const handleNodeDragStart = useCallback(() => {
    if (isLocked) {
      setDragInitialPositions(new Map(nodePositions))
    }
  }, [nodePositions, isLocked])

  const handleNodeDrag = useCallback((nodeId: string, newPosition: [number, number, number]) => {
    if (isLocked) {
      setNodePositions(prev => {
        const updated = new Map(prev)
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
        return updated
      })
    } else {
      setNodePositions(prev => {
        const updated = new Map(prev)
        updated.set(nodeId, newPosition)
        return updated
      })
    }
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
    }
  }, [camera])

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
    if (isLocked) {
      document.body.style.cursor = 'grab'
    } else {
      document.body.style.cursor = 'auto'
    }
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
                onDragStart={handleNodeDragStart}
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
