import type { Config } from "tailwindcss";

/**
 * Espelha design/tokens.json.
 * Espaçamento: grid de 4px (padrão do Tailwind — 1 = 4px).
 * Raios: 3 tamanhos. Sombras: 2 níveis. Movimento: 120–240ms.
 */
export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: { DEFAULT: '1rem', lg: '1.5rem' },
			screens: { '2xl': '1200px' }
		},
		extend: {
			screens: {
				xs: '360px'
			},
			fontFamily: {
				sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
				display: ['Archivo', 'Inter', 'system-ui', 'sans-serif']
			},
			fontSize: {
				caption: ['0.75rem', { lineHeight: '1rem', letterSpacing: '0.04em', fontWeight: '500' }],
				small: ['0.875rem', { lineHeight: '1.25rem' }],
				body: ['1rem', { lineHeight: '1.5rem' }],
				title: ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }],
				'display-m': ['1.5rem', { lineHeight: '1.875rem', letterSpacing: '-0.02em', fontWeight: '700' }],
				'display-l': ['2rem', { lineHeight: '2.25rem', letterSpacing: '-0.02em', fontWeight: '700' }],
				'display-xl': ['2.5rem', { lineHeight: '2.75rem', letterSpacing: '-0.02em', fontWeight: '800' }]
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					light: 'hsl(var(--primary-light))',
					dark: 'hsl(var(--primary-dark))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				glass: {
					DEFAULT: 'hsl(var(--glass))',
					foreground: 'hsl(var(--glass-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				sm: 'var(--radius-sm)',
				md: 'var(--radius)',
				lg: 'var(--radius)',
				xl: 'var(--radius-lg)',
				'2xl': 'var(--radius-lg)'
			},
			backgroundImage: {
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-glass': 'var(--gradient-glass)',
				'gradient-card': 'var(--gradient-card)'
			},
			boxShadow: {
				sm: 'var(--shadow-sm)',
				DEFAULT: 'var(--shadow)',
				raised: 'var(--shadow-sm)',
				lg: 'var(--shadow-lg)',
				overlay: 'var(--shadow-lg)',
				glow: 'var(--shadow-lg)',
				glass: 'var(--shadow-sm)'
			},
			transitionDuration: {
				fast: '120ms',
				smooth: '180ms',
				slow: '240ms',
				DEFAULT: '180ms'
			},
			transitionTimingFunction: {
				DEFAULT: 'cubic-bezier(0.2, 0.8, 0.2, 1)',
				brand: 'cubic-bezier(0.2, 0.8, 0.2, 1)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-up': {
					from: { opacity: '0', transform: 'translateY(8px)' },
					to: { opacity: '1', transform: 'translateY(0)' }
				},
				'pulse-dot': {
					'0%, 100%': { opacity: '1' },
					'50%': { opacity: '0.35' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
				'accordion-up': 'accordion-up 180ms cubic-bezier(0.2, 0.8, 0.2, 1)',
				'fade-up': 'fade-up 240ms cubic-bezier(0.2, 0.8, 0.2, 1) both',
				'pulse-dot': 'pulse-dot 1.6s ease-in-out infinite'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
