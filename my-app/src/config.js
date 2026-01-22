/**
 * Global Configuration for the Application
 * Store all API keys and environment specific variables here.
 */

const isDev = import.meta.env.MODE === 'development';

const config = {
    // Backend API URL
    API_URL: isDev ? "http://localhost:5002/api" : "https://oasispatna.onrender.com/api",
    SOCKET_URL: isDev ? "http://localhost:5002" : "https://oasispatna.onrender.com",

    // Payment Gateway Configuration
    PAYMENT: {
        PROVIDER: "Stripe", // 'Razorpay' or 'Stripe'

        // Stripe Public Key (Publishable Key)
        STRIPE_PUBLIC_KEY: "", // To be provided via environment/build

        // Razorpay Key ID
        RAZORPAY_KEY_ID: "" // To be provided via environment/build
    },

    // Feature Flags
    FEATURES: {
        ENABLE_NOTIFICATIONS: true,
        ENABLE_DARK_MODE: false
    }
};

export default config;
