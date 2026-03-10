import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', label: 'Home', icon: HomeIcon },
  { path: '/stats', label: 'Stats', icon: StatsIcon },
  { path: '/settings', label: 'Settings', icon: SettingsIcon },
];

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={active ? 0 : 2} viewBox="0 0 24 24" aria-hidden>
      {active ? (
        <path d="M3 12.5l1.5-1.5L12 4l7.5 7 1.5 1.5H18v7a1 1 0 01-1 1h-3a1 1 0 01-1-1v-4h-2v4a1 1 0 01-1 1H7a1 1 0 01-1-1v-7H3z" />
      ) : (
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      )}
    </svg>
  );
}

function StatsIcon({ active }: { active: boolean }) {
  return (
    <svg className="w-[22px] h-[22px]" fill={active ? 'currentColor' : 'none'} stroke={active ? 'none' : 'currentColor'} strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
      {active ? (
        <>
          <rect x="3" y="12" width="4" height="9" rx="1.5" />
          <rect x="10" y="7" width="4" height="14" rx="1.5" />
          <rect x="17" y="3" width="4" height="18" rx="1.5" />
        </>
      ) : (
        <>
          <rect x="3" y="12" width="4" height="9" rx="1" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="10" y="7" width="4" height="14" rx="1" strokeLinecap="round" strokeLinejoin="round" />
          <rect x="17" y="3" width="4" height="18" rx="1" strokeLinecap="round" strokeLinejoin="round" />
        </>
      )}
    </svg>
  );
}

function SettingsIcon({ active }: { active: boolean }) {
  return (
    <motion.svg
      className="w-[22px] h-[22px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={active ? 2.2 : 2}
      viewBox="0 0 24 24"
      aria-hidden
      animate={active ? { rotate: 45 } : { rotate: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </motion.svg>
  );
}

export default function BottomNav() {
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 max-w-[480px] mx-auto z-50 px-4 pt-2 pb-[calc(8px+env(safe-area-inset-bottom,0px))]"
      aria-label="Main navigation"
    >
      <div className="glass-strong rounded-[28px] shadow-nav border border-white/60 flex items-stretch overflow-hidden min-h-[60px] relative">
        {tabs.map(({ path, label, icon: Icon }) => {
          const active = location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              className="flex-1 flex items-center justify-center gap-2 min-w-0 relative py-2"
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  className="absolute inset-1.5 bg-primary rounded-[22px]"
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                />
              )}
              <motion.span
                className={`relative z-10 flex items-center justify-center shrink-0 ${active ? 'text-white' : 'text-accent-gray'}`}
                whileTap={{ scale: 0.85 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              >
                <Icon active={active} />
              </motion.span>
              {active && (
                <motion.span
                  className="relative z-10 text-[13px] font-semibold text-white truncate"
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05, duration: 0.2 }}
                >
                  {label}
                </motion.span>
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
