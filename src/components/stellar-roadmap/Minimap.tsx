import React, { useEffect, useRef } from 'react';
import { Node as FlowNode } from '@xyflow/react';
import { motion } from 'framer-motion';

interface MinimapProps {
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodePositions: Map<string, [number, number, number]>;
  activeNode: string | null;
}

const Minimap: React.FC<MinimapProps> = ({ nodes, nodePositions, activeNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert 3D positions to 2D minimap coordinates with reversed Y axis
  const projectToMinimap = (position: [number, number, number], width: number, height: number): [number, number] => {
    const [x, y] = position;
    const padding = 30;
    
    // Find bounds of all nodes
    const positions = Array.from(nodePositions.values());
    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minY = Math.min(...positions.map(p => p[1]));
    const maxY = Math.max(...positions.map(p => p[1]));
    
    // Scale to fit within minimap with padding
    const scaleX = (width - 2 * padding) / (maxX - minX);
    const scaleY = (height - 2 * padding) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);
    
    // Flip the Y coordinate by subtracting from height
    return [
      padding + (x - minX) * scale,
      height - (padding + (y - minY) * scale) // Flip Y coordinate
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with higher resolution for crisp rendering
    const scale = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * scale;
    canvas.height = container.clientHeight * scale;
    ctx.scale(scale, scale);

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

    // Draw connecting lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    edges.forEach(edge => {
      const startPos = nodePositions.get(edge.source);
      const endPos = nodePositions.get(edge.target);
      
      if (startPos && endPos) {
        const [startX, startY] = projectToMinimap(startPos, canvas.width / scale, canvas.height / scale);
        const [endX, endY] = projectToMinimap(endPos, canvas.width / scale, canvas.height / scale);
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });

    // Draw nodes as planets
    nodes.forEach(node => {
      const position = nodePositions.get(node.id);
      if (!position) return;

      const [x, y] = projectToMinimap(position, canvas.width / scale, canvas.height / scale);
      
      // Draw planet
      ctx.beginPath();
      ctx.arc(x, y, node.id === activeNode ? 5 : 3.5, 0, Math.PI * 2);
      
      // Different colors for different node types
      if (node.id === 'start') {
        ctx.fillStyle = '#fbbf24'; // Yellow for start node
      } else if (node.className?.includes('pattern')) {
        ctx.fillStyle = '#818cf8'; // Purple for pattern nodes
      } else {
        ctx.fillStyle = '#22d3ee'; // Cyan for other nodes
      }
      
      ctx.fill();
      
      // Highlight active node
      if (node.id === activeNode) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

  }, [nodes, edges, nodePositions, activeNode]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 1 }} // Changed from 0 to 1
      animate={{ 
        opacity: 1,
        y: 0    // Ensure it stays in position
      }}
      transition={{
        duration: 0.3,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      className="fixed bottom-4 right-4 w-48 h-36 bg-gray-900/70 rounded-md border border-gray-800 overflow-hidden shadow-lg z-50" // Added z-50 and changed absolute to fixed
      style={{
        backdropFilter: 'blur(8px)',
        willChange: 'transform', // Optimize performance
        transform: 'translateZ(0)', // Force GPU acceleration
        position: 'absolute', // Explicitly set position
        pointerEvents: 'auto'
      }}
    >
      <div className="relative w-full h-full"> {/* Added wrapper div */}
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          display: 'block',
          position: 'relative', // Ensure canvas stays within container
          zIndex: 1
        }}
      />
      </div>
    </motion.div>
  );
};

export default Minimap;
