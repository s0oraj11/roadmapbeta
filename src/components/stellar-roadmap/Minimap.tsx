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

const Minimap: React.FC<MinimapProps> = ({ nodes, edges, nodePositions, activeNode, camera, controls }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Calculate viewport corners in world space
  const calculateViewportCorners = (camera: THREE.Camera): THREE.Vector3[] => {
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    // Get the camera's view direction and up vector
    const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const right = new THREE.Vector3().crossVectors(direction, up);

    // Calculate view dimensions at the target distance
    const targetDistance = controls ? camera.position.distanceTo(controls.target) : 10;
    const vFov = camera.fov * Math.PI / 180;
    const height = 2 * Math.tan(vFov / 2) * targetDistance;
    const width = height * camera.aspect;

    // Calculate corners
    const center = controls ? controls.target.clone() : camera.position.clone().add(direction.multiplyScalar(targetDistance));
    const corners = [
      center.clone().add(right.multiplyScalar(width/2)).add(up.multiplyScalar(height/2)),
      center.clone().sub(right.multiplyScalar(width/2)).add(up.multiplyScalar(height/2)),
      center.clone().sub(right.multiplyScalar(width/2)).sub(up.multiplyScalar(height/2)),
      center.clone().add(right.multiplyScalar(width/2)).sub(up.multiplyScalar(height/2))
    ];

    return corners;
  };

  // Project 3D point to 2D minimap coordinates
  const projectToMinimap = (position: THREE.Vector3 | [number, number, number], width: number, height: number): [number, number] => {
    const pos = Array.isArray(position) ? position : [position.x, position.y, position.z];
    const padding = 30;
    
    // Find bounds of all nodes
    const positions = Array.from(nodePositions.values());
    const minX = Math.min(...positions.map(p => p[0]));
    const maxX = Math.max(...positions.map(p => p[0]));
    const minY = Math.min(...positions.map(p => p[1]));
    const maxY = Math.max(...positions.map(p => p[1]));
    
    const scaleX = (width - 2 * padding) / (maxX - minX);
    const scaleY = (height - 2 * padding) / (maxY - minY);
    const scale = Math.min(scaleX, scaleY);
    
    return [
      padding + (pos[0] - minX) * scale,
      height - (padding + (pos[1] - minY) * scale)
    ];
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size with higher resolution
    const scale = window.devicePixelRatio || 1;
    canvas.width = container.clientWidth * scale;
    canvas.height = container.clientHeight * scale;
    ctx.scale(scale, scale);

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width / scale, canvas.height / scale);

    // Draw edges
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

    // Draw viewport rectangle if camera exists
    if (camera && controls) {
      const corners = calculateViewportCorners(camera);
      const projectedCorners = corners.map(corner => 
        projectToMinimap(corner, canvas.width / scale, canvas.height / scale)
      );

      // Draw viewport area
      ctx.beginPath();
      ctx.moveTo(projectedCorners[0][0], projectedCorners[0][1]);
      projectedCorners.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.closePath();

      // Style for viewport rectangle
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.stroke();
      ctx.setLineDash([]);

      // Fill with semi-transparent overlay
      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.fill();
    }

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
