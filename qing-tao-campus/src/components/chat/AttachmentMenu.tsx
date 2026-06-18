import { motion, AnimatePresence } from 'framer-motion';
import { FiImage, FiCamera, FiFile, FiMapPin, FiUser, FiVideo, FiPhone } from 'react-icons/fi';

interface AttachmentMenuProps {
  show: boolean;
  onClose: () => void;
  onImage: () => void;
  onCamera: () => void;
  onFile: () => void;
  onLocation: () => void;
  onVideoCall: () => void;
  onVoiceCall: () => void;
  onContactCard: () => void;
}

const menuItems = [
  { icon: FiImage, label: '相册', color: '#07c160', action: 'image' as const },
  { icon: FiCamera, label: '拍照', color: '#10aeff', action: 'camera' as const },
  { icon: FiFile, label: '文件', color: '#576b95', action: 'file' as const },
  { icon: FiMapPin, label: '位置', color: '#fa5151', action: 'location' as const },
  { icon: FiUser, label: '名片', color: '#07c160', action: 'contact' as const },
  { icon: FiPhone, label: '语音通话', color: '#1485ee', action: 'voiceCall' as const },
  { icon: FiVideo, label: '视频通话', color: '#fa5151', action: 'videoCall' as const },
];

export default function AttachmentMenu({
  show, onClose, onImage, onCamera, onFile, onLocation, onVideoCall, onVoiceCall, onContactCard,
}: AttachmentMenuProps) {
  const handlers: Record<string, () => void> = {
    image: onImage,
    camera: onCamera,
    file: onFile,
    location: onLocation,
    videoCall: onVideoCall,
    voiceCall: onVoiceCall,
    contact: onContactCard,
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/30"
            onClick={onClose}
          />
          <motion.div
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 bg-[#f7f7f7] dark:bg-[#1e1e1e] rounded-t-2xl"
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full" />
            </div>

            {/* Grid of options */}
            <div className="grid grid-cols-4 gap-4 px-4 py-5">
              {menuItems.map((item) => (
                <motion.button
                  key={item.action}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    handlers[item.action]?.();
                    onClose();
                  }}
                  className="flex flex-col items-center gap-2"
                >
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${item.color}15` }}
                  >
                    <item.icon className="text-2xl" style={{ color: item.color }} />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-gray-300">{item.label}</span>
                </motion.button>
              ))}

              {/* Cancel button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={onClose}
                className="flex flex-col items-center gap-2"
              >
                <div className="w-14 h-14 rounded-xl bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <span className="text-xl">✕</span>
                </div>
                <span className="text-xs text-gray-500">取消</span>
              </motion.button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
