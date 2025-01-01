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
}

const Minimap: React.FC<MinimapProps> = ({ nodes, edges, nodePositions, activeNode, camera }) => {
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

  // Calculate viewport corners in world space
  const calculateViewportCorners = (camera: THREE.Camera, width: number, height: number) => {
    if (!camera) return null;

    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
    frustum.setFromProjectionMatrix(projScreenMatrix);

    // Get the camera's view direction and right vector
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);

    // Calculate the camera's field of view
    const fovY = camera.fov * Math.PI / 180;
    const fovX = 2 * Math.atan(Math.tan(fovY / 2) * camera.aspect);

    // Calculate the distances to the viewport corners
    const distance = camera.position.length();
    const heightAtDistance = 2 * distance * Math.tan(fovY / 2);
    const widthAtDistance = heightAtDistance * camera.aspect;

    // Calculate the corners
    const center = camera.position.clone().add(direction.multiplyScalar(distance));
    const topLeft = center.clone()
      .add(up.multiplyScalar(heightAtDistance / 2))
      .sub(right.multiplyScalar(widthAtDistance / 2));
    const bottomRight = center.clone()
      .sub(up.multiplyScalar(heightAtDistance / 2))
      .add(right.multiplyScalar(widthAtDistance / 2));

    return {
      topLeft: [topLeft.x, topLeft.y, topLeft.z],
      bottomRight: [bottomRight.x, bottomRight.y, bottomRight.z]
    };
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

    // Draw nodes
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

    // Draw viewport rectangle if camera is available
    if (camera) {
      const viewport = calculateViewportCorners(camera, canvas.width / scale, canvas.height / scale);
      if (viewport) {
        const [topLeftX, topLeftY] = projectToMinimap(viewport.topLeft as [number, number, number], canvas.width / scale, canvas.height / scale);
        const [bottomRightX, bottomRightY] = projectToMinimap(viewport.bottomRight as [number, number, number], canvas.width / scale, canvas.height / scale);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.strokeRect(
          topLeftX,
          topLeftY,
          bottomRightX - topLeftX,
          bottomRightY - topLeftY
        );
        ctx.setLineDash([]);
      }
    }

  }, [nodes, edges, nodePositions, activeNode, camera]);

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
