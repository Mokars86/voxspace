/** @type {import('tailwindcss').Config} */
export default {
    darkMode: ["class"],
    content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./pages/**/*.{js,ts,jsx,tsx}",
    "./App.tsx",
  ],
  theme: {
  	extend: {
  		colors: {
  			primary: {
  				DEFAULT: '#ff1744',
  				foreground: '#ffffff'
  			},
  			secondary: {
  				DEFAULT: '#f50057',
  				foreground: '#ffffff'
  			},
  			background: '#ffffff',
  			foreground: '#0f172a',
  			muted: {
  				DEFAULT: '#f1f5f9',
  				foreground: '#64748b'
  			},
  			card: {
  				DEFAULT: '#ffffff',
  				foreground: '#0f172a'
  			}
  		},
  		fontFamily: {
  			sans: [
  				'Inter',
  				'ui-sans-serif',
  				'system-ui',
  				'-apple-system',
  				'BlinkMacSystemFont',
  				'Segoe UI',
  				'Roboto',
  				'Helvetica Neue',
  				'Arial',
  				'sans-serif'
  			],
  			heading: [
  				'SF Pro Display',
  				'Inter',
  				'sans-serif'
  			]
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
        animation: {
            "accordion-down": "accordion-down 0.2s ease-out",
            "accordion-up": "accordion-up 0.2s ease-out",
            "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        },
  	}
  },
  plugins: [],
}
