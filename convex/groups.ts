import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanName, groupLedger, requireClerkId, requireGroupMember, requireOwnedGroup } from "./lib/auth";
import { calculateBalances, simplifyBalances } from "./lib/ledger";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];
    const ownedGroups = await ctx.db
      .query("groups")
      .withIndex("by_owner", (q) => q.eq("ownerClerkId", identity.subject))
      .order("desc")
      .collect();
    const memberships = await ctx.db
      .query("members")
      .withIndex("by_linked_user", (q) => q.eq("linkedClerkId", identity.subject))
      .collect();
    const memberGroups = await Promise.all(
      memberships
        .filter((member) => !member.archived && member.membershipStatus !== "invited")
        .map((member) => ctx.db.get(member.groupId)),
    );
    const groups = [...new Map([...ownedGroups, ...memberGroups.filter(Boolean)].map((group) => [group!._id, group!])).values()];
    return await Promise.all(
      groups.map(async (group) => {
        const { members, expenses, settlements } = await groupLedger(ctx, group._id);
        const balances = calculateBalances(members, expenses, settlements);
        const ownerMember = members.find((member: any) => member.linkedClerkId === identity.subject);
        return {
          ...group,
          memberCount: members.filter((member: any) => !member.archived && member.membershipStatus !== "invited").length,
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
    const access = await requireGroupMember(ctx, groupId);
    const { group } = access;
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
      isOwner: access.isOwner,
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
      userId: user._id,
      membershipType: "registered",
      membershipStatus: "active",
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
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
      .collect();
    for (const expense of expenses) {
      if (expense.receiptStorageId) await ctx.storage.delete(expense.receiptStorageId);
      await ctx.db.delete(expense._id);
    }
    for (const settlement of settlements) await ctx.db.delete(settlement._id);
    for (const invitation of invitations) await ctx.db.delete(invitation._id);
    for (const member of members) await ctx.db.delete(member._id);
    await ctx.db.delete(groupId);
  },
});
