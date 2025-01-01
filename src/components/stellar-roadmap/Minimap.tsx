import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

const SpaceMinimap = ({ nodes, edges, activeNode, viewport }) => {
  const canvasRef = useRef(null);
  
  const renderMinimap = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = 192 * dpr;
    canvas.height = 144 * dpr;
    ctx.scale(dpr, dpr);
    
    // Space background
    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.fillRect(0, 0, 192, 144);
    
    // Calculate bounds for all nodes
    const positions = nodes.map(node => [node.position.x, node.position.y]);
    const bounds = positions.reduce((acc, [x, y]) => ({
      minX: Math.min(acc.minX, x),
      maxX: Math.max(acc.maxX, x),
      minY: Math.min(acc.minY, y),
      maxY: Math.max(acc.maxY, y)
    }), { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity });
    
    // Scale factors with padding
    const padding = 20;
    const availableWidth = 192 - 2 * padding;
    const availableHeight = 144 - 2 * padding;
    
    const scale = Math.min(
      availableWidth / (bounds.maxX - bounds.minX),
      availableHeight / (bounds.maxY - bounds.minY)
    );
    
    // Helper function to convert graph coordinates to minimap coordinates
    const toMinimap = (x, y) => [
      padding + (x - bounds.minX) * scale,
      padding + (y - bounds.minY) * scale
    ];
    
    // Draw edges
    edges.forEach(edge => {
      const source = nodes.find(n => n.id === edge.source);
      const target = nodes.find(n => n.id === edge.target);
      if (source && target) {
        const [startX, startY] = toMinimap(source.position.x, source.position.y);
        const [endX, endY] = toMinimap(target.position.x, target.position.y);
        
        ctx.beginPath();
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.3)';
        ctx.lineWidth = 1;
        ctx.moveTo(startX, startY);
        ctx.lineTo(endX, endY);
        ctx.stroke();
      }
    });
    
    // Draw nodes
    nodes.forEach(node => {
      const [x, y] = toMinimap(node.position.x, node.position.y);
      
      ctx.beginPath();
      ctx.arc(x, y, node.id === activeNode ? 4 : 3, 0, Math.PI * 2);
      
      if (node.id === 'start') {
        ctx.fillStyle = '#fbbf24';
      } else if (node.className?.includes('pattern')) {
        ctx.fillStyle = '#818cf8';
      } else {
        ctx.fillStyle = '#22d3ee';
      }
      
      ctx.fill();
      
      if (node.id === activeNode) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });
    
    // Draw viewport rectangle if viewport data is available
    if (viewport) {
      const { x, y, zoom } = viewport;
      
      // Calculate viewport rectangle in graph coordinates
      const viewportWidth = canvas.width / (zoom * dpr);
      const viewportHeight = canvas.height / (zoom * dpr);
      
      // Convert viewport to minimap coordinates
      const [vpX, vpY] = toMinimap(x, y);
      const vpW = viewportWidth * scale;
      const vpH = viewportHeight * scale;
      
      // Draw viewport rectangle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.lineDashOffset = (Date.now() / 50) % 8;
      
      ctx.beginPath();
      ctx.rect(vpX, vpY, vpW, vpH);
      ctx.stroke();
      
      // Fill viewport area with semi-transparent overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
    }
  };
  
  useEffect(() => {
    const animate = () => {
      renderMinimap();
      requestAnimationFrame(animate);
    };
    
    const animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [nodes, edges, activeNode, viewport]);
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-4 right-4 w-48 h-36 rounded-md border border-gray-800 overflow-hidden shadow-xl z-50"
      style={{
        backdropFilter: 'blur(12px)',
        backgroundColor: 'rgba(15, 23, 42, 0.85)',
      }}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{ display: 'block' }}
      />
    </motion.div>
  );
};

export default SpaceMinimap;
