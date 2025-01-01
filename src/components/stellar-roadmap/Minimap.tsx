import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';

interface Node {
  id: string;
  className?: string;
}

interface Edge {
  source: string;
  target: string;
}

interface MinimapProps {
  nodes: Node[];
  edges: Edge[];
  nodePositions: Map<string, [number, number, number]>;
  activeNode: string | null;
  camera?: THREE.Camera;
  controls?: OrbitControls;
  mode?: '2d' | '3d';
  onViewportChange?: (center: THREE.Vector3, zoom: number) => void;
}

const Minimap: React.FC<MinimapProps> = ({
  nodes,
  edges,
  nodePositions,
  activeNode,
  camera,
  controls,
  mode = '2d',
  onViewportChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const minimapCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const minimapControlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number>();
  const [is3D, setIs3D] = useState(mode === '3d');
  const [isDragging, setIsDragging] = useState(false);

  // Initialize 3D scene
  useEffect(() => {
    if (!containerRef.current || !is3D) return;

    // Setup scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(192, 144);
    renderer.setClearColor(0x000000, 0);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup camera
    const camera = new THREE.PerspectiveCamera(75, 192/144, 0.1, 1000);
    camera.position.set(5, 5, 5);
    camera.lookAt(0, 0, 0);
    minimapCameraRef.current = camera;

    // Setup controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    minimapControlsRef.current = controls;

    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      controls.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, [is3D]);

  // Update 3D scene
  useEffect(() => {
    if (!is3D || !sceneRef.current || !rendererRef.current || !minimapCameraRef.current) return;

    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const camera = minimapCameraRef.current;
    const controls = minimapControlsRef.current;

    // Clear existing nodes and edges
    while(scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }

    // Add nodes
    nodes.forEach(node => {
      const position = nodePositions.get(node.id);
      if (!position) return;

      const geometry = new THREE.SphereGeometry(0.1, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: node.id === activeNode ? 0xffffff : 
               node.id === 'start' ? 0xfbbf24 :
               node.className?.includes('pattern') ? 0x818cf8 : 
               0x22d3ee
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(...position);
      scene.add(sphere);
    });

    // Add edges
    edges.forEach(edge => {
      const startPos = nodePositions.get(edge.source);
      const endPos = nodePositions.get(edge.target);
      
      if (startPos && endPos) {
        const points = [
          new THREE.Vector3(...startPos),
          new THREE.Vector3(...endPos)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({ 
          color: 0x475569,
          opacity: 0.6,
          transparent: true
        });
        
        const line = new THREE.Line(geometry, material);
        scene.add(line);
      }
    });

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      controls?.update();
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, edges, nodePositions, activeNode, is3D]);

  // Calculate viewport bounds
  const calculateViewportBounds = () => {
    if (!camera) return null;
    
    const frustum = new THREE.Frustum();
    const matrix = new THREE.Matrix4().multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(matrix);

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    const distance = 15;
    
    const aspectRatio = 192/144;
    const vFOV = THREE.MathUtils.degToRad(camera.fov);
    const height = 2 * Math.tan(vFOV / 2) * distance;
    const width = height * aspectRatio;

    const cameraRight = new THREE.Vector3().crossVectors(cameraDirection, camera.up).normalize();
    const cameraUp = new THREE.Vector3().crossVectors(cameraRight, cameraDirection).normalize();

    return {
      center: camera.position.clone().add(cameraDirection.multiplyScalar(distance)),
      width,
      height,
      right: cameraRight,
      up: cameraUp
    };
  };

  // Calculate global bounds
  const calculateGlobalBounds = (positions: [number, number, number][]) => {
    return positions.reduce(
      (acc, pos) => ({
        minX: Math.min(acc.minX, pos[0]),
        maxX: Math.max(acc.maxX, pos[0]),
        minY: Math.min(acc.minY, pos[1]),
        maxY: Math.max(acc.maxY, pos[1])
      }),
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );
  };

  // Project 3D coordinates to 2D
  const projectToCanvas = (pos: [number, number, number], bounds: ReturnType<typeof calculateGlobalBounds>, canvasSize: { width: number, height: number }) => {
    const padding = 20;
    const width = canvasSize.width - 2 * padding;
    const height = canvasSize.height - 2 * padding;
    
    const x = padding + ((pos[0] - bounds.minX) / (bounds.maxX - bounds.minX)) * width;
    const y = padding + ((pos[1] - bounds.minY) / (bounds.maxY - bounds.minY)) * height;
    
    return [x, y] as const;
  };

  // Handle minimap click
  const handleMinimapClick = (event: React.MouseEvent<HTMLCanvasElement | HTMLDivElement>) => {
    if (!camera || !controls) return;
    
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const bounds = calculateGlobalBounds(Array.from(nodePositions.values()));
    const padding = 20;
    const width = event.currentTarget.clientWidth - 2 * padding;
    const height = event.currentTarget.clientHeight - 2 * padding;
    
    const sceneX = ((x - padding) / width) * (bounds.maxX - bounds.minX) + bounds.minX;
    const sceneY = ((y - padding) / height) * (bounds.maxY - bounds.minY) + bounds.minY;
    
    const targetPosition = new THREE.Vector3(sceneX, sceneY, camera.position.z);
    const startPosition = camera.position.clone();
    const duration = 500;
    const startTime = Date.now();
    
    const animateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const easeProgress = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      camera.position.lerpVectors(startPosition, targetPosition, easeProgress);
      
      if (progress < 1) {
        requestAnimationFrame(animateCamera);
      } else {
        controls.target.set(sceneX, sceneY, 0);
        controls.update();
        onViewportChange?.(targetPosition, camera.zoom);
      }
    };
    
    animateCamera();
  };

  // 2D rendering
  const render2D = useMemo(() => {
    return () => {
      if (!canvasRef.current || is3D) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = 192;
      canvas.height = 144;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const positions = Array.from(nodePositions.values());
      const bounds = calculateGlobalBounds(positions);

      // Draw edges
      ctx.lineWidth = 1;
      edges.forEach(edge => {
        const startPos = nodePositions.get(edge.source);
        const endPos = nodePositions.get(edge.target);
        
        if (startPos && endPos) {
          const [x1, y1] = projectToCanvas(startPos, bounds, { width: canvas.width, height: canvas.height });
          const [x2, y2] = projectToCanvas(endPos, bounds, { width: canvas.width, height: canvas.height });
          
          ctx.strokeStyle = '#475569';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });

      // Draw nodes
      nodes.forEach(node => {
        const position = nodePositions.get(node.id);
        if (!position) return;

        const [x, y] = projectToCanvas(position, bounds, { width: canvas.width, height: canvas.height });
        
        ctx.beginPath();
        ctx.arc(x, y, node.id === activeNode ? 6 : 4, 0, Math.PI * 2);
        
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

      // Draw viewport
      if (camera) {
        const viewportBounds = calculateViewportBounds();
        if (viewportBounds) {
          const center = viewportBounds.center;
          const [cx, cy] = projectToCanvas([center.x, center.y, center.z], bounds, { width: canvas.width, height: canvas.height });
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          
          const vpWidth = viewportBounds.width * (canvas.width / (bounds.maxX - bounds.minX));
          const vpHeight = viewportBounds.height * (canvas.height / (bounds.maxY - bounds.minY));
          
          ctx.beginPath();
          ctx.rect(
            cx - vpWidth / 2,
            cy - vpHeight / 2,
            vpWidth,
            vpHeight
          );
          ctx.stroke();
          
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fill();
          
          ctx.setLineDash([]);
        }
      }
    };
  }, [nodes, edges, nodePositions, activeNode, camera, is3D]);

  // Run 2D render
  useEffect(() => {
    if (!is3D) {
      render2D();
    }
  }, [render2D, is3D]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 0.95, scale: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-4 right-4 z-50"
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
              onClick={handleMinimapClick}
            />
          ) : (
                <canvas
              ref={canvasRef}
              className="w-full h-full"
              style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onClick={handleMinimapClick}
            />
          )}
          <button
            onClick={() => setIs3D(!is3D)}
            className="absolute top-2 right-2 p-1 rounded-md bg-gray-800/80 hover:bg-gray-700/80 transition-colors text-white text-sm"
          >
            {is3D ? '2D' : '3D'}
          </button>
        </div>
      </Card>
    </motion.div>
  );
};

export default Minimap;
