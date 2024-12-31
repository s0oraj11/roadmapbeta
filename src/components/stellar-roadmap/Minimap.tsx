import React, { useEffect, useRef } from 'react';
import { Node as FlowNode } from '@xyflow/react';
import { motion } from 'framer-motion';

interface MinimapProps {
  nodes: FlowNode[];
  nodePositions: Map<string, [number, number, number]>;
  activeNode: string | null;
}

const Minimap: React.FC<MinimapProps> = ({ nodes, nodePositions, activeNode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert 3D positions to 2D minimap coordinates
  const projectToMinimap = (position: [number, number, number], width: number, height: number): [number, number] => {
    const [x, y] = position;
    const padding = 20;
    
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
    
    return [
      padding + (x - minX) * scale,
      padding + (y - minY) * scale
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;

    // Clear canvas
    ctx.fillStyle = '#030712';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw connecting lines
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth = 1;
    nodes.forEach(node => {
      const startPos = nodePositions.get(node.id);
      if (!startPos) return;

      const [startX, startY] = projectToMinimap(startPos, canvas.width, canvas.height);
      
      // Draw connections based on node relationships
      nodes.forEach(targetNode => {
        const endPos = nodePositions.get(targetNode.id);
        if (!endPos) return;

        const [endX, endY] = projectToMinimap(endPos, canvas.width, canvas.height);
        
        ctx.beginPath();
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      });
    });

    // Draw nodes as planets
    nodes.forEach(node => {
      const position = nodePositions.get(node.id);
      if (!position) return;

      const [x, y] = projectToMinimap(position, canvas.width, canvas.height);
      
      // Draw planet
      ctx.beginPath();
      ctx.arc(x, y, node.id === activeNode ? 6 : 4, 0, Math.PI * 2);
      
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
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

  }, [nodes, nodePositions, activeNode]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute top-4 right-4 w-64 h-48 bg-gray-900/80 rounded-lg border border-gray-700 overflow-hidden"
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
    </motion.div>
  );
};

export default Minimap;
