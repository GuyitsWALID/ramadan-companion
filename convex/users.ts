import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// User mutations
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.optional(v.string()),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      location: args.location,
      prayerReminders: true,
      createdAt: new Date().toISOString(),
    });
    return userId;
  },
});

export const updateUserLocation = mutation({
  args: {
    userId: v.id("users"),
    location: v.object({
      latitude: v.number(),
      longitude: v.number(),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, location } = args;
    await ctx.db.patch(userId, { location });
    return userId;
  },
});

// User queries
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
    return user;
  },
});

export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user;
  },
});

// Prayer times mutations
export const savePrayerTimes = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const prayerTimesId = await ctx.db.insert("prayerTimes", args);
    return prayerTimesId;
  },
});

// Prayer times queries
export const getPrayerTimes = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const prayerTimes = await ctx.db
      .query("prayerTimes")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();
    return prayerTimes;
  },
});

export const getPrayerTimesForMonth = query({
  args: {
    userId: v.id("users"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const startDate = `${args.year}-${args.month.toString().padStart(2, '0')}-01`;
    const endDate = `${args.year}-${args.month.toString().padStart(2, '0')}-31`;
    
    const prayerTimes = await ctx.db
      .query("prayerTimes")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).gte("date", startDate).lte("date", endDate)
      )
      .collect();
    
    return prayerTimes;
  },
});

// Quran progress mutations
export const saveQuranProgress = mutation({
  args: {
    userId: v.id("users"),
    date: v.string(),
    juzNumber: v.number(),
    versesRead: v.number(),
    totalVerses: v.number(),
    completed: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const progressId = await ctx.db.insert("quranProgress", args);
    return progressId;
  },
});

export const updateQuranReadingPlan = mutation({
  args: {
    userId: v.id("users"),
    dailyVerses: v.number(),
    currentJuz: v.number(),
    completedJuz: v.array(v.number()),
    startDate: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      quranReadingPlan: {
        dailyVerses: args.dailyVerses,
        currentJuz: args.currentJuz,
        completedJuz: args.completedJuz,
        startDate: args.startDate,
      },
    });
    return args.userId;
  },
});

// Quran progress queries
export const getQuranProgress = query({
  args: {
    userId: v.id("users"),
    date: v.string(),
  },
  handler: async (ctx, args) => {
    const progress = await ctx.db
      .query("quranProgress")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).eq("date", args.date)
      )
      .first();
    return progress;
  },
});

export const getQuranProgressForMonth = query({
  args: {
    userId: v.id("users"),
    year: v.number(),
    month: v.number(),
  },
  handler: async (ctx, args) => {
    const startDate = `${args.year}-${args.month.toString().padStart(2, '0')}-01`;
    const endDate = `${args.year}-${args.month.toString().padStart(2, '0')}-31`;
    
    const progress = await ctx.db
      .query("quranProgress")
      .withIndex("by_user_date", (q) => 
        q.eq("userId", args.userId).gte("date", startDate).lte("date", endDate)
      )
      .collect();
    
    return progress;
  },
});

// Islamic content queries
export const getIslamicContent = query({
  args: {
    category: v.optional(v.string()),
    type: v.optional(v.union(v.literal("article"), v.literal("video"), v.literal("podcast"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("islamicContent");
    
    if (args.category) {
      query = query.withIndex("by_category", (q) => q.eq("category", args.category));
    }
    
    if (args.type) {
      query = query.withIndex("by_type", (q) => q.eq("type", args.type));
    }
    
    const content = await query.collect();
    
    if (args.limit) {
      return content.slice(0, args.limit);
    }
    
    return content;
  },
});

// Ramadan calendar queries
export const getRamadanCalendar = query({
  args: {
    year: v.number(),
    city: v.string(),
    country: v.string(),
  },
  handler: async (ctx, args) => {
    const calendar = await ctx.db
      .query("ramadanCalendar")
      .filter((q) => 
        q.eq(q.field("city"), args.city).eq(q.field("country"), args.country)
      )
      .collect();
    
    return calendar;
  },
});