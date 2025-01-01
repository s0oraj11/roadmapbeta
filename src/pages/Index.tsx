import React, { Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { initialNodes, initialEdges } from '@/components/roadmapData'

const StellarRoadmap = lazy(() => import('@/components/stellar-roadmap/index'))

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-full mx-auto px-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center py-3"
        >
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
            NeetCode.io Roadmap
          </h1>
        </motion.div>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="h-[calc(100vh-4rem)]"
        >
          <Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-blue-400 animate-pulse">Loading roadmap...</div>
            </div>
          }>
            <StellarRoadmap nodes={initialNodes} edges={initialEdges} />
          </Suspense>
        </motion.div>
      </div>
    </div>
  )
}

export default Index
