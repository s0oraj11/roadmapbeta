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

  // Initialize 3D scene with improved setup
  useEffect(() => {
    if (!containerRef.current || !is3D) return;

    // Enhanced scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    sceneRef.current = scene;

    // Improved renderer with better quality
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true,
      precision: 'highp'
    });
    renderer.setSize(192, 144);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Enhanced camera setup as per original version
    const minimapCamera = new THREE.PerspectiveCamera(75, 192/144, 0.1, 1000);
    minimapCamera.position.set(5, 5, 5);
    minimapCamera.lookAt(0, 0, 0);
    minimapCameraRef.current = minimapCamera;

    // Improved controls configuration
    const minimapControls = new OrbitControls(minimapCamera, renderer.domElement);
    minimapControls.enableDamping = true;
    minimapControls.dampingFactor = 0.05;
    minimapControls.rotateSpeed = 0.5;
    minimapControls.zoomSpeed = 0.5;
    minimapControls.enablePan = false;
    minimapControlsRef.current = minimapControls;

    // Enhanced lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 10, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      minimapControls.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [is3D]);

  // Create frustum visualization
  const createFrustumVisualization = (camera: THREE.Camera) => {
    const frustumGeometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.LineBasicMaterial({
      color: '#ffffff',
      opacity: 0.4,
      transparent: true,
    });
    
    const wireframeMaterial = new THREE.LineBasicMaterial({
      color: '#ffffff',
      opacity: 0.2,
      transparent: true,
    });

    const frustumMesh = new THREE.Mesh(frustumGeometry, material);
    const wireframe = new THREE.LineSegments(
      new THREE.WireframeGeometry(frustumGeometry),
      wireframeMaterial
    );
    
    frustumMesh.add(wireframe);
    return frustumMesh;
  };

  // Update 3D scene with enhanced visuals
  useEffect(() => {
    if (!is3D || !sceneRef.current) return;

    const scene = sceneRef.current;
    while(scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }

    // Add enhanced nodes
    nodes.forEach(node => {
      const position = nodePositions.get(node.id);
      if (!position) return;

      const geometry = new THREE.SphereGeometry(0.3, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: getNodeColor(node, activeNode),
        emissive: getNodeColor(node, activeNode),
        emissiveIntensity: 0.2,
        shininess: 100
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(...position);
      
      if (node.id === activeNode) {
        const glowGeometry = new THREE.SphereGeometry(0.4, 32, 32);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        sphere.add(glow);
      }
      
      scene.add(sphere);
    });

    // Add enhanced edges with glow
    edges.forEach(edge => {
      const startPos = nodePositions.get(edge.source);
      const endPos = nodePositions.get(edge.target);
      
      if (!startPos || !endPos) return;

      const points = [
        new THREE.Vector3(...startPos),
        new THREE.Vector3(...endPos)
      ];
      
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      
      // Main edge line
      const material = new THREE.LineBasicMaterial({ 
        color: '#4b5563',
        transparent: true,
        opacity: 0.6
      });
      const line = new THREE.Line(geometry, material);
      scene.add(line);

      // Glow effect
      const glowMaterial = new THREE.LineBasicMaterial({
        color: '#6b7280',
        transparent: true,
        opacity: 0.2,
        linewidth: 2
      });
      const glowLine = new THREE.Line(geometry, glowMaterial);
      scene.add(glowLine);
    });

    // Add improved camera frustum visualization
    if (camera) {
      const frustumMesh = createFrustumVisualization(camera);
      scene.add(frustumMesh);

      const updateFrustum = () => {
        const frustum = new THREE.Frustum();
        const projScreenMatrix = new THREE.Matrix4();
        projScreenMatrix.multiplyMatrices(
          camera.projectionMatrix,
          camera.matrixWorldInverse
        );
        frustum.setFromProjectionMatrix(projScreenMatrix);

        frustumMesh.position.copy(camera.position);
        frustumMesh.quaternion.copy(camera.quaternion);
        
        const distance = camera.position.length();
        const scale = distance * 0.15;
        frustumMesh.scale.set(scale, scale, scale);
      };

      if (controls) {
        controls.addEventListener('change', updateFrustum);
        return () => controls.removeEventListener('change', updateFrustum);
      }
    }
  }, [nodes, edges, nodePositions, activeNode, camera, controls, is3D]);

  // Enhanced 2D rendering
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

      // Draw enhanced edges
      ctx.lineWidth = 1;
      edges.forEach(edge => {
        const startPos = nodePositions.get(edge.source);
        const endPos = nodePositions.get(edge.target);
        
        if (startPos && endPos) {
          const [x1, y1] = projectToCanvas(startPos, bounds, canvas);
          const [x2, y2] = projectToCanvas(endPos, bounds, canvas);
          
          ctx.shadowColor = 'rgba(71, 85, 105, 0.5)';
          ctx.shadowBlur = 4;
          ctx.strokeStyle = '#475569';
          
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
      });

      // Draw enhanced nodes
      nodes.forEach(node => {
        const position = nodePositions.get(node.id);
        if (!position) return;

        const [x, y] = projectToCanvas(position, bounds, canvas);
        
        ctx.shadowColor = node.id === activeNode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 6;
        
        ctx.beginPath();
        ctx.arc(x, y, node.id === activeNode ? 6 : 4, 0, Math.PI * 2);
        
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, node.id === activeNode ? 6 : 4);
        const colors = getNodeColors(node);
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(1, colors[1]);
        
        ctx.fillStyle = gradient;
        ctx.fill();
        
        if (node.id === activeNode) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      });

      // Draw enhanced viewport
      if (camera) {
        const viewportPoints = getViewportPoints(camera).map(point => 
          projectToCanvas([point.x, point.y, point.z], bounds, canvas)
        );

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([4, 4]);
        ctx.lineDashOffset = (Date.now() / 50) % 8;

        ctx.beginPath();
        ctx.moveTo(viewportPoints[0][0], viewportPoints[0][1]);
        viewportPoints.forEach(([x, y]) => {
          ctx.lineTo(x, y);
        });
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.fill();
      }
    };
  }, [nodes, edges, nodePositions, activeNode, camera, is3D]);

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
        render2D();
      }
      animationFrame = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationFrame);
  }, [is3D, render2D]);

  // Utility functions
  const getNodeColor = (node: Node, activeNode: string | null): string => {
    if (node.id === activeNode) return '#fbbf24';
    if (node.id === 'start') return '#fbbf24';
    if (node.className?.includes('pattern')) return '#818cf8';
    return '#22d3ee';
  };

  const getNodeColors = (node: Node): [string, string] => {
    if (node.id === 'start') return ['#fef3c7', '#fbbf24'];
    if (node.className?.includes('pattern')) return ['#e0e7ff', '#818cf8'];
    return ['#cffafe', '#22d3ee'];
  };

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

  const getViewportPoints = (camera: THREE.Camera): THREE.Vector3[] => {
    const frustum = new THREE.Frustum();
    const projScreenMatrix = new THREE.Matrix4();
    projScreenMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    frustum.setFromProjectionMatrix(projScreenMatrix);

    const near = camera.near;
    const far = camera.far;
    const aspect = camera.aspect;
    const fov = (camera.fov * Math.PI) / 180;
    const height = Math.tan(fov / 2);
    const width = height * aspect;

    const points = [
      new THREE.Vector3(-width * near, -height * near, -near),
      new THREE.Vector3(width * near, -height * near, -near),
      new THREE.Vector3(width * near, height * near, -near),
      new THREE.Vector3(-width * near, height * near, -near),
    ];

    return points.map(point => point.applyMatrix4(camera.matrixWorld));
  };

  const projectToCanvas = (pos: [number, number, number], bounds: ReturnType<typeof calculateGlobalBounds>, canvas: HTMLCanvasElement) => {
    const padding = 20;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;
    
    const x = padding + ((pos[0] - bounds.minX) / (bounds.maxX - bounds.minX)) * width;
    // Invert Y coordinate for proper canvas rendering
      const y = padding + ((pos[1] - bounds.minY) / (bounds.maxY - bounds.minY)) * height;
    
    return [x, y];
  };

  // Enhanced click handling
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
    const sceneY = (1 - ((y - padding) / height)) * (bounds.maxY - bounds.minY) + bounds.minY;
    
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
