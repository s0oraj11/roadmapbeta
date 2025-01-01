import React, { useEffect, useRef, useMemo } from 'react';
import { Node as FlowNode, Edge } from '@xyflow/react';
import { motion, AnimatePresence } from 'framer-motion';
import * as THREE from 'three';
import { mat4, vec3 } from 'gl-matrix';
import useMeasure from 'react-use-measure';
import { create } from 'zustand';
import { createSelector } from 'reselect';

interface MinimapState {
  isDragging: boolean;
  setDragging: (dragging: boolean) => void;
}

const useMinimapStore = create<MinimapState>((set) => ({
  isDragging: false,
  setDragging: (dragging) => set({ isDragging }),
}));

interface MinimapProps {
  nodes: FlowNode[];
  edges: Edge[];
  nodePositions: Map<string, [number, number, number]>;
  activeNode: string | null;
  camera?: THREE.Camera;
  controls?: any;
}

const calculateBounds = (positions: [number, number, number][]) => {
  return positions.reduce(
    (bounds, pos) => ({
      minX: Math.min(bounds.minX, pos[0]),
      maxX: Math.max(bounds.maxX, pos[0]),
      minY: Math.min(bounds.minY, pos[1]),
      maxY: Math.max(bounds.maxY, pos[1]),
      minZ: Math.min(bounds.minZ, pos[2]),
      maxZ: Math.max(bounds.maxZ, pos[2]),
    }),
    {
      minX: Infinity,
      maxX: -Infinity,
      minY: Infinity,
      maxY: -Infinity,
      minZ: Infinity,
      maxZ: -Infinity,
    }
  );
};

const Minimap: React.FC<MinimapProps> = ({ nodes, edges, nodePositions, activeNode, camera, controls }) => {
  const [containerRef, bounds] = useMeasure();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<{ 
    animationFrame: number;
    lastRender: number;
  }>({ animationFrame: 0, lastRender: 0 });

  const { isDragging, setDragging } = useMinimapStore();

  const getFrustumPoints = useMemo(() => {
    return (camera: THREE.Camera): THREE.Vector3[] => {
      const frustum = new THREE.Frustum();
      const projScreenMatrix = new THREE.Matrix4();
      projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      frustum.setFromProjectionMatrix(projScreenMatrix);

      const cameraPosition = camera.position;
      const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
      const up = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
      const right = new THREE.Vector3().crossVectors(forward, up);

      const nearDist = camera.near;
      const farDist = camera.far;
      const aspect = camera.aspect;
      const vFov = (camera.fov * Math.PI) / 180;
      const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

      const nearHeight = 2 * Math.tan(vFov / 2) * nearDist;
      const nearWidth = nearHeight * aspect;
      const farHeight = 2 * Math.tan(vFov / 2) * farDist;
      const farWidth = farHeight * aspect;

      return [
        // Near plane corners
        cameraPosition.clone().add(forward.clone().multiplyScalar(nearDist))
          .add(up.clone().multiplyScalar(nearHeight / 2))
          .add(right.clone().multiplyScalar(nearWidth / 2)),
        cameraPosition.clone().add(forward.clone().multiplyScalar(nearDist))
          .add(up.clone().multiplyScalar(nearHeight / 2))
          .sub(right.clone().multiplyScalar(nearWidth / 2)),
        cameraPosition.clone().add(forward.clone().multiplyScalar(nearDist))
          .sub(up.clone().multiplyScalar(nearHeight / 2))
          .sub(right.clone().multiplyScalar(nearWidth / 2)),
        cameraPosition.clone().add(forward.clone().multiplyScalar(nearDist))
          .sub(up.clone().multiplyScalar(nearHeight / 2))
          .add(right.clone().multiplyScalar(nearWidth / 2)),
        // Far plane corners
        cameraPosition.clone().add(forward.clone().multiplyScalar(farDist))
          .add(up.clone().multiplyScalar(farHeight / 2))
          .add(right.clone().multiplyScalar(farWidth / 2)),
        cameraPosition.clone().add(forward.clone().multiplyScalar(farDist))
          .add(up.clone().multiplyScalar(farHeight / 2))
          .sub(right.clone().multiplyScalar(farWidth / 2)),
        cameraPosition.clone().add(forward.clone().multiplyScalar(farDist))
          .sub(up.clone().multiplyScalar(farHeight / 2))
          .sub(right.clone().multiplyScalar(farWidth / 2)),
        cameraPosition.clone().add(forward.clone().multiplyScalar(farDist))
          .sub(up.clone().multiplyScalar(farHeight / 2))
          .add(right.clone().multiplyScalar(farWidth / 2)),
      ];
    };
  }, []);

  const projectToMinimap = useMemo(() => {
    return (position: THREE.Vector3 | [number, number, number], width: number, height: number): [number, number] => {
      const pos = Array.isArray(position) ? position : [position.x, position.y, position.z];
      const positions = Array.from(nodePositions.values());
      const { minX, maxX, minY, maxY } = calculateBounds(positions);
      
      const padding = 20;
      const availableWidth = width - 2 * padding;
      const availableHeight = height - 2 * padding;
      
      const scaleX = availableWidth / (maxX - minX);
      const scaleY = availableHeight / (maxY - minY);
      const scale = Math.min(scaleX, scaleY);
      
      return [
        padding + (pos[0] - minX) * scale,
        height - (padding + (pos[1] - minY) * scale)
      ];
    };
  }, [nodePositions]);

  const renderMinimap = useMemo(() => {
    return () => {
      const canvas = canvasRef.current;
      if (!canvas || !bounds.width || !bounds.height) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Setup high DPI canvas
      const dpr = window.devicePixelRatio || 1;
      canvas.width = bounds.width * dpr;
      canvas.height = bounds.height * dpr;
      ctx.scale(dpr, dpr);

      // Clear canvas with a semi-transparent background
      ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
      ctx.fillRect(0, 0, bounds.width, bounds.height);

      // Draw edges with glow effect
      edges.forEach(edge => {
        const startPos = nodePositions.get(edge.source);
        const endPos = nodePositions.get(edge.target);
        
        if (startPos && endPos) {
          const [startX, startY] = projectToMinimap(startPos, bounds.width, bounds.height);
          const [endX, endY] = projectToMinimap(endPos, bounds.width, bounds.height);
          
          // Edge glow
          ctx.shadowColor = 'rgba(30, 41, 59, 0.5)';
          ctx.shadowBlur = 4;
          ctx.strokeStyle = '#1e293b';
          ctx.lineWidth = 1;
          
          ctx.beginPath();
          ctx.moveTo(startX, startY);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        }
      });

      // Reset shadow for nodes
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;

      // Draw nodes with enhanced styling
      nodes.forEach(node => {
        const position = nodePositions.get(node.id);
        if (!position) return;

        const [x, y] = projectToMinimap(position, bounds.width, bounds.height);
        
        // Node glow
        ctx.shadowColor = node.id === activeNode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        
        ctx.beginPath();
        ctx.arc(x, y, node.id === activeNode ? 6 : 4, 0, Math.PI * 2);
        
        // Node colors with gradient
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, node.id === activeNode ? 6 : 4);
        
        if (node.id === 'start') {
          gradient.addColorStop(0, '#fef3c7');
          gradient.addColorStop(1, '#fbbf24');
        } else if (node.className?.includes('pattern')) {
          gradient.addColorStop(0, '#e0e7ff');
          gradient.addColorStop(1, '#818cf8');
        } else {
          gradient.addColorStop(0, '#cffafe');
          gradient.addColorStop(1, '#22d3ee');
        }
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        if (node.id === activeNode) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw viewport if camera exists
      if (camera && controls) {
        const frustumPoints = getFrustumPoints(camera);
        const projectedPoints = frustumPoints.map(point => 
          projectToMinimap(point, bounds.width, bounds.height)
        );

        // Draw viewport area with animation
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        
        // Animate dash offset
        const dashOffset = (Date.now() / 50) % 8;
        ctx.lineDashOffset = dashOffset;

        ctx.beginPath();
        ctx.moveTo(projectedPoints[0][0], projectedPoints[0][1]);
        projectedPoints.forEach(([x, y]) => {
          ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();
        
        // Fill viewport area
        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
      }
    };
  }, [bounds.width, bounds.height, nodes, edges, nodePositions, activeNode, camera, controls, getFrustumPoints, projectToMinimap]);

  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      if (now - rendererRef.current.lastRender >= 1000 / 30) { // 30 FPS limit
        renderMinimap();
        rendererRef.current.lastRender = now;
      }
      rendererRef.current.animationFrame = requestAnimationFrame(animate);
    };

    rendererRef.current.animationFrame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rendererRef.current.animationFrame);
    };
  }, [renderMinimap]);

  return (
    <AnimatePresence>
      <motion.div
        ref={containerRef}
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ 
          opacity: 1,
          scale: 1,
          y: 0
        }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{
          duration: 0.3,
          type: "spring",
          stiffness: 260,
          damping: 20
        }}
        className="fixed bottom-4 right-4 w-48 h-36 rounded-md border border-gray-800 overflow-hidden shadow-xl z-50"
        style={{
          backdropFilter: 'blur(12px)',
          backgroundColor: 'rgba(15, 23, 42, 0.85)',
          willChange: 'transform',
          transform: 'translateZ(0)',
        }}
      >
        <motion.div 
          className="relative w-full h-full"
          whileHover={{ scale: 1.02 }}
          transition={{ duration: 0.2 }}
        >
          <canvas
            ref={canvasRef}
            className="w-full h-full"
            style={{
              display: 'block',
              position: 'relative',
              zIndex: 1,
              cursor: isDragging ? 'grabbing' : 'grab'
            }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Minimap;
