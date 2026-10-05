import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireClerkId } from "./lib/auth";
import { splitEvenly } from "./lib/ledger";

const seedResult = v.object({ created: v.boolean(), groups: v.number(), members: v.number(), expenses: v.number(), settlements: v.number() });
const resetResult = v.object({ removedGroups: v.number(), skippedGroups: v.number() });

function requireDevelopmentSeeding() {
  if (process.env.ENABLE_DEVELOPMENT_SEEDING !== "true") {
    throw new Error("Development seed data is disabled for this deployment.");
  }
}

function cents(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error("Seed data must use positive integer cents.");
  return value;
}

export const seed = mutation({
  args: {},
  returns: seedResult,
  handler: async (ctx) => {
    requireDevelopmentSeeding();
    const { clerkId } = await requireClerkId(ctx);
    const user = await ctx.db.query("users").withIndex("by_clerk", (q) => q.eq("clerkId", clerkId)).unique();
    if (!user?.name) throw new Error("Complete your profile before adding development sample data.");
    const seededUser = user;
    const existing = await ctx.db.query("groups").withIndex("by_seed_owner", (q) => q.eq("seedOwnerClerkId", clerkId)).take(1);
    if (existing.length) return { created: false, groups: 0, members: 0, expenses: 0, settlements: 0 };

    const tag = clerkId;
    const now = Date.now();
    let groupCount = 0; let memberCount = 0; let expenseCount = 0; let settlementCount = 0;
    const daysAgo = (days: number) => now - days * 24 * 60 * 60 * 1000;

    async function makeGroup(name: string, guestNames: string[]) {
      const groupId = await ctx.db.insert("groups", { ownerClerkId: clerkId, seedOwnerClerkId: tag, name, currency: "USD", createdAt: daysAgo(groupCount * 4 + 16) }); groupCount += 1;
      const members: Record<string, any> = {};
      members.you = await ctx.db.insert("members", { groupId, linkedClerkId: clerkId, userId: seededUser._id, seedOwnerClerkId: tag, membershipType: "registered", membershipStatus: "active", name: seededUser.name, normalizedName: seededUser.name.toLocaleLowerCase(), archived: false, createdAt: daysAgo(groupCount * 4 + 16) }); memberCount += 1;
      for (const guestName of guestNames) { const key = guestName.toLowerCase(); members[key] = await ctx.db.insert("members", { groupId, seedOwnerClerkId: tag, membershipType: "guest", membershipStatus: "active", name: guestName, normalizedName: key, archived: false, createdAt: daysAgo(groupCount * 4 + 15) }); memberCount += 1; }
      return { groupId, members };
    }
    async function addExpense(groupId: any, payerId: any, description: string, amount: number, splitType: "equal" | "custom", shares: { memberId: any; amount: number }[], date: number) {
      cents(amount); if (!shares.length || shares.some((share) => !Number.isSafeInteger(share.amount) || share.amount <= 0) || shares.reduce((sum, share) => sum + share.amount, 0) !== amount) throw new Error("Invalid seeded expense shares.");
      await ctx.db.insert("expenses", { groupId, seedOwnerClerkId: tag, description, amount, payerId, splitType, shares, date, createdAt: date, updatedAt: date }); expenseCount += 1;
    }
    async function addSettlement(groupId: any, fromMemberId: any, toMemberId: any, amount: number, date: number) {
      cents(amount); await ctx.db.insert("settlements", { groupId, seedOwnerClerkId: tag, fromMemberId, toMemberId, amount, date, createdAt: date }); settlementCount += 1;
    }

    const austin = await makeGroup("Austin Trip", ["Maya", "Jordan", "Sam"]);
    await addExpense(austin.groupId, austin.members.you, "Airbnb", 42800, "equal", splitEvenly(42800, [austin.members.you, austin.members.maya, austin.members.jordan, austin.members.sam]), daysAgo(14));
    await addExpense(austin.groupId, austin.members.maya, "Uber", 3418, "equal", splitEvenly(3418, [austin.members.you, austin.members.maya, austin.members.jordan]), daysAgo(13));
    await addExpense(austin.groupId, austin.members.jordan, "Groceries", 7356, "custom", [{ memberId: austin.members.you, amount: 2500 }, { memberId: austin.members.maya, amount: 2500 }, { memberId: austin.members.sam, amount: 2356 }], daysAgo(12));
    await addExpense(austin.groupId, austin.members.you, "Gas", 5120, "equal", splitEvenly(5120, [austin.members.maya, austin.members.jordan]), daysAgo(11));
    await addSettlement(austin.groupId, austin.members.maya, austin.members.you, 1000, daysAgo(10));

    const apartment = await makeGroup("Apartment", ["Casey", "Rowan"]);
    await addExpense(apartment.groupId, apartment.members.casey, "Utilities", 18640, "custom", [{ memberId: apartment.members.you, amount: 7000 }, { memberId: apartment.members.casey, amount: 5240 }, { memberId: apartment.members.rowan, amount: 6400 }], daysAgo(9));
    await addExpense(apartment.groupId, apartment.members.you, "Internet", 6999, "equal", splitEvenly(6999, [apartment.members.you, apartment.members.casey, apartment.members.rowan]), daysAgo(8));
    await addSettlement(apartment.groupId, apartment.members.rowan, apartment.members.casey, 4000, daysAgo(7));

    const dinner = await makeGroup("Dinner with Friends", ["Priya"]);
    await addExpense(dinner.groupId, dinner.members.priya, "Dinner", 8642, "custom", [{ memberId: dinner.members.you, amount: 4321 }, { memberId: dinner.members.priya, amount: 4321 }], daysAgo(6));
    await addSettlement(dinner.groupId, dinner.members.you, dinner.members.priya, 4321, daysAgo(5));

    const weekend = await makeGroup("Weekend Trip", ["Noah", "Elena"]);
    await addExpense(weekend.groupId, weekend.members.you, "Coffee", 1875, "equal", splitEvenly(1875, [weekend.members.you, weekend.members.noah, weekend.members.elena]), daysAgo(4));
    await addExpense(weekend.groupId, weekend.members.noah, "Gas", 5120, "custom", [{ memberId: weekend.members.you, amount: 2000 }, { memberId: weekend.members.noah, amount: 1120 }, { memberId: weekend.members.elena, amount: 2000 }], daysAgo(3));
    await addExpense(weekend.groupId, weekend.members.elena, "Concert tickets", 12000, "custom", [{ memberId: weekend.members.you, amount: 5000 }, { memberId: weekend.members.noah, amount: 7000 }], daysAgo(2));

    return { created: true, groups: groupCount, members: memberCount, expenses: expenseCount, settlements: settlementCount };
  },
});

export const reset = mutation({
  args: {},
  returns: resetResult,
  handler: async (ctx) => {
    requireDevelopmentSeeding();
    const { clerkId } = await requireClerkId(ctx);
    const groups = await ctx.db.query("groups").withIndex("by_seed_owner", (q) => q.eq("seedOwnerClerkId", clerkId)).collect();
    let removedGroups = 0; let skippedGroups = 0;
    for (const group of groups) {
      const [members, expenses, settlements, invitations] = await Promise.all([
        ctx.db.query("members").withIndex("by_group", (q) => q.eq("groupId", group._id)).collect(),
        ctx.db.query("expenses").withIndex("by_group", (q) => q.eq("groupId", group._id)).collect(),
        ctx.db.query("settlements").withIndex("by_group", (q) => q.eq("groupId", group._id)).collect(),
        ctx.db.query("invitations").withIndex("by_group", (q) => q.eq("groupId", group._id)).collect(),
      ]);
      if ([...members, ...expenses, ...settlements].some((record) => record.seedOwnerClerkId !== clerkId) || invitations.length) { skippedGroups += 1; continue; }
      for (const expense of expenses) await ctx.db.delete(expense._id);
      for (const settlement of settlements) await ctx.db.delete(settlement._id);
      for (const member of members) await ctx.db.delete(member._id);
      await ctx.db.delete(group._id); removedGroups += 1;
    }
    return { removedGroups, skippedGroups };
  },
});
