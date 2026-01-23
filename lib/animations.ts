import { Variants } from 'framer-motion';

export const animations: Record<string, Variants> = {
    fadeUp: {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
    },

    scaleIn: {
        hidden: { opacity: 0, scale: 0.9 },
        visible: { opacity: 1, scale: 1 },
    },

    slideLeft: {
        hidden: { opacity: 0, x: 20 },
        visible: { opacity: 1, x: 0 },
    },

    slideRight: {
        hidden: { opacity: 0, x: -20 },
        visible: { opacity: 1, x: 0 },
    },

    staggerContainer: {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.1,
            },
        },
    },
};
