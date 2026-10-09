import React from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 50 }}
          className="fixed bottom-24 left-6 right-6 md:left-auto md:right-8 z-[60] flex items-center gap-3 rounded-2xl bg-amber-600 px-5 py-3 text-sm font-bold text-white shadow-2xl border border-amber-500/50 backdrop-blur-md"
        >
          <div className="bg-white/20 p-1.5 rounded-lg animate-pulse">
            <WifiOff size={18} />
          </div>
          <div>
            <p className="leading-tight">Đang ở chế độ ngoại tuyến</p>
            <p className="text-[10px] opacity-80 font-medium">Bạn có thể tiếp tục xem dữ liệu đã lưu.</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
