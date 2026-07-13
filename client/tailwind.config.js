/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'sans-serif'],
        body: ['"Public Sans"', 'sans-serif']
      },
      colors: {
        ink: '#1C2321',
        'ink-secondary': '#4A554F',
        muted: '#6B7A74',
        faint: '#A8A69E',
        appbg: '#F4F3EF',
        surface: '#FFFFFF',
        sidebar: '#FBFAF7',
        subtle: '#EFEDE6',
        border: '#E7E4DC',
        inputborder: '#D8D5CB',
        rowdivider: '#F4F3EF',
        primary: { DEFAULT: '#1F5C4D', hover: '#16453A' },
        dark: '#12332B',
        gold: '#C9A227',
        danger: { DEFAULT: '#9C3A2B', tint: '#FAE5E1' },
        warning: { ink: '#8A6116', tint: '#FFF3D6' },
        info: { ink: '#2B5C8A', tint: '#E3EEFA' },
        selected: { border: '#1F5C4D', bg: '#E2F0E9', text: '#16453A' }
      },
      borderRadius: {
        card: '14px',
        control: '10px',
        modal: '18px'
      },
      boxShadow: {
        modal: '0 24px 60px rgba(0,0,0,0.25)',
        primary: '0 2px 8px rgba(31,92,77,0.25)',
        toast: '0 8px 24px rgba(0,0,0,0.3)'
      },
      keyframes: {
        fadeUp: { from: { opacity: 0, transform: 'translateY(10px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        fade: { from: { opacity: 0 }, to: { opacity: 1 } }
      },
      animation: {
        fadeUp: 'fadeUp 0.3s ease',
        fadeUpFast: 'fadeUp 0.25s ease',
        fade: 'fade 0.2s ease'
      }
    }
  },
  plugins: []
};
