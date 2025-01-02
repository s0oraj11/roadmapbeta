// components/stellar-roadmap/minimap/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { MinimapProps } from './types';
import { setup2DCanvas, render2D } from './2d';
import { setup3DScene, update3DScene } from './3d';

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
  const minimapCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const minimapControlsRef = useRef<OrbitControls | null>(null);
  const [is3D, setIs3D] = useState(mode === '3d');
  const [isDragging, setIsDragging] = useState(false);

  // Initialize 3D scene
useEffect(() => {
  if (!containerRef.current || !is3D) return;

  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0f172a');
  sceneRef.current = scene;

  // Create renderer
  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true,
    powerPreference: "high-performance"
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(192, 144);
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  containerRef.current.appendChild(renderer.domElement);
  rendererRef.current = renderer;

  // Create and configure camera with closer view
  const minimapCamera = new THREE.PerspectiveCamera(60, 192/144, 0.1, 1000);
  minimapCamera.position.set(0, 4, 4);
  minimapCamera.lookAt(0, 0, 0);
  minimapCameraRef.current = minimapCamera;

  // Create and configure controls with limits
  const minimapControls = new OrbitControls(minimapCamera, renderer.domElement);
  minimapControls.enableDamping = true;
  minimapControls.dampingFactor = 0.05;
  minimapControls.rotateSpeed = 0.5;
  minimapControls.zoomSpeed = 0.5;
  minimapControls.minDistance = 4;
  minimapControls.maxDistance = 20;
  minimapControls.maxPolarAngle = Math.PI / 2;
  minimapControlsRef.current = minimapControls;

  // Add lights
  const ambientLight = new THREE.AmbientLight('#ffffff', 0.4);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight('#ffffff', 1.0);
  directionalLight.position.set(5, 10, 5);
  scene.add(directionalLight);

  const hemisphereLight = new THREE.HemisphereLight('#ffffff', '#004d99', 0.6);
  scene.add(hemisphereLight);

  return () => {
    minimapControls.dispose();
    renderer.dispose();
    if (containerRef.current) {
      containerRef.current.removeChild(renderer.domElement);
    }
    scene.remove(ambientLight);
    scene.remove(directionalLight);
    scene.remove(hemisphereLight);
  };
}, [is3D]);
//setting the initial view
useEffect(() => {
  if (!minimapCameraRef.current || !minimapControlsRef.current || !is3D) return;

  // Set initial zoom level
  minimapCameraRef.current.position.set(0, 4, 4);
  minimapCameraRef.current.lookAt(0, 0, 0);
  minimapControlsRef.current.update();

}, [is3D]);


  
  // Setup 2D canvas
  useEffect(() => {
    if (!canvasRef.current || is3D) return;
    setup2DCanvas(canvasRef.current);
  }, [is3D]);

  // Update 3D scene content
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

  // Animation loop
  useEffect(() => {
    let animationFrame: number;

    const animate = () => {
      if (is3D) {
        if (minimapControlsRef.current) {
          minimapControlsRef.current.update();
        }
        if (rendererRef.current && sceneRef.current && minimapCameraRef.current) {
          rendererRef.current.render(sceneRef.current, minimapCameraRef.current);
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

  // Handle camera movement
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
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 0.95, scale: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 260, damping: 20 }}
      className="absolute bottom-4 right-4 z-50"
    >
      <Card className="w-48 h-36 overflow-hidden shadow-xl">
        <div className="relative w-full h-full bg-gray-900/90 backdrop-blur-md">
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
          <button
            onClick={() => setIs3D(!is3D)}
            className="absolute top-2 right-2 p-1 rounded-md bg-gray-800/80 hover:bg-gray-700/80 transition-colors text-white text-sm"
          >
            {is3D ? 'View 2D' : 'View 3D'}
          </button>
        </div>
      </Card>
    </motion.div>
  );
};

export default Minimap;
