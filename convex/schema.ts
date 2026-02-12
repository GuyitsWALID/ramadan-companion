import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Extended user profile (linked to auth user)
  userProfiles: defineTable({
    userId: v.string(), // Auth user ID (subject from token)
    email: v.string(),
    name: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    calculationMethod: v.optional(v.string()),
    madhab: v.optional(v.string()),
    prayerReminders: v.optional(v.boolean()),
    ramadanReminders: v.optional(v.boolean()),
    quranGoal: v.optional(v.number()),
    onboardingCompleted: v.optional(v.boolean()),
    quranReadingPlan: v.optional(v.object({
      dailyVerses: v.number(),
      currentJuz: v.number(),
      completedJuz: v.array(v.number()),
      startDate: v.string(),
    })),
    createdAt: v.string(),
  })
    .index("by_userId", ["userId"])
    .index("by_email", ["email"]),

  // Prayer completion tracking
  prayerCompletions: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    fajr: v.boolean(),
    dhuhr: v.boolean(),
    asr: v.boolean(),
    maghrib: v.boolean(),
    isha: v.boolean(),
    totalCompleted: v.number(), // 0-5
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_userId", ["userId"]),

  // Fasting tracking
  fastingDays: defineTable({
    userId: v.string(),
    date: v.string(), // YYYY-MM-DD
    ramadanDay: v.number(), // 1-30
    status: v.union(
      v.literal("fasted"),
      v.literal("missed"),
      v.literal("excused")
    ),
    notes: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_userId", ["userId"]),

  // Quran progress tracking
  quranProgress: defineTable({
    userId: v.string(),
    date: v.string(),
    juzNumber: v.number(),
    versesRead: v.number(),
    totalVerses: v.number(),
    completed: v.boolean(),
    notes: v.optional(v.string()),
  })
    .index("by_user_date", ["userId", "date"])
    .index("by_userId", ["userId"]),

  // User streaks
  userStreaks: defineTable({
    userId: v.string(),
    prayerStreak: v.number(),
    fastingStreak: v.number(),
    quranStreak: v.number(),
    longestPrayerStreak: v.number(),
    longestFastingStreak: v.number(),
    longestQuranStreak: v.number(),
    lastPrayerDate: v.optional(v.string()),
    lastFastingDate: v.optional(v.string()),
    lastQuranDate: v.optional(v.string()),
  })
    .index("by_userId", ["userId"]),

  // Legacy tables (keeping for backward compatibility during migration)
  // NOTE: "users" table is now managed by authTables (from @convex-dev/auth)
  // Do NOT redefine it here or it will conflict with Convex Auth.

  prayerTimes: defineTable({
    userId: v.id("users"),
    date: v.string(),
    fajr: v.string(),
    dhuhr: v.string(),
    asr: v.string(),
    maghrib: v.string(),
    isha: v.string(),
    sunrise: v.string(),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
    calculationMethod: v.number(),
  })
    .index("by_user_date", ["userId", "date"]),

  ramadanCalendar: defineTable({
    date: v.string(),
    dayNumber: v.number(),
    sehriTime: v.string(),
    iftarTime: v.string(),
    city: v.string(),
    country: v.string(),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
    }),
  })
    .index("by_date", ["date"]),

  islamicContent: defineTable({
    title: v.string(),
    type: v.union(v.literal("article"), v.literal("video"), v.literal("podcast")),
    content: v.string(),
    author: v.optional(v.string()),
    category: v.string(),
    tags: v.array(v.string()),
    url: v.optional(v.string()),
    duration: v.optional(v.number()),
    createdAt: v.string(),
  })
    .index("by_category", ["category"])
    .index("by_type", ["type"]),
});