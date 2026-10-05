import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { cleanName, groupLedger, requireOwnedGroup } from "./lib/auth";
import { calculateBalances } from "./lib/ledger";

export const add = mutation({
  args: { groupId: v.id("groups"), name: v.string() },
  handler: async (ctx, args) => {
    await requireOwnedGroup(ctx, args.groupId);
    const name = cleanName(args.name);
    const normalizedName = name.toLocaleLowerCase();
    const members = await ctx.db
      .query("members")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
    if (members.some((member: any) => member.normalizedName === normalizedName)) {
      throw new Error("A member with that name already exists.");
    }
    return await ctx.db.insert("members", {
      groupId: args.groupId,
      membershipType: "guest",
      membershipStatus: "active",
      name,
      normalizedName,
      archived: false,
      createdAt: Date.now(),
    });
  },
});

export const archive = mutation({
  args: { memberId: v.id("members") },
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found.");
    const { clerkId } = await requireOwnedGroup(ctx, member.groupId);
    if (member.linkedClerkId === clerkId) throw new Error("You cannot remove yourself from your group.");
    const { members, expenses, settlements } = await groupLedger(ctx, member.groupId);
    const hasHistory = expenses.some(
      (expense: any) =>
        expense.payerId === memberId || expense.shares.some((share: any) => share.memberId === memberId),
    ) || settlements.some(
      (settlement: any) => settlement.fromMemberId === memberId || settlement.toMemberId === memberId,
    );
    if (!hasHistory) {
      await ctx.db.delete(memberId);
      return;
    }
    const balance = calculateBalances(members, expenses, settlements).find(
      (entry) => entry.memberId === memberId,
    )?.amount;
    if (balance !== 0) throw new Error("Settle this member's balance before archiving them.");
    await ctx.db.patch(memberId, { archived: true });
  },
});
