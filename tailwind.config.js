/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx,mdx}', './components/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        arena: {
          bg:     '#04030A',
          panel:  '#08061A',
          border: 'rgba(139,92,246,0.15)',
          violet: '#8B5CF6',
          cyan:   '#06B6D4',
          gold:   '#F59E0B',
          red:    '#EF4444',
          green:  '#10B981',
          plasma: '#C084FC',
        }
      },
      fontFamily: {
        display: ['Syne', 'system-ui', 'sans-serif'],
        mono:    ['JetBrains Mono', 'monospace'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'spin-slow':    'spin 8s linear infinite',
        'spin-reverse': 'spin-reverse 6s linear infinite',
        'pulse-ring':   'pulseRing 2s cubic-bezier(0.4,0,0.6,1) infinite',
        'float':        'float 3s ease-in-out infinite',
        'clash':        'clash 0.5s ease-out forwards',
        'glow-pulse':   'glowPulse 2s ease-in-out infinite',
        'streak':       'streak 0.8s ease-out forwards',
        'fade-up':      'fadeUp 0.5s ease forwards',
        'scale-in':     'scaleIn 0.3s ease forwards',
      },
      keyframes: {
        'spin-reverse': { from: { transform: 'rotate(360deg)' }, to: { transform: 'rotate(0deg)' } },
        pulseRing: {
          '0%, 100%': { transform: 'scale(1)', opacity: '0.8' },
          '50%':      { transform: 'scale(1.15)', opacity: '0.4' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-8px)' },
        },
        clash: {
          '0%':   { transform: 'scale(1)' },
          '50%':  { transform: 'scale(1.3)' },
          '100%': { transform: 'scale(1)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(139,92,246,0.3)' },
          '50%':      { boxShadow: '0 0 60px rgba(139,92,246,0.8), 0 0 120px rgba(139,92,246,0.4)' },
        },
        streak: {
          '0%':   { transform: 'scaleX(0)', opacity: '1' },
          '100%': { transform: 'scaleX(1)', opacity: '0' },
        },
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(16px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.9)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
