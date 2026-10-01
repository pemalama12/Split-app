import { query } from "./_generated/server";
import { requireClerkId } from "./lib/auth";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const { clerkId } = await requireClerkId(ctx);
    const groups = await ctx.db
      .query("groups")
      .withIndex("by_owner", (q) => q.eq("ownerClerkId", clerkId))
      .collect();
    const entries: any[] = [];
    for (const group of groups) {
      const members = await ctx.db
        .query("members")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();
      const names = new Map(members.map((member) => [member._id, member.name]));
      const expenses = await ctx.db
        .query("expenses")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();
      const settlements = await ctx.db
        .query("settlements")
        .withIndex("by_group", (q) => q.eq("groupId", group._id))
        .collect();
      entries.push(
        ...expenses.map((expense) => ({
          id: expense._id,
          type: "expense" as const,
          groupId: group._id,
          groupName: group.name,
          title: expense.description,
          subtitle: `${names.get(expense.payerId) ?? "Someone"} paid`,
          amount: expense.amount,
          timestamp: expense.date,
        })),
        ...settlements.map((settlement) => ({
          id: settlement._id,
          type: "settlement" as const,
          groupId: group._id,
          groupName: group.name,
          title: `${names.get(settlement.fromMemberId) ?? "Someone"} paid ${names.get(settlement.toMemberId) ?? "someone"}`,
          subtitle: "Settlement",
          amount: settlement.amount,
          timestamp: settlement.date,
        })),
      );
    }
    return entries.sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
  },
});
