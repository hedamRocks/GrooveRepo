// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-04-03',
  devtools: { enabled: true },

  modules: ['@nuxtjs/tailwindcss'],

  css: ['~/assets/css/main.css'],

  runtimeConfig: {
    // Private keys (only available server-side)
    discogsConsumerKey: process.env.DISCOGS_CONSUMER_KEY,
    discogsConsumerSecret: process.env.DISCOGS_CONSUMER_SECRET,
    discogsCallbackUrl: process.env.DISCOGS_CALLBACK_URL,
    sessionSecret: process.env.SESSION_SECRET,
    emailFrom: process.env.EMAIL_FROM,
    resendApiKey: process.env.RESEND_API_KEY,
    databaseUrl: process.env.DATABASE_URL,

    // Public keys (exposed to client)
    public: {
      baseUrl: process.env.BASE_URL || 'http://localhost:3000',
    }
  },
})
