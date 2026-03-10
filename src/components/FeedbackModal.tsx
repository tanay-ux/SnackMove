import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

type FeedbackType = 'bug' | 'feedback';

interface Props {
  onClose: () => void;
}

const backdrop = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
};

const sheet = {
  hidden: { y: '100%' },
  visible: { y: 0, transition: { type: 'spring' as const, stiffness: 350, damping: 35 } },
  exit: { y: '100%', transition: { type: 'spring' as const, stiffness: 400, damping: 40 } },
};

export default function FeedbackModal({ onClose }: Props) {
  const [type, setType] = useState<FeedbackType>('feedback');
  const [message, setMessage] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleSubmit = () => {
    if (!message.trim()) return;
    setSending(true);
    const label = type === 'bug' ? 'Bug Report' : 'Feedback';
    const body = `[${label}]\n\n${message.trim()}${imagePreview ? '\n\n(Screenshot attached — if your email client did not include it, please attach manually)' : ''}`;
    const mailto = `mailto:photoplash.biz@gmail.com?subject=${encodeURIComponent('SnackMove Feedback/Report')}&body=${encodeURIComponent(body)}`;
    window.open(mailto, '_blank');
    setTimeout(() => { setSending(false); setSent(true); setTimeout(() => onClose(), 1200); }, 600);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end justify-center max-w-[480px] mx-auto"
      variants={backdrop}
      initial="hidden"
      animate="visible"
      exit="exit"
    >
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <motion.div
        className="w-full bg-white rounded-t-3xl p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] max-h-[85dvh] overflow-y-auto relative z-10"
        variants={sheet}
      >
        <div className="w-10 h-1 bg-gray-200 rounded-full mx-auto mb-4" />

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              className="text-center py-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            >
              <motion.div
                className="w-14 h-14 rounded-full bg-accent-green/15 flex items-center justify-center mx-auto mb-4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 500, damping: 25 }}
              >
                <svg className="w-7 h-7 text-accent-green" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </motion.div>
              <p className="text-accent-gray font-bold">Thanks for your {type}!</p>
              <p className="text-sm text-accent-gray mt-1">Your email client should have opened.</p>
            </motion.div>
          ) : (
            <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-accent-gray">Give feedback</h2>
                <motion.button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-surface flex items-center justify-center text-accent-gray"
                  whileTap={{ scale: 0.9 }}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>

              <div className="flex gap-2 mb-4">
                <motion.button
                  type="button"
                  onClick={() => setType('feedback')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    type === 'feedback'
                      ? 'border-primary bg-primary-50 text-primary'
                      : 'border-gray-100 bg-surface text-accent-gray'
                  }`}
                  whileTap={{ scale: 0.97 }}
                >
                  Feedback
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => setType('bug')}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors ${
                    type === 'bug'
                      ? 'border-red-400 bg-red-50 text-red-600'
                      : 'border-gray-100 bg-surface text-accent-gray'
                  }`}
                  whileTap={{ scale: 0.97 }}
                >
                  Report a bug
                </motion.button>
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={type === 'bug' ? 'Describe the bug...' : 'Tell us what you think...'}
                rows={4}
                className="w-full rounded-xl border border-gray-200 bg-surface px-3.5 py-3 text-sm text-accent-gray placeholder:text-accent-gray/60 resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-100 mb-3 transition-all"
              />

              <div className="mb-4">
                {imagePreview ? (
                  <div className="relative inline-block">
                    <img src={imagePreview} alt="Attached" className="h-20 rounded-xl object-cover" />
                    <motion.button
                      type="button"
                      onClick={removeImage}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      whileTap={{ scale: 0.85 }}
                    >
                      &times;
                    </motion.button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-2 text-sm text-primary font-semibold"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                    </svg>
                    Attach screenshot
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
              </div>

              <motion.button
                type="button"
                onClick={handleSubmit}
                disabled={!message.trim() || sending}
                className="w-full bg-primary text-white font-bold py-3 rounded-xl disabled:opacity-50 shadow-glow-sm"
                whileTap={{ scale: 0.97 }}
              >
                {sending ? 'Opening email...' : 'Submit'}
              </motion.button>

              <p className="text-[11px] text-accent-gray text-center mt-3">
                Opens your email app with a pre-filled message.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
