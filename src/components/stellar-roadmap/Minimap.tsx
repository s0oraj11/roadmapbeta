import React, { useEffect, useRef, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { motion } from 'framer-motion';

interface Node {
  id: string;
  className?: string;
}

interface Edge {
  source: string;
  target: string;
}

interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
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
    scene.background = new THREE.Color('#0f172a');
    sceneRef.current = scene;

    // Setup renderer
    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    renderer.setSize(192, 144);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Setup camera with improved positioning
    const minimapCamera = new THREE.PerspectiveCamera(75, 192/144, 0.1, 1000);
    minimapCamera.position.set(5, 5, 5);
    minimapCamera.lookAt(0, 0, 0);
    minimapCameraRef.current = minimapCamera;

    // Setup controls with better damping
    const minimapControls = new OrbitControls(minimapCamera, renderer.domElement);
    minimapControls.enableDamping = true;
    minimapControls.dampingFactor = 0.05;
    minimapControls.rotateSpeed = 0.5;
    minimapControls.zoomSpeed = 0.5;
    minimapControls.enablePan = false;
    minimapControlsRef.current = minimapControls;

    // Add improved lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 10, 10);
    scene.add(directionalLight);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      renderer.dispose();
      minimapControls.dispose();
      if (containerRef.current?.contains(renderer.domElement)) {
        containerRef.current.removeChild(renderer.domElement);
      }
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

  // Update 3D scene
  useEffect(() => {
    if (!is3D || !sceneRef.current || !rendererRef.current || !minimapCameraRef.current) return;

    const scene = sceneRef.current;
    const renderer = rendererRef.current;
    const minimapCamera = minimapCameraRef.current;

    // Clear existing objects
    while(scene.children.length > 0) {
      scene.remove(scene.children[0]);
    }

    // Add nodes with improved materials
    nodes.forEach(node => {
      const position = nodePositions.get(node.id);
      if (!position) return;

      const geometry = new THREE.SphereGeometry(0.3, 32, 32);
      const material = new THREE.MeshPhongMaterial({ 
        color: getNodeColor(node, activeNode),
        emissive: getNodeColor(node, activeNode),
        emissiveIntensity: 0.2
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

    // Add edges with glow effect
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
          color: '#4b5563',
          transparent: true,
          opacity: 0.6
        });
        const line = new THREE.Line(geometry, material);
        scene.add(line);

        const glowMaterial = new THREE.LineBasicMaterial({
          color: '#6b7280',
          transparent: true,
          opacity: 0.2,
          linewidth: 2
        });
        const glowLine = new THREE.Line(geometry, glowMaterial);
        scene.add(glowLine);
      }
    });

    // Add frustum visualization if camera exists
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

    // Animation loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);
      minimapControlsRef.current?.update();
      renderer.render(scene, minimapCamera);
    };
    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [nodes, edges, nodePositions, activeNode, camera, controls, is3D]);

  // Calculate viewport bounds for 2D view
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

  // Project 3D coordinates to 2D canvas
  const projectToCanvas = (pos: [number, number, number], bounds: Bounds, canvasSize: { width: number; height: number }) => {
    const padding = 20;
    const width = canvasSize.width - 2 * padding;
    const height = canvasSize.height - 2 * padding;
    
    const x = padding + ((pos[0] - bounds.minX) / (bounds.maxX - bounds.minX)) * width;
    const y = canvasSize.height - (padding + ((pos[1] - bounds.minY) / (bounds.maxY - bounds.minY)) * height);
    
    return [x, y] as const;
  };

  // Render 2D view
  const render2D = useMemo(() => {
    return () => {
      if (!canvasRef.current || is3D) return;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const positions = Array.from(nodePositions.values());
      const bounds = positions.reduce(
        (acc: Bounds, pos: [number, number, number]) => ({
          minX: Math.min(acc.minX, pos[0]),
          maxX: Math.max(acc.maxX, pos[0]),
          minY: Math.min(acc.minY, pos[1]),
          maxY: Math.max(acc.maxY, pos[1])
        }),
        { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
      );

      // Draw edges
      edges.forEach(edge => {
        const startPos = nodePositions.get(edge.source);
        const endPos = nodePositions.get(edge.target);
        
        if (startPos && endPos) {
          const [x1, y1] = projectToCanvas(startPos, bounds, { width: canvas.width, height: canvas.height });
          const [x2, y2] = projectToCanvas(endPos, bounds, { width: canvas.width, height: canvas.height });
          
          ctx.shadowColor = 'rgba(71, 85, 105, 0.5)';
          ctx.shadowBlur = 4;
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

      // Draw viewport
      if (camera) {
        const viewportBounds = calculateViewportBounds();
        if (viewportBounds) {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = (Date.now() / 50) % 8;

          const [cx, cy] = projectToCanvas(
            [viewportBounds.center.x, viewportBounds.center.y, viewportBounds.center.z],
            bounds,
            { width: canvas.width, height: canvas.height }
          );

          ctx.beginPath();
          ctx.rect(
            cx - viewportBounds.width / 2,
            cy - viewportBounds.height / 2,
            viewportBounds.width,
            viewportBounds.height
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
      const animate = () => {
        render2D();
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animate();
      return () => {
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
  }, [render2D, is3D]);

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

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      animate={{ opacity: 0.95, scale: 1, y: 0 }}
      transition={{ duration: 0.3, type: "spring", stiffness: 260, damping: 20 }}
      className="fixed bottom-4 right-4 z-50"
    >
      <div className="w-48 h-36 overflow-hidden shadow-xl rounded-lg">
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
            {is3D ? '2D' : '3D'}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Minimap;
