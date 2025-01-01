// minimap/3d.tsx
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { MinimapProps } from './types';
import { getNodeColor } from './utils';

export const setup3DScene = (
  container: HTMLDivElement,
  onControlsRef: (controls: OrbitControls) => void
) => {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#0f172a');

  const renderer = new THREE.WebGLRenderer({ 
    antialias: true,
    alpha: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(192, 144);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  container.appendChild(renderer.domElement);

  const minimapCamera = new THREE.PerspectiveCamera(75, 192/144, 0.1, 1000);
  minimapCamera.position.set(0, 10, 10);
  minimapCamera.lookAt(0, 0, 0);

  const minimapControls = new OrbitControls(minimapCamera, renderer.domElement);
  minimapControls.enableDamping = true;
  minimapControls.dampingFactor = 0.05;
  minimapControls.rotateSpeed = 0.5;
  minimapControls.zoomSpeed = 0.5;
  onControlsRef(minimapControls);

  // Post-processing
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, minimapCamera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(192, 144),
    1.5, // intensity
    0.4, // radius
    0.85 // threshold
  );
  composer.addPass(bloomPass);

  return {
    scene,
    renderer,
    camera: minimapCamera,
    controls: minimapControls,
    composer,
    cleanup: () => {
      minimapControls.dispose();
      renderer.dispose();
      container.removeChild(renderer.domElement);
    }
  };
};

const createTorchEffect = (frustumMesh: THREE.Mesh, scene: THREE.Scene) => {
  const torchLight = new THREE.SpotLight('#ffffff', 2);
  torchLight.position.set(0, 0, 0);
  torchLight.angle = Math.PI / 6;
  torchLight.penumbra = 0.3;
  torchLight.decay = 2;
  torchLight.distance = 20;
  
  const volumetricLight = new THREE.Mesh(
    new THREE.ConeGeometry(2, 10, 32),
    new THREE.MeshBasicMaterial({
      color: '#ffffff',
      transparent: true,
      opacity: 0.1,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending
    })
  );
  volumetricLight.rotation.x = Math.PI;
  torchLight.add(volumetricLight);
  
  frustumMesh.add(torchLight);

  const ambientLight = new THREE.AmbientLight('#ffffff', 0.2);
  scene.add(ambientLight);
};

export const update3DScene = (
  scene: THREE.Scene,
  nodes: MinimapProps['nodes'],
  edges: MinimapProps['edges'],
  nodePositions: MinimapProps['nodePositions'],
  activeNode: MinimapProps['activeNode'],
  camera?: THREE.Camera,
  controls?: OrbitControls
) => {
  scene.clear();

  // Add nodes with enhanced materials
  nodes.forEach(node => {
    const position = nodePositions.get(node.id);
    if (!position) return;

    const geometry = new THREE.SphereGeometry(0.3, 32, 32);
    const material = new THREE.MeshPhysicalMaterial({ 
      color: getNodeColor(node, activeNode),
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 0.9,
      clearcoat: 1,
      clearcoatRoughness: 0.1
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.set(...position);
    
    if (node.id === activeNode) {
      material.emissive = new THREE.Color('#fbbf24');
      material.emissiveIntensity = 0.5;
      
      const glowGeometry = new THREE.SphereGeometry(0.4, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: '#fbbf24',
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      sphere.add(glow);
    }
    
    scene.add(sphere);
  });

  // Enhanced edges with gradient effect
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
      opacity: 0.8,
      linewidth: 2
    });
    const line = new THREE.Line(geometry, material);
    scene.add(line);

    const glowMaterial = new THREE.LineBasicMaterial({
      color: '#6b7280',
      transparent: true,
      opacity: 0.4,
      linewidth: 3,
      blending: THREE.AdditiveBlending
    });
    const glowLine = new THREE.Line(geometry, glowMaterial);
    scene.add(glowLine);
  });

  if (camera) {
    const frustumGeometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: '#ffffff',
      opacity: 0.2,
      transparent: true,
      wireframe: true,
      blending: THREE.AdditiveBlending
    });
    
    const frustumMesh = new THREE.Mesh(frustumGeometry, material);
    scene.add(frustumMesh);

    createTorchEffect(frustumMesh, scene);

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
};
