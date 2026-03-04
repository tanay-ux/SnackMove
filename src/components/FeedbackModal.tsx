import { useState, useRef } from 'react';

type FeedbackType = 'bug' | 'feedback';

interface Props {
  onClose: () => void;
}

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

    setTimeout(() => {
      setSending(false);
      setSent(true);
      setTimeout(() => onClose(), 1200);
    }, 600);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 max-w-[480px] mx-auto"
      onClick={onClose}
    >
      <div
        className="w-full bg-white rounded-t-[1.5rem] p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] animate-slide-up max-h-[85dvh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {sent ? (
          <div className="text-center py-8">
            <div className="text-3xl mb-3">&#10003;</div>
            <p className="text-accent-gray font-semibold">Thanks for your {type}!</p>
            <p className="text-sm text-accent-gray/70 mt-1">Your email client should have opened with the message.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-accent-gray">Give feedback</h2>
              <button type="button" onClick={onClose} className="text-accent-gray/60 p-1">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Type toggle */}
            <div className="flex gap-2 mb-4">
              <button
                type="button"
                onClick={() => setType('feedback')}
                className={`flex-1 py-2.5 rounded-button text-sm font-medium border-2 transition-colors ${
                  type === 'feedback'
                    ? 'border-primary bg-primary/5 text-accent-gray'
                    : 'border-gray-200 bg-white text-accent-gray/70'
                }`}
              >
                Feedback
              </button>
              <button
                type="button"
                onClick={() => setType('bug')}
                className={`flex-1 py-2.5 rounded-button text-sm font-medium border-2 transition-colors ${
                  type === 'bug'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 bg-white text-accent-gray/70'
                }`}
              >
                Report a bug
              </button>
            </div>

            {/* Message */}
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={type === 'bug' ? 'Describe the bug and steps to reproduce it...' : 'Tell us what you think or how we can improve...'}
              rows={4}
              className="w-full rounded-button border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-accent-gray placeholder:text-accent-gray/40 resize-none focus:outline-none focus:border-primary mb-3"
            />

            {/* Image upload */}
            <div className="mb-4">
              {imagePreview ? (
                <div className="relative inline-block">
                  <img src={imagePreview} alt="Attached" className="h-20 rounded-lg object-cover" />
                  <button
                    type="button"
                    onClick={removeImage}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                  >
                    &times;
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex items-center gap-2 text-sm text-primary font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                  Attach screenshot
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageChange}
              />
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={!message.trim() || sending}
              className="w-full bg-primary text-white font-semibold py-2.5 rounded-button disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Opening email...' : 'Submit'}
            </button>

            <p className="text-xs text-accent-gray/50 text-center mt-3">
              This will open your email app with the message pre-filled.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
