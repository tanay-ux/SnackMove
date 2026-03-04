import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/useAppStore';
import { requestNotificationPermission } from '../lib/push';
import { SNACK_PACKS } from '../lib/snackPacks';
import type { SnackStyle, ActiveDay } from '../types';

const STYLE_COLORS: Record<SnackStyle, string> = {
  gentle: 'bg-accent-blue',
  energizing: 'bg-primary',
  strength: 'bg-accent-pink',
};

export default function OnboardingSnackStyle() {
  const location = useLocation();
  const navigate = useNavigate();
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const state = location.state as { startTime?: string; endTime?: string; activeDays?: number[] } | undefined;
  const [selected, setSelected] = useState<SnackStyle>('energizing');

  async function handleStart() {
    await completeOnboarding({
      startTime: state?.startTime ?? '09:00',
      endTime: state?.endTime ?? '17:00',
      activeDays: (state?.activeDays as ActiveDay[] | undefined) ?? [1, 2, 3, 4, 5],
      snackStyle: selected,
    });
    await requestNotificationPermission();
    navigate('/', { replace: true });
  }

  return (
    <div className="min-h-dvh bg-white safe-top flex flex-col px-5 pt-8 pb-10">
      <h1 className="text-2xl font-bold text-accent-gray mb-1">
        How should your movement feel?
      </h1>
      <p className="text-accent-gray/80 text-sm mb-6">
        Each style uses different exercises, select what works best for you. You can change it any time in settings.
      </p>

      <div className="space-y-4 flex-1">
        {(Object.keys(SNACK_PACKS) as SnackStyle[]).map((style) => {
          const pack = SNACK_PACKS[style];
          const isSelected = selected === style;
          const isRecommended = style === 'energizing';
          return (
            <button
              key={style}
              type="button"
              onClick={() => setSelected(style)}
              className={`w-full text-left rounded-card p-4 shadow-card border-2 transition-colors ${
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-transparent bg-gray-50 hover:bg-gray-100'
              } ${isRecommended ? 'ring-1 ring-primary/15' : ''}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`w-10 h-10 rounded-button ${STYLE_COLORS[style]} flex-shrink-0 flex items-center justify-center text-white font-bold`}
                >
                  {style[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-accent-gray">{pack.title}</span>
                    {isRecommended && (
                      <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                        Recommended
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-accent-gray/80 mt-0.5">{pack.subtitle}</p>
                  <p className="text-xs text-accent-gray/70 mt-2 leading-relaxed">{pack.explanation}</p>
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 ${
                    isSelected ? 'border-primary bg-primary' : 'border-gray-300'
                  }`}
                >
                  {isSelected && (
                    <svg className="w-full h-full text-white p-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={handleStart}
        className="mt-8 w-full bg-primary text-white font-semibold py-3.5 rounded-button"
      >
        Start Moving
      </button>
    </div>
  );
}
