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
  controls?: any;
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
  mode = '2d'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const minimapCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const minimapControlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number>();
  const [is3D, setIs3D] = useState(mode === '3d');
  const [isDragging, setIsDragging] = useState(false);

  // Initialize 3D scene
  useEffect(() => {
    if (!containerRef.current || !is3D) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0f172a');
    sceneRef.current = scene;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(192, 144);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const minimapCamera = new THREE.PerspectiveCamera(75, 192/144, 0.1, 1000);
    minimapCamera.position.set(0, 15, 15);
    minimapCamera.lookAt(0, 0, 0);
    minimapCameraRef.current = minimapCamera;

    const minimapControls = new OrbitControls(minimapCamera, renderer.domElement);
    minimapControls.enableDamping = true;
    minimapControls.dampingFactor = 0.05;
    minimapControls.rotateSpeed = 0.5;
    minimapControls.zoomSpeed = 0.5;
    minimapControlsRef.current = minimapControls;

    return () => {
      minimapControls.dispose();
      renderer.dispose();
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, [is3D]);

  // Setup 2D canvas
  useEffect(() => {
    if (!canvasRef.current || is3D) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    ctx.scale(dpr, dpr);
  }, [is3D]);

  // Update 3D scene content
  useEffect(() => {
    if (!sceneRef.current || !is3D) return;

    while(sceneRef.current.children.length > 0) {
      sceneRef.current.remove(sceneRef.current.children[0]);
    }

    // Add nodes
    nodes.forEach(node => {
      const position = nodePositions.get(node.id);
      if (!position) return;

      const geometry = new THREE.SphereGeometry(0.3, 16, 16);
      const material = new THREE.MeshBasicMaterial({ 
        color: getNodeColor(node, activeNode)
      });
      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(...position);
      
      if (node.id === activeNode) {
        const glowGeometry = new THREE.SphereGeometry(0.4, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
          color: '#ffffff',
          transparent: true,
          opacity: 0.3
        });
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        sphere.add(glow);
      }
      
      sceneRef.current.add(sphere);
    });

    // Add edges with glow effect
    edges.forEach(edge => {
      const startPos = nodePositions.get(edge.source);
      const endPos = nodePositions.get(edge.target);
      
      if (!startPos || !endPos) return;

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
      sceneRef.current.add(line);

      const glowMaterial = new THREE.LineBasicMaterial({
        color: '#6b7280',
        transparent: true,
        opacity: 0.2,
        linewidth: 2
      });
      const glowLine = new THREE.Line(geometry, glowMaterial);
      sceneRef.current.add(glowLine);
    });

    if (camera) {
      const frustumGeometry = new THREE.BoxGeometry(1, 1, 1);
      const material = new THREE.MeshBasicMaterial({
        color: '#ffffff',
        opacity: 0.2,
        transparent: true,
        wireframe: true
      });
      
      const frustumMesh = new THREE.Mesh(frustumGeometry, material);
      sceneRef.current.add(frustumMesh);

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
        
        const scale = camera.position.length() * 0.2;
        frustumMesh.scale.set(scale, scale, scale);
      };

      if (controls) {
        controls.addEventListener('change', updateFrustum);
        return () => controls.removeEventListener('change', updateFrustum);
      }
    }
  }, [nodes, edges, nodePositions, activeNode, camera, controls, is3D]);

  // Calculate viewport points for 2D projection
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

 // Render 2D view
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

      // Draw viewport with animated dotted lines
      if (camera) {
        const viewportBounds = calculateViewportBounds();
        if (viewportBounds) {
          const center = viewportBounds.center;
          const [cx, cy] = projectToCanvas([center.x, center.y, center.z], bounds, { width: canvas.width, height: canvas.height });
          
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 4]);
          ctx.lineDashOffset = (Date.now() / 50) % 8;
          
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

      requestAnimationFrame(render2D);
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

  // Utility functions for node colors
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
            {is3D ? '2D' : '3D'}
          </button>
        </div>
      </Card>
    </motion.div>
  );
};

export default Minimap;
