import React, { Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { initialNodes, initialEdges } from '@/components/roadmapData'

const StellarRoadmap = lazy(() => import('@/components/stellar-node/index'))

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto p-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            NeetCode.io Roadmap
          </h1>
          <p className="text-gray-300 text-lg">
            Master data structures and algorithms with this structured learning path
          </p>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
        >
          <Suspense fallback={<div className="text-white text-center">Loading roadmap...</div>}>
            <StellarRoadmap nodes={initialNodes} edges={initialEdges} />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}

export default Index

