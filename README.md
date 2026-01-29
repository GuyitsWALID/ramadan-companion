# Ramadan Companion App

A comprehensive mobile application designed to provide a personalized and spiritual experience for Muslims during the holy month of Ramadan.

## Features

### 🕌 Prayer Times
- Accurate prayer times based on your location
- Multiple calculation methods
- Prayer reminders with customizable notifications
- Track completed prayers
- Show next prayer time with countdown

### 📖 Quran Reading Plan
- Personalized Quran reading schedule
- Track progress through 30 Juz
- Daily verse goals
- Progress visualization
- Reading history and statistics

### 📅 Ramadan Calendar
- Complete Ramadan calendar with important dates
- Sehri and Iftar times
- Special events and Laylat al-Qadr reminders
- Day-by-day Ramadan progress

### 🔔 Smart Notifications
- Prayer time notifications with Adhan
- Pre-prayer reminders
- Quran reading reminders
- Ramadan special notifications (Sehri/Iftar)
- Customizable notification settings

### 📚 Islamic Content Library
- Articles on spirituality and Islamic topics
- Video lectures and tutorials
- Podcast reflections
- Content categorized by topic
- Search and filter functionality

### 👤 User Profile & Settings
- Personal prayer tracking
- Notification preferences
- Location settings
- Prayer calculation methods
- App customization options

### 💝 Support the App
- Donation system for app maintenance
- Multiple support tiers with benefits
- Non-profit status focus

## Tech Stack

### Frontend
- **React Native** with **Expo** for cross-platform development
- **TypeScript** for type safety
- **Expo Router** for file-based navigation
- **React Native Safe Area Context** for proper layouts
- **React Native Adhan** for prayer time calculations
- **Expo Notifications** for local notifications
- **Expo Location** for location-based features

### Backend
- **Convex** for real-time database and serverless functions
- **TypeScript** for backend type safety
- **AsyncStorage** for local data persistence

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI
- iOS Simulator (for iOS development) or Android Emulator (for Android development)

### Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ramadan-companion
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up Convex backend**
   ```bash
   npx convex dev
   ```
   This will initialize the Convex backend and provide you with environment variables.

4. **Configure environment variables**
   Create a `.env` file:
   ```
   EXPO_PUBLIC_CONVEX_URL=http://localhost:3000
   ```

5. **Start the development server**
   ```bash
   npm start
   ```

6. **Run the app**
   - Scan the QR code with Expo Go app on your device
   - Or run on simulator/emulator:
     ```bash
     npm run android  # for Android
     npm run ios      # for iOS
     ```

## Project Structure

```
ramadan-companion/
├── app/                    # React Native app screens
│   ├── (tabs)/            # Tab navigation screens
│   │   ├── index.tsx      # Home screen
│   │   ├── prayer.tsx     # Prayer times
│   │   ├── quran.tsx      # Quran reading
│   │   ├── calendar.tsx    # Ramadan calendar
│   │   ├── content.tsx     # Islamic content
│   │   └── profile.tsx     # User profile
│   ├── _layout.tsx         # Root layout
│   └── support.tsx         # Donation modal
├── convex/                  # Backend code
│   ├── schema.ts           # Database schema
│   ├── hello.ts            # Example functions
│   └── users.ts            # User-related functions
├── hooks/                  # Custom React hooks
│   ├── useNotificationManager.ts
│   └── usePrayerTimes.ts
├── utils/                  # Utility functions
│   ├── notifications.ts     # Notification helpers
│   ├── prayerTimes.ts      # Prayer time calculations
│   └── index.ts
└── assets/                 # App assets
    ├── fonts/
    ├── icons/
    └── images/
```

## Key Features Implementation

### Prayer Times Calculation
- Uses `react-native-adhan` library for accurate Islamic prayer calculations
- Supports multiple calculation methods (Muslim World League, ISNA, etc.)
- Location-based calculations using device GPS
- Handles timezone automatically

### Notification System
- Local notifications for prayer times
- Different notification channels for different types
- Customizable settings (sound, vibration, timing)
- Automatic rescheduling for daily prayers

### Quran Reading Tracker
- 30 Juz structure with progress tracking
- Daily verse goals based on Ramadan timeline
- Visual progress indicators
- Reading history and statistics

### Ramadan Calendar
- Complete Ramadan month planning
- Special events and nights highlighted
- Sehri/Iftar timing for each day
- Progress tracking through Ramadan

## Future Enhancements

- [ ] Social features (share progress, community challenges)
- [ ] Advanced prayer analytics and insights
- [ ] Qibla direction finder
- [ ] Islamic calendar integration
- [ ] Multiple language support
- [ ] Dark mode theme
- [ ] Widget support
- [ ] Apple Watch/Android Wear support

## Contributing

We welcome contributions to make this Ramadan Companion even better! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

Ramadan Companion is a non-profit project. If you find it beneficial, please consider:
- Rating the app on app stores
- Sharing with friends and family
- Supporting through donations (available in-app)
- Providing feedback and suggestions

**May Allah accept our efforts and reward you for using this app to enhance your worship during Ramadan.**

---

*Assalamu Alaikum Wa Rahmatullahi Wa Barakatuh*