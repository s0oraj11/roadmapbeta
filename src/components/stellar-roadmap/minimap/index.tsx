import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { motion, AnimatePresence } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { MinimapProps } from './types';
import { setup2DCanvas, render2D } from './2d';
import { setup3DScene, update3DScene } from './3d';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';

const Minimap: React.FC<MinimapProps> = ({ 
  nodes, 
  edges, 
  nodePositions, 
  activeNode, 
  camera, 
  controls,
  mode = '2d'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const minimapCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const minimapControlsRef = useRef<OrbitControls | null>(null);
  const [is3D, setIs3D] = useState(mode === '3d');
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!containerRef.current || !is3D) return;

    const { scene, renderer, camera, controls, composer, cleanup } = setup3DScene(
      containerRef.current,
      (controls) => {
        minimapControlsRef.current = controls;
      }
    );

    sceneRef.current = scene;
    rendererRef.current = renderer;
    composerRef.current = composer;
    minimapCameraRef.current = camera;

    return cleanup;
  }, [is3D]);

  useEffect(() => {
    if (!canvasRef.current || is3D) return;
    setup2DCanvas(canvasRef.current);
  }, [is3D]);

  useEffect(() => {
    if (!sceneRef.current || !is3D) return;
    return update3DScene(
      sceneRef.current,
      nodes,
      edges,
      nodePositions,
      activeNode,
      camera,
      controls
    );
  }, [nodes, edges, nodePositions, activeNode, camera, controls, is3D]);

  useEffect(() => {
    let animationFrame: number;

    const animate = () => {
      if (is3D) {
        if (minimapControlsRef.current) {
          minimapControlsRef.current.update();
        }
        if (composerRef.current) {
          composerRef.current.render();
        }
      } else {
        if (canvasRef.current) {
          render2D(canvasRef.current, nodes, edges, nodePositions, activeNode, camera);
        }
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [is3D, nodes, edges, nodePositions, activeNode, camera]);

  useEffect(() => {
    if (!camera || !controls) return;

    const handleCameraChange = () => {
      if (!is3D && canvasRef.current) {
        render2D(canvasRef.current, nodes, edges, nodePositions, activeNode, camera);
      }
    };

    controls.addEventListener('change', handleCameraChange);
    return () => controls.removeEventListener('change', handleCameraChange);
  }, [camera, controls, is3D, nodes, edges, nodePositions, activeNode]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 0.95, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.3, type: "spring", stiffness: 260, damping: 20 }}
        className="absolute bottom-4 right-4 z-50"
      >
        <Card className="w-48 h-36 overflow-hidden shadow-xl backdrop-blur-lg bg-gradient-to-br from-gray-900/90 to-gray-800/90">
          <motion.div 
            className="relative w-full h-full"
            layout
          >
            {is3D ? (
              <div 
                ref={containerRef} 
                className="w-full h-full"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              />
            ) : (
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onMouseDown={() => setIsDragging(true)}
                onMouseUp={() => setIsDragging(false)}
                onMouseLeave={() => setIsDragging(false)}
              />
            )}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIs3D(!is3D)}
              className="absolute top-2 right-2 p-1 rounded-md bg-gray-800/80 hover:bg-gray-700/80 transition-colors text-white text-sm backdrop-blur-sm ring-1 ring-white/10"
            >
              {is3D ? 'Switch to 2D' : 'Switch to 3D'}
            </motion.button>
          </motion.div>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
};

export default Minimap;
