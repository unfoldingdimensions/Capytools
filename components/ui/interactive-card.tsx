'use client';

import { motion } from 'framer-motion';
import { ReactNode } from 'react';

interface InteractiveCardProps {
  front: ReactNode;
  back: ReactNode;
}

export function InteractiveCard({ front, back }: InteractiveCardProps) {
  return (
    <motion.div
      className="relative h-full w-full rounded-xl shadow-sm"
      style={{ perspective: 1000 }}
    >
      <motion.div
        className="relative h-full w-full"
        style={{ transformStyle: 'preserve-3d' }}
        whileHover={{ rotateY: 180 }}
        transition={{ duration: 0.6 }}
      >
        {/* Front of the card */}
        <motion.div className="absolute inset-0" style={{ backfaceVisibility: 'hidden' }}>
          {front}
        </motion.div>

        {/* Back of the card */}
        <motion.div
          className="absolute inset-0 rounded-xl bg-white/10"
          style={{
            backfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
          }}
        >
          {back}
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
