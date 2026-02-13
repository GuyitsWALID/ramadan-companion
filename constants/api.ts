// API configuration and defaults for Content screen
// Add your API keys either via app.json `extra` or replace the placeholders below.

export const API_CONFIG = {
  // YouTube Data API key (recommended)
  youtubeApiKey: "AIzaSyDAEb2TVmcIZElVCPuxVJgKLGA3KmT2fUo", // e.g. process.env.YOUTUBE_API_KEY or set in app.json extra

  // Sunnah.com API key for hadiths (optional)
  sunnahApiKey: "",

  // RSS feeds to aggregate for articles (can edit/add more)
  articleFeeds: [
    "https://yaqeeninstitute.org/feed/",
    "https://muslimmatters.org/feed/",
    "https://bayyinah.com/blog/feed/"
  ],

  // Optional override endpoints
  endpoints: {
    quranRandom: "https://api.quran.com/api/v4/verses/random",
    sunnahRandom: "https://api.sunnah.com/v1/hadiths/random",
    // Sutanlab public hadith endpoint (no API key required) - used as alternative
    sutanlabHadithRandom: "https://sutanlab.id/api/hadith/random",
  },
};
