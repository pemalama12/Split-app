import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { groupLedger, requireOwnedGroup } from "./lib/auth";
import { calculateBalances, simplifyBalances } from "./lib/ledger";

export const create = mutation({
  args: {
    groupId: v.id("groups"),
    fromMemberId: v.id("members"),
    toMemberId: v.id("members"),
    amount: v.number(),
    date: v.number(),
  },
  handler: async (ctx, args) => {
    await requireOwnedGroup(ctx, args.groupId);
    if (!Number.isSafeInteger(args.amount) || args.amount <= 0) throw new Error("Enter a valid payment amount.");
    if (args.fromMemberId === args.toMemberId) throw new Error("Choose two different members.");
    const { members, expenses, settlements } = await groupLedger(ctx, args.groupId);
    const suggestion = simplifyBalances(calculateBalances(members, expenses, settlements)).find(
      (item) => item.fromMemberId === args.fromMemberId && item.toMemberId === args.toMemberId,
    );
    if (!suggestion) throw new Error("There is no current debt between these members.");
    if (args.amount > suggestion.amount) throw new Error("Payment cannot be larger than the current debt.");
    return await ctx.db.insert("settlements", { ...args, createdAt: Date.now() });
  },
});

export const remove = mutation({
  args: { settlementId: v.id("settlements") },
  handler: async (ctx, { settlementId }) => {
    const settlement = await ctx.db.get(settlementId);
    if (!settlement) return;
    await requireOwnedGroup(ctx, settlement.groupId);
    await ctx.db.delete(settlementId);
  },
});
