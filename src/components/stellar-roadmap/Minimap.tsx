import React, { useEffect, useRef } from 'react';
import { Node as FlowNode, Edge } from '@xyflow/react';
import { motion } from 'framer-motion';
import * as THREE from 'three';

interface MinimapProps {
  nodes: FlowNode[];
  edges: Edge[];
  nodePositions: Map<string, [number, number, number]>;
  activeNode: string | null;
  camera?: THREE.Camera;
  controls?: any;
}

const Minimap: React.FC<MinimapProps> = ({ 
  nodes, 
  edges, 
  nodePositions, 
  activeNode,
  camera,
  controls 
}) => {
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
    
    return [
      padding + (x - minX) * scale,
      height - (padding + (y - minY) * scale)
    ];
  };

  // Calculate viewport rectangle
  const calculateViewportRect = (
    ctx: CanvasRenderingContext2D, 
    width: number, 
    height: number
  ) => {
    if (!camera || !controls) return null;

    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    camera.updateMatrixWorld();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // Get the corners of the visible area
    const corners: THREE.Vector3[] = [];
    const near = camera.near;
    const far = camera.far;
    const aspect = camera.aspect;
    const fov = camera.fov * (Math.PI / 180);
    
    const nearHeight = 2 * Math.tan(fov / 2) * near;
    const nearWidth = nearHeight * aspect;
    const farHeight = 2 * Math.tan(fov / 2) * far;
    const farWidth = farHeight * aspect;

    // Calculate corners in world space
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const cameraPosition = camera.position.clone();
    const cameraUp = camera.up.clone();
    const cameraRight = new THREE.Vector3().crossVectors(cameraDirection, cameraUp);

    // Project corners to minimap space
    const points = [
      projectToMinimap([
        cameraPosition.x + cameraRight.x * nearWidth/2,
        cameraPosition.y + cameraUp.y * nearHeight/2,
        cameraPosition.z
      ], width, height),
      projectToMinimap([
        cameraPosition.x - cameraRight.x * nearWidth/2,
        cameraPosition.y + cameraUp.y * nearHeight/2,
        cameraPosition.z
      ], width, height),
      projectToMinimap([
        cameraPosition.x - cameraRight.x * nearWidth/2,
        cameraPosition.y - cameraUp.y * nearHeight/2,
        cameraPosition.z
      ], width, height),
      projectToMinimap([
        cameraPosition.x + cameraRight.x * nearWidth/2,
        cameraPosition.y - cameraUp.y * nearHeight/2,
        cameraPosition.z
      ], width, height)
    ];

    // Draw viewport rectangle
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    points.forEach(point => ctx.lineTo(point[0], point[1]));
    ctx.closePath();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.stroke();
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
      
      ctx.beginPath();
      ctx.arc(x, y, node.id === activeNode ? 5 : 3.5, 0, Math.PI * 2);
      
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
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // Draw viewport rectangle
    calculateViewportRect(ctx, canvas.width / scale, canvas.height / scale);

  }, [nodes, edges, nodePositions, activeNode, camera, controls]);

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 1 }}
      animate={{ 
        opacity: 1,
        y: 0
      }}
      transition={{
        duration: 0.3,
        type: "spring",
        stiffness: 260,
        damping: 20
      }}
      className="fixed bottom-4 right-4 w-48 h-36 bg-gray-900/70 rounded-md border border-gray-800 overflow-hidden shadow-lg z-50"
      style={{
        backdropFilter: 'blur(8px)',
        willChange: 'transform',
        transform: 'translateZ(0)',
        position: 'absolute',
        pointerEvents: 'auto'
      }}
    >
      <div className="relative w-full h-full">
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{
            display: 'block',
            position: 'relative',
            zIndex: 1
          }}
        />
      </div>
    </motion.div>
  );
};

export default Minimap;
