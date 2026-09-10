/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        aerodark: {
          950: '#0B1220', // Main background
          900: '#111827', // Secondary background / Header / Nav
          850: '#151E2E', // Panel background
          800: '#1B2638', // Elevated panel / Card header
          750: '#212E42', // Elevated hover / Active pill
          700: '#263449', // Borders & dividers
          650: '#2E3E56', // Subtle accent border
          600: '#33435C', // Hover border
          500: '#475975'  // Muted border
        },
        aeroblue: {
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          300: '#7DD3FC',
          400: '#38BDF8',
          500: '#0284C7',
          600: '#2563EB',
          700: '#1D4ED8',
          800: '#1E40AF',
          900: '#1E3A8A'
        },
        aerocyan: {
          400: '#38BDF8',
          500: '#0284C7',
          300: '#7DD3FC'
        },
        aerogreen: {
          400: '#34D399',
          500: '#10B981',
          600: '#059669'
        },
        aeroamber: {
          400: '#FBBF24',
          500: '#F59E0B',
          600: '#D97706'
        },
        aerored: {
          400: '#F87171',
          500: '#EF4444',
          600: '#DC2626'
        }
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
        sans: ['Inter', 'Segoe UI', '-apple-system', 'BlinkMacSystemFont', 'sans-serif']
      }
    },
  },
  plugins: [],
}
