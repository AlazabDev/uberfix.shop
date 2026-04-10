import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

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
    		padding: {
    			DEFAULT: '1rem',
    			sm: '1.5rem',
    			lg: '2rem',
    		},
    		screens: {
    			'2xl': '1280px'
    		}
    	},
    	screens: {
    		'xs': '375px',
    		'sm': '640px',
    		'md': '768px',
    		'lg': '1024px',
    		'xl': '1280px',
    		'2xl': '1536px',
    	},
    	extend: {
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
    				foreground: 'hsl(var(--secondary-foreground))',
    				light: 'hsl(var(--secondary-light))'
    			},
    			success: {
    				DEFAULT: 'hsl(var(--success))',
    				foreground: 'hsl(var(--success-foreground))'
    			},
    			warning: {
    				DEFAULT: 'hsl(var(--warning))',
    				foreground: 'hsl(var(--warning-foreground))'
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
    			lg: 'var(--radius)',
    			md: 'calc(var(--radius) - 2px)',
    			sm: 'calc(var(--radius) - 4px)'
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
    			'pulse-soft': {
    				'0%, 100%': { opacity: '1', transform: 'scale(1)' },
    				'50%': { opacity: '0.85', transform: 'scale(1.03)' }
    			},
    			'pulse-ring': {
    				'0%': { transform: 'scale(0.95)', opacity: '1' },
    				'50%': { transform: 'scale(1.05)', opacity: '0.7' },
    				'100%': { transform: 'scale(1.15)', opacity: '0' }
    			},
    			float: {
    				'0%, 100%': { transform: 'translateY(0px)' },
    				'50%': { transform: 'translateY(-8px)' }
    			},
    			glow: {
    				'0%, 100%': { boxShadow: '0 0 16px rgba(255, 185, 0, 0.25)' },
    				'50%': { boxShadow: '0 0 32px rgba(255, 185, 0, 0.5)' }
    			},
    			shimmer: {
    				'0%': { backgroundPosition: '-200% 0' },
    				'100%': { backgroundPosition: '200% 0' }
    			}
    		},
    		animation: {
    			'accordion-down': 'accordion-down 0.2s ease-out',
    			'accordion-up': 'accordion-up 0.2s ease-out',
    			'pulse-soft': 'pulse-soft 3s ease-in-out infinite',
    			'pulse-ring': 'pulse-ring 2s ease-out infinite',
    			float: 'float 5s ease-in-out infinite',
    			glow: 'glow 3s ease-in-out infinite',
    			shimmer: 'shimmer 3s linear infinite'
    		},
    		fontFamily: {
    			sans: [
    				'Cairo',
    				'-apple-system',
    				'BlinkMacSystemFont',
    				'Segoe UI',
    				'sans-serif',
    				'Apple Color Emoji',
    				'Segoe UI Emoji'
    			],
    			serif: ['ui-serif', 'Georgia', 'serif'],
    			mono: ['ui-monospace', 'SFMono-Regular', 'monospace']
    		}
    	}
    },
	plugins: [tailwindcssAnimate],
} satisfies Config;
