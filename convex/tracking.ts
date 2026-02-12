import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// ==========================================
// USER PROFILE MANAGEMENT
// ==========================================

export const getOrCreateProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) return existing;

    // Get email from auth user
    const identity = await ctx.auth.getUserIdentity();
    const email = identity?.email || "";

    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      email,
      name: identity?.name || undefined,
      prayerReminders: true,
      ramadanReminders: true,
      onboardingCompleted: false,
      createdAt: new Date().toISOString(),
    });

    return await ctx.db.get(profileId);
  },
});

export const getProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const updateProfile = mutation({
  args: {
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
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const updates: Record<string, any> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.location !== undefined) updates.location = args.location;
    if (args.calculationMethod !== undefined) updates.calculationMethod = args.calculationMethod;
    if (args.madhab !== undefined) updates.madhab = args.madhab;
    if (args.prayerReminders !== undefined) updates.prayerReminders = args.prayerReminders;
    if (args.ramadanReminders !== undefined) updates.ramadanReminders = args.ramadanReminders;
    if (args.quranGoal !== undefined) updates.quranGoal = args.quranGoal;
    if (args.onboardingCompleted !== undefined) updates.onboardingCompleted = args.onboardingCompleted;

    await ctx.db.patch(profile._id, updates);
    return await ctx.db.get(profile._id);
  },
});

export const completeOnboarding = mutation({
  args: {
    name: v.string(),
    location: v.optional(v.object({
      latitude: v.number(),
      longitude: v.number(),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
    calculationMethod: v.string(),
    madhab: v.string(),
    prayerReminders: v.boolean(),
    ramadanReminders: v.boolean(),
    quranGoal: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (!profile) {
      const identity = await ctx.auth.getUserIdentity();
      const profileId = await ctx.db.insert("userProfiles", {
        userId,
        email: identity?.email || "",
        name: args.name,
        location: args.location,
        calculationMethod: args.calculationMethod,
        madhab: args.madhab,
        prayerReminders: args.prayerReminders,
        ramadanReminders: args.ramadanReminders,
        quranGoal: args.quranGoal,
        onboardingCompleted: true,
        createdAt: new Date().toISOString(),
      });
      return await ctx.db.get(profileId);
    }

    await ctx.db.patch(profile._id, {
      name: args.name,
      location: args.location,
      calculationMethod: args.calculationMethod,
      madhab: args.madhab,
      prayerReminders: args.prayerReminders,
      ramadanReminders: args.ramadanReminders,
      quranGoal: args.quranGoal,
      onboardingCompleted: true,
    });

    return await ctx.db.get(profile._id);
  },
});

// ==========================================
// PRAYER COMPLETION TRACKING
// ==========================================

export const savePrayerCompletion = mutation({
  args: {
    date: v.string(),
    fajr: v.boolean(),
    dhuhr: v.boolean(),
    asr: v.boolean(),
    maghrib: v.boolean(),
    isha: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const totalCompleted = [args.fajr, args.dhuhr, args.asr, args.maghrib, args.isha]
      .filter(Boolean).length;

    const existing = await ctx.db
      .query("prayerCompletions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        fajr: args.fajr,
        dhuhr: args.dhuhr,
        asr: args.asr,
        maghrib: args.maghrib,
        isha: args.isha,
        totalCompleted,
      });
      return existing._id;
    }

    return await ctx.db.insert("prayerCompletions", {
      userId,
      date: args.date,
      fajr: args.fajr,
      dhuhr: args.dhuhr,
      asr: args.asr,
      maghrib: args.maghrib,
      isha: args.isha,
      totalCompleted,
    });
  },
});

export const getPrayerCompletion = query({
  args: { date: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("prayerCompletions")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .first();
  },
});

export const getWeeklyPrayerStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const today = new Date();
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      days.push(date.toISOString().split("T")[0]);
    }

    const results = [];
    for (const date of days) {
      const completion = await ctx.db
        .query("prayerCompletions")
        .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", date))
        .first();

      results.push({
        date,
        dayName: new Date(date + "T12:00:00").toLocaleDateString("en", { weekday: "short" }),
        totalCompleted: completion?.totalCompleted ?? 0,
        percentage: completion ? Math.round((completion.totalCompleted / 5) * 100) : 0,
        fajr: completion?.fajr ?? false,
        dhuhr: completion?.dhuhr ?? false,
        asr: completion?.asr ?? false,
        maghrib: completion?.maghrib ?? false,
        isha: completion?.isha ?? false,
      });
    }

    return results;
  },
});

// ==========================================
// FASTING TRACKING
// ==========================================

export const saveFastingDay = mutation({
  args: {
    date: v.string(),
    ramadanDay: v.number(),
    status: v.union(
      v.literal("fasted"),
      v.literal("missed"),
      v.literal("excused")
    ),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("fastingDays")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status,
        notes: args.notes,
      });
      return existing._id;
    }

    return await ctx.db.insert("fastingDays", {
      userId,
      date: args.date,
      ramadanDay: args.ramadanDay,
      status: args.status,
      notes: args.notes,
    });
  },
});

export const getFastingDays = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("fastingDays")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// ==========================================
// QURAN PROGRESS
// ==========================================

export const saveQuranProgress = mutation({
  args: {
    date: v.string(),
    juzNumber: v.number(),
    versesRead: v.number(),
    totalVerses: v.number(),
    completed: v.boolean(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("quranProgress")
      .withIndex("by_user_date", (q) => q.eq("userId", userId).eq("date", args.date))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        juzNumber: args.juzNumber,
        versesRead: args.versesRead,
        totalVerses: args.totalVerses,
        completed: args.completed,
        notes: args.notes,
      });
      return existing._id;
    }

    return await ctx.db.insert("quranProgress", {
      userId,
      ...args,
    });
  },
});

export const getQuranProgressAll = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("quranProgress")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

// ==========================================
// STREAKS
// ==========================================

export const getStreaks = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("userStreaks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
  },
});

export const updateStreaks = mutation({
  args: {
    prayerStreak: v.optional(v.number()),
    fastingStreak: v.optional(v.number()),
    quranStreak: v.optional(v.number()),
    longestPrayerStreak: v.optional(v.number()),
    longestFastingStreak: v.optional(v.number()),
    longestQuranStreak: v.optional(v.number()),
    lastPrayerDate: v.optional(v.string()),
    lastFastingDate: v.optional(v.string()),
    lastQuranDate: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userStreaks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existing) {
      const updates: Record<string, any> = {};
      for (const [key, value] of Object.entries(args)) {
        if (value !== undefined) updates[key] = value;
      }
      // Update longest streaks if current exceeds them
      if (args.prayerStreak && args.prayerStreak > existing.longestPrayerStreak) {
        updates.longestPrayerStreak = args.prayerStreak;
      }
      if (args.fastingStreak && args.fastingStreak > existing.longestFastingStreak) {
        updates.longestFastingStreak = args.fastingStreak;
      }
      if (args.quranStreak && args.quranStreak > existing.longestQuranStreak) {
        updates.longestQuranStreak = args.quranStreak;
      }
      await ctx.db.patch(existing._id, updates);
      return existing._id;
    }

    return await ctx.db.insert("userStreaks", {
      userId,
      prayerStreak: args.prayerStreak ?? 0,
      fastingStreak: args.fastingStreak ?? 0,
      quranStreak: args.quranStreak ?? 0,
      longestPrayerStreak: args.longestPrayerStreak ?? args.prayerStreak ?? 0,
      longestFastingStreak: args.longestFastingStreak ?? args.fastingStreak ?? 0,
      longestQuranStreak: args.longestQuranStreak ?? args.quranStreak ?? 0,
      lastPrayerDate: args.lastPrayerDate,
      lastFastingDate: args.lastFastingDate,
      lastQuranDate: args.lastQuranDate,
    });
  },
});

// ==========================================
// AGGREGATE STATS (for Stats Dashboard)
// ==========================================

export const getDashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    // Get all prayer completions
    const prayerCompletions = await ctx.db
      .query("prayerCompletions")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Get all fasting days
    const fastingDays = await ctx.db
      .query("fastingDays")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Get all quran progress
    const quranProgress = await ctx.db
      .query("quranProgress")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    // Get streaks
    const streaks = await ctx.db
      .query("userStreaks")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    // Calculate prayer stats
    const totalPrayersCompleted = prayerCompletions.reduce((sum, p) => sum + p.totalCompleted, 0);
    const totalPrayersPossible = prayerCompletions.length * 5;
    const prayerCompletionRate = totalPrayersPossible > 0
      ? Math.round((totalPrayersCompleted / totalPrayersPossible) * 100) : 0;

    // Calculate per-prayer completion rates
    const prayerBreakdown = {
      fajr: prayerCompletions.filter(p => p.fajr).length,
      dhuhr: prayerCompletions.filter(p => p.dhuhr).length,
      asr: prayerCompletions.filter(p => p.asr).length,
      maghrib: prayerCompletions.filter(p => p.maghrib).length,
      isha: prayerCompletions.filter(p => p.isha).length,
      totalDays: prayerCompletions.length,
    };

    // Calculate fasting stats
    const fastingStats = {
      totalFasted: fastingDays.filter(f => f.status === "fasted").length,
      totalMissed: fastingDays.filter(f => f.status === "missed").length,
      totalExcused: fastingDays.filter(f => f.status === "excused").length,
      totalDays: fastingDays.length,
    };

    // Calculate quran stats
    const totalVersesRead = quranProgress.reduce((sum, q) => sum + q.versesRead, 0);
    const completedJuz = quranProgress.filter(q => q.completed).length;
    const uniqueJuzCompleted = [...new Set(quranProgress.filter(q => q.completed).map(q => q.juzNumber))].length;

    return {
      prayer: {
        totalCompleted: totalPrayersCompleted,
        totalPossible: totalPrayersPossible,
        completionRate: prayerCompletionRate,
        breakdown: prayerBreakdown,
        daysTracked: prayerCompletions.length,
      },
      fasting: fastingStats,
      quran: {
        totalVersesRead,
        completedJuz,
        uniqueJuzCompleted,
        daysRead: quranProgress.length,
      },
      streaks: streaks ? {
        prayer: streaks.prayerStreak,
        fasting: streaks.fastingStreak,
        quran: streaks.quranStreak,
        longestPrayer: streaks.longestPrayerStreak,
        longestFasting: streaks.longestFastingStreak,
        longestQuran: streaks.longestQuranStreak,
      } : {
        prayer: 0, fasting: 0, quran: 0,
        longestPrayer: 0, longestFasting: 0, longestQuran: 0,
      },
    };
  },
});
