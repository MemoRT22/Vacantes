export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: 'var(--primary)',
        purple: 'var(--purple)',
        yellow: 'var(--yellow)',
        blueMuted: 'var(--blueMuted)',
        red: 'var(--red)',
        green: 'var(--green)',
        orange: 'var(--orange)',
        magenta: 'var(--magenta)',
        teal: 'var(--teal)',
        bg: 'var(--bg)',
        fg: 'var(--fg)',
        border: 'var(--border)'
      },
      borderRadius: {
        xl: '16px',
        '2xl': '20px'
      }
    }
  },
  safelist: [
    'ring-[var(--primary)]', 'focus:ring-[var(--primary)]', 'focus:ring-[var(--red)]', 'focus:ring-[var(--purple)]',
    'bg-[#5B78B0]', 'bg-[#00AFA5]', 'bg-[#8D418C]', 'bg-[#F7AC2F]', 'bg-[#5BAE37]', 'bg-[#E94C64]',
    'text-[#5B78B0]', 'text-[#00AFA5]', 'text-[#8D418C]', 'text-[#F7AC2F]', 'text-[#5BAE37]', 'text-[#E94C64]',
    'border-[#5B78B0]', 'border-[#00AFA5]', 'border-[#8D418C]', 'border-[#F7AC2F]', 'border-[#5BAE37]', 'border-[#E94C64]'
  ],
  plugins: []
}