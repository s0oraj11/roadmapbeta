import { useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Node,
  Edge,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes: Node[] = [
  // Start Node
  { 
    id: 'start',
    data: { label: 'Level 1: Foundation' },
    position: { x: 450, y: 50 },
    className: 'start-node'
  },

  // Pattern Nodes
  { 
    id: 'p1',
    data: { label: '1. Counting Pattern' },
    position: { x: 200, y: 180 },
    className: 'pattern-node'
  },
  { 
    id: 'p2',
    data: { label: '2. Monotonic Stack/Queue' },
    position: { x: 700, y: 200 },
    className: 'pattern-node'
  },

  // Counting Pattern Branch
  { 
    id: 'c1',
    data: { label: '1A.1 Single Value Counter' },
    position: { x: 50, y: 280 },
    className: 'subpattern-node'
  },
  { 
    id: 'c2',
    data: { label: '1A.2 Conditional Counter' },
    position: { x: -50, y: 400 },
    className: 'subpattern-node'
  },
  { 
    id: 'c3',
    data: { label: '1A.3 Multi-Value Counter' },
    position: { x: 80, y: 520 },
    className: 'subpattern-node'
  },

  // Frequency Branch
  { 
    id: 'f1',
    data: { label: '1B.1 Frequency Map' },
    position: { x: 280, y: 320 },
    className: 'subpattern-node'
  },
  { 
    id: 'f2',
    data: { label: '1B.2 Group Frequency' },
    position: { x: 180, y: 450 },
    className: 'subpattern-node'
  },
  { 
    id: 'f3',
    data: { label: '1B.3 Freq of Frequencies' },
    position: { x: 320, y: 580 },
    className: 'subpattern-node'
  },

  // Window Branch
  { 
    id: 'w1',
    data: { label: '1C.1 Fixed Window' },
    position: { x: 480, y: 280 },
    className: 'subpattern-node'
  },
  { 
    id: 'w2',
    data: { label: '1C.2 Dynamic Window' },
    position: { x: 580, y: 420 },
    className: 'subpattern-node'
  },
  { 
    id: 'w3',
    data: { label: '1C.3 Multi-Condition' },
    position: { x: 450, y: 550 },
    className: 'subpattern-node'
  },

  // Next Greater Branch
  { 
    id: 'n1',
    data: { label: '2A.1 Next Greater Element' },
    position: { x: 780, y: 320 },
    className: 'subpattern-node'
  },
  { 
    id: 'n2',
    data: { label: '2A.2 Previous Greater' },
    position: { x: 680, y: 450 },
    className: 'subpattern-node'
  },
  { 
    id: 'n3',
    data: { label: '2A.3 Circular Array' },
    position: { x: 820, y: 580 },
    className: 'subpattern-node'
  },

  // Window Operations Branch
  { 
    id: 'm1',
    data: { label: '2B.1 Sliding Window Max' },
    position: { x: 980, y: 280 },
    className: 'subpattern-node'
  },
  { 
    id: 'm2',
    data: { label: '2B.2 Window Difference' },
    position: { x: 1080, y: 420 },
    className: 'subpattern-node'
  },
  { 
    id: 'm3',
    data: { label: '2B.3 Dynamic Window Sum' },
    position: { x: 950, y: 550 },
    className: 'subpattern-node'
  },
];

const initialEdges: Edge[] = [
  // Pattern Connections with animated edges and markers
  { 
    id: 'e-start-p1', 
    source: 'start', 
    target: 'p1', 
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-start-p2', 
    source: 'start', 
    target: 'p2', 
    animated: true,
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },

  // Counting Pattern Paths with markers
  { 
    id: 'e-p1-c1', 
    source: 'p1', 
    target: 'c1',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-p1-f1', 
    source: 'p1', 
    target: 'f1',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-p1-w1', 
    source: 'p1', 
    target: 'w1',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-c1-c2', 
    source: 'c1', 
    target: 'c2',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-c2-c3', 
    source: 'c2', 
    target: 'c3',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-f1-f2', 
    source: 'f1', 
    target: 'f2',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-f2-f3', 
    source: 'f2', 
    target: 'f3',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-w1-w2', 
    source: 'w1', 
    target: 'w2',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-w2-w3', 
    source: 'w2', 
    target: 'w3',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },

  // Monotonic Pattern Paths with markers
  { 
    id: 'e-p2-n1', 
    source: 'p2', 
    target: 'n1',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-p2-m1', 
    source: 'p2', 
    target: 'm1',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-n1-n2', 
    source: 'n1', 
    target: 'n2',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-n2-n3', 
    source: 'n2', 
    target: 'n3',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-m1-m2', 
    source: 'm1', 
    target: 'm2',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },
  { 
    id: 'e-m2-m3', 
    source: 'm2', 
    target: 'm3',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
  },

  // Cross Pattern Learning with markers
  { 
    id: 'e-w2-m1', 
    source: 'w2', 
    target: 'm1',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
    style: { stroke: '#9ca3af' },
  },
  { 
    id: 'e-f2-n1', 
    source: 'f2', 
    target: 'n1',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
    style: { stroke: '#9ca3af' },
  },

  // Parallel Learning Paths with markers
  { 
    id: 'e-c2-f2', 
    source: 'c2', 
    target: 'f2',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
    style: { stroke: '#9ca3af' },
  },
  { 
    id: 'e-w2-f3', 
    source: 'w2', 
    target: 'f3',
    markerEnd: {
      type: MarkerType.ArrowClosed,
      width: 20,
      height: 20,
      color: '#9ca3af',
    },
    style: { stroke: '#9ca3af' },
  },
];

const RoadmapFlow = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback((params) => setEdges((eds) => addEdge(params, eds)), []);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      className="rounded-xl overflow-hidden border border-gray-700 bg-gray-800/50 backdrop-blur-sm"
      style={{ width: '100%', height: '800px' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        fitView
        className="bg-gray-900/50"
      >
        <Controls className="bg-gray-800/80 border-gray-700" />
        <MiniMap className="bg-gray-800/80 border-gray-700" />
        <Background color="#4a5568" gap={16} size={1} />
      </ReactFlow>
    </motion.div>
  );
};

export default RoadmapFlow;
