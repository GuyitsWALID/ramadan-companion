import { mutation, query } from "./_generated/server";

export const get = query(() => {
  return "Hello from Convex!";
});

export const hello = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    console.log("Hello mutation called with:", args.name);
    return `Hello ${args.name}!`;
  },
});