import React from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';

interface TopicCardProps {
  title: string;
  isCompleted?: boolean;
  difficulty: 'foundation' | 'intermediate' | 'advanced';
  'data-id'?: string;
}

const TopicCard = ({ title, isCompleted = false, difficulty, 'data-id': dataId }: TopicCardProps) => {
  const difficultyColors = {
    foundation: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10 border-blue-500/20',
    intermediate: 'bg-gradient-to-br from-indigo-500/10 to-indigo-600/10 border-indigo-500/20',
    advanced: 'bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 border-cyan-500/20'
  };

  const difficultyTextColors = {
    foundation: 'text-blue-400',
    intermediate: 'text-indigo-400',
    advanced: 'text-cyan-400'
  };

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card 
        className={`topic-card backdrop-blur-sm border ${difficultyColors[difficulty]} p-4`}
        data-id={dataId}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-lg text-gray-200">{title}</h3>
          {isCompleted && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
            >
              <CheckCircle className="h-5 w-5 text-green-400" />
            </motion.div>
          )}
        </div>
        <Badge 
          variant="secondary" 
          className={`mt-2 ${difficultyTextColors[difficulty]}`}
        >
          {difficulty}
        </Badge>
      </Card>
    </motion.div>
  );
};

export default TopicCard;