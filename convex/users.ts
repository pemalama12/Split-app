import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanName, requireClerkId } from "./lib/auth";

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    return await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", identity.subject))
      .unique();
  },
});

export const sync = mutation({
  args: { name: v.string(), email: v.string() },
  handler: async (ctx, args) => {
    const { clerkId } = await requireClerkId(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .unique();
    const name = args.name.trim().replace(/\s+/g, " ");
    const values = { name, email: args.email.trim().toLowerCase(), updatedAt: Date.now() };
    if (existing) {
      await ctx.db.patch(existing._id, {
        email: values.email,
        updatedAt: values.updatedAt,
        ...(existing.name.trim() ? {} : { name: values.name }),
      });
      return existing._id;
    }
    return await ctx.db.insert("users", { clerkId, ...values });
  },
});

export const updateName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { clerkId } = await requireClerkId(ctx);
    const name = cleanName(args.name);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error("Profile not found.");
    await ctx.db.patch(user._id, { name, updatedAt: Date.now() });
    const linked = await ctx.db
      .query("members")
      .withIndex("by_linked_user", (q) => q.eq("linkedClerkId", clerkId))
      .collect();
    for (const member of linked) {
      const conflict = await ctx.db
        .query("members")
        .withIndex("by_group", (q) => q.eq("groupId", member.groupId))
        .filter((q) => q.eq(q.field("normalizedName"), name.toLocaleLowerCase()))
        .first();
      if (conflict && conflict._id !== member._id) {
        throw new Error(`The name ${name} is already used in one of your groups.`);
      }
    }
    for (const member of linked) {
      await ctx.db.patch(member._id, { name, normalizedName: name.toLocaleLowerCase() });
    }
  },
});
