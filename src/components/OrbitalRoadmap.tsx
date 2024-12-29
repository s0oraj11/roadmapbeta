import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import { motion } from 'framer-motion-3d';
import { Node, Edge } from '@xyflow/react';

interface RoadmapNodeProps {
  node: Node;
  position: [number, number, number];
  isActive: boolean;
  onClick: () => void;
}

const RoadmapNode: React.FC<RoadmapNodeProps> = ({ node, position, isActive, onClick }) => {
  const meshRef = useRef();
  
  return (
    <motion.mesh
      ref={meshRef}
      position={position}
      onClick={onClick}
      whileHover={{ scale: 1.1 }}
      animate={{
        scale: isActive ? 1.2 : 1,
      }}
    >
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial 
        color={isActive ? "#60A5FA" : "#4B5563"}
        metalness={0.5}
        roughness={0.5}
      />
      <Html distanceFactor={10}>
        <div className="bg-gray-800/90 backdrop-blur-sm p-2 rounded-lg text-white text-sm">
          {node.data.label}
        </div>
      </Html>
    </motion.mesh>
  );
};

interface RoadmapEdgeProps {
  start: [number, number, number];
  end: [number, number, number];
}

const RoadmapEdge: React.FC<RoadmapEdgeProps> = ({ start, end }) => {
  return (
    <line>
      <bufferGeometry attach="geometry">
        <float32BufferAttribute attach="attributes-position" args={[new Float32Array([...start, ...end]), 3]} />
      </bufferGeometry>
      <lineBasicMaterial attach="material" color="#6B7280" linewidth={1} />
    </line>
  );
};

interface OrbitalRoadmapProps {
  nodes: Node[];
  edges: Edge[];
}

const OrbitalRoadmap: React.FC<OrbitalRoadmapProps> = ({ nodes, edges }) => {
  const [activeNode, setActiveNode] = useState<string | null>(null);
  const controlsRef = useRef();
  
  // Convert 2D positions to 3D
  const nodePositions = new Map(nodes.map(node => [
    node.id,
    [
      node.position.x / 100,
      node.position.y / 100,
      0
    ] as [number, number, number]
  ]));

  const handleNodeClick = (nodeId: string) => {
    setActiveNode(nodeId);
    
    if (controlsRef.current) {
      const position = nodePositions.get(nodeId);
      controlsRef.current.target.set(...position);
    }
  };

  return (
    <div className="w-full h-screen">
      <Canvas camera={{ position: [0, 0, 50], fov: 50 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        
        {/* Nodes */}
        {nodes.map(node => (
          <RoadmapNode
            key={node.id}
            node={node}
            position={nodePositions.get(node.id)}
            isActive={node.id === activeNode}
            onClick={() => handleNodeClick(node.id)}
          />
        ))}
        
        {/* Edges */}
        {edges.map(edge => (
          <RoadmapEdge
            key={`${edge.source}-${edge.target}`}
            start={nodePositions.get(edge.source)}
            end={nodePositions.get(edge.target)}
          />
        ))}
        
        <OrbitControls
          ref={controlsRef}
          enablePan={true}
          enableZoom={true}
          minDistance={10}
          maxDistance={100}
        />
      </Canvas>
      
      {/* UI Controls */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2">
        <button
          onClick={() => setActiveNode(null)}
          className="bg-gray-800/80 text-white px-4 py-2 rounded-full"
        >
          Reset View
        </button>
      </div>
    </div>
  );
};

export default OrbitalRoadmap;
