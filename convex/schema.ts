import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    prayerReminders: v.optional(v.boolean()),
    quranReadingPlan: v.optional(v.object({
      dailyVerses: v.number(),
      currentJuz: v.number(),
      completedJuz: v.array(v.number()),
      startDate: v.string(),
    })),
    createdAt: v.string(),
  })
    .index("by_email", ["email"]),

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

  quranProgress: defineTable({
    userId: v.id("users"),
    date: v.string(),
    juzNumber: v.number(),
    versesRead: v.number(),
    totalVerses: v.number(),
    completed: v.boolean(),
    notes: v.optional(v.string()),
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