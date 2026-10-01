import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanName, groupLedger, requireClerkId, requireOwnedGroup } from "./lib/auth";
import { calculateBalances, simplifyBalances } from "./lib/ledger";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_owner", (q) => q.eq("ownerClerkId", identity.subject))
      .order("desc")
      .collect();
    return await Promise.all(
      groups.map(async (group) => {
        const { members, expenses, settlements } = await groupLedger(ctx, group._id);
        const balances = calculateBalances(members, expenses, settlements);
        const ownerMember = members.find((member: any) => member.linkedClerkId === identity.subject);
        return {
          ...group,
          memberCount: members.filter((member: any) => !member.archived).length,
          expenseCount: expenses.length,
          myBalance: balances.find((entry) => entry.memberId === ownerMember?._id)?.amount ?? 0,
        };
      }),
    );
  },
});

export const detail = query({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    const { group } = await requireOwnedGroup(ctx, groupId);
    const { members, expenses, settlements } = await groupLedger(ctx, groupId);
    const balances = calculateBalances(members, expenses, settlements);
    const suggestions = simplifyBalances(balances);
    const receiptUrls = new Map<string, string | null>();
    for (const expense of expenses) {
      if (expense.receiptStorageId) {
        receiptUrls.set(expense._id, await ctx.storage.getUrl(expense.receiptStorageId));
      }
    }
    return {
      group,
      members: members.sort((a: any, b: any) => a.name.localeCompare(b.name)),
      balances: balances.sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name)),
      suggestions,
      expenses: expenses
        .sort((a: any, b: any) => b.date - a.date || b.createdAt - a.createdAt)
        .map((expense: any) => ({ ...expense, receiptUrl: receiptUrls.get(expense._id) ?? null })),
      settlements: settlements.sort((a: any, b: any) => b.date - a.date || b.createdAt - a.createdAt),
    };
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const { clerkId } = await requireClerkId(ctx);
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user || !user.name) throw new Error("Complete your profile first.");
    const now = Date.now();
    const groupId = await ctx.db.insert("groups", {
      ownerClerkId: clerkId,
      name: cleanName(args.name),
      currency: "USD",
      createdAt: now,
    });
    await ctx.db.insert("members", {
      groupId,
      linkedClerkId: clerkId,
      name: user.name,
      normalizedName: user.name.toLocaleLowerCase(),
      archived: false,
      createdAt: now,
    });
    return groupId;
  },
});

export const remove = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await requireOwnedGroup(ctx, groupId);
    const { members, expenses, settlements } = await groupLedger(ctx, groupId);
    for (const expense of expenses) {
      if (expense.receiptStorageId) await ctx.storage.delete(expense.receiptStorageId);
      await ctx.db.delete(expense._id);
    }
    for (const settlement of settlements) await ctx.db.delete(settlement._id);
    for (const member of members) await ctx.db.delete(member._id);
    await ctx.db.delete(groupId);
  },
});
