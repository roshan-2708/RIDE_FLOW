// tailwind.config.js
module.exports = {
    content: [
        './app/**/*.{js,ts,jsx,tsx}',
        './components/**/*.{js,ts,jsx,tsx}',
    ],
    theme: {
        extend: {
            fontFamily: {
                poppins: ['Poppins', 'sans-serif'],
            },
            transitionDuration: {
                '250': '250ms',
                '350': '350ms',
            },
        },
    },
    plugins: [],
};