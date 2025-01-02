import React from 'react';
import { MinimapProps } from './types';
import { getNodeColors, getViewportPoints } from './utils';

export const setup2DCanvas = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = canvas.offsetWidth * dpr;
  canvas.height = canvas.offsetHeight * dpr;
  ctx.scale(dpr, dpr);
};

export const render2D = (
  canvas: HTMLCanvasElement,
  nodes: MinimapProps['nodes'],
  edges: MinimapProps['edges'],
  nodePositions: MinimapProps['nodePositions'],
  activeNode: MinimapProps['activeNode'],
  camera: MinimapProps['camera']
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Calculate bounds
  const positions = Array.from(nodePositions.values());
  const bounds = positions.reduce(
    (acc, pos) => ({
      minX: Math.min(acc.minX, pos[0]),
      maxX: Math.max(acc.maxX, pos[0]),
      minY: Math.min(acc.minY, pos[1]),
      maxY: Math.max(acc.maxY, pos[1])
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  );

  // Project 3D to 2D
  const project = (pos: [number, number, number]): [number, number] => {
    const padding = 20;
    const width = canvas.width - 2 * padding;
    const height = canvas.height - 2 * padding;
    
    const x = padding + ((pos[0] - bounds.minX) / (bounds.maxX - bounds.minX)) * width;
    const y = canvas.height - (padding + ((pos[1] - bounds.minY) / (bounds.maxY - bounds.minY)) * height);
    
    return [x, y];
  };

  // Draw edges
  ctx.lineWidth = 1;
  edges.forEach(edge => {
    const startPos = nodePositions.get(edge.source);
    const endPos = nodePositions.get(edge.target);
    
    if (startPos && endPos) {
      const [x1, y1] = project(startPos);
      const [x2, y2] = project(endPos);
      
      ctx.shadowColor = 'rgba(71, 85, 105, 0.5)';
      ctx.shadowBlur = 4;
      ctx.strokeStyle = '#475569';
      
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Add very subtle directional animation for edges connected to active node
      if (edge.source === activeNode || edge.target === activeNode) {
        ctx.shadowColor = 'rgba(71, 85, 105, 0.3)';
        ctx.shadowBlur = 2;
        ctx.strokeStyle = 'rgba(107, 114, 128, 0.4)';
        ctx.setLineDash([3, 6]);
        ctx.lineDashOffset = -Date.now() / 150; // Slower animation
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  });

  // Draw nodes
  nodes.forEach(node => {
    const position = nodePositions.get(node.id);
    if (!position) return;
    const [x, y] = project(position);
    
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
      // Draw main node highlight
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw subtle directional split lines around active node
      const radius = 12; // Radius for split lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);
      ctx.lineDashOffset = Date.now() / 200; // Slower rotation

      // Draw split lines in a cross pattern
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI / 2) * i + (Date.now() / 2000); // Slow rotation
        ctx.beginPath();
        ctx.moveTo(
          x + Math.cos(angle) * radius,
          y + Math.sin(angle) * radius
        );
        ctx.lineTo(
          x + Math.cos(angle + Math.PI) * radius,
          y + Math.sin(angle + Math.PI) * radius
        );
        ctx.stroke();
      }
      ctx.setLineDash([]);
    }
  });

  // Draw viewport with moving split lines (more prominent)
  if (camera) {
    const viewportPoints = getViewportPoints(camera);
    const projectedPoints = viewportPoints.map(point => 
      project([point.x, point.y, point.z])
    );
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.beginPath();
    ctx.moveTo(projectedPoints[0][0], projectedPoints[0][1]);
    projectedPoints.forEach(([x, y]) => {
      ctx.lineTo(x, y);
    });
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 4]);
    ctx.lineDashOffset = (Date.now() / 50) % 8;
    ctx.stroke();
    
    ctx.setLineDash([]);
  }
};
