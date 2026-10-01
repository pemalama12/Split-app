import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { groupLedger, requireOwnedGroup } from "./lib/auth";
import { calculateReceiptShares, splitEvenly } from "./lib/ledger";

const splitType = v.union(v.literal("equal"), v.literal("custom"), v.literal("receipt"));
const customShare = v.object({ memberId: v.id("members"), amount: v.number() });
const receiptItem = v.object({
  key: v.string(),
  name: v.string(),
  amount: v.number(),
  assigneeIds: v.array(v.id("members")),
});

const expenseFields = {
  groupId: v.id("groups"),
  description: v.string(),
  amount: v.number(),
  payerId: v.id("members"),
  splitType,
  participantIds: v.optional(v.array(v.id("members"))),
  customShares: v.optional(v.array(customShare)),
  date: v.number(),
  notes: v.optional(v.string()),
  receiptStorageId: v.optional(v.id("_storage")),
  subtotal: v.optional(v.number()),
  tax: v.optional(v.number()),
  tip: v.optional(v.number()),
  items: v.optional(v.array(receiptItem)),
};

function validateCents(value: number, label: string, allowZero = false) {
  if (!Number.isSafeInteger(value) || value < (allowZero ? 0 : 1)) {
    throw new Error(`${label} must be a valid amount.`);
  }
}

async function prepareExpense(ctx: any, args: any) {
  await requireOwnedGroup(ctx, args.groupId);
  const description = args.description.trim();
  if (!description || description.length > 100) throw new Error("Enter an expense name.");
  validateCents(args.amount, "Total");

  const members = await ctx.db
    .query("members")
    .withIndex("by_group", (q: any) => q.eq("groupId", args.groupId))
    .collect();
  const memberIds = new Set(members.map((member: any) => member._id));
  if (!memberIds.has(args.payerId)) throw new Error("Choose a payer from this group.");

  let shares: Array<{ memberId: any; amount: number }>;
  if (args.splitType === "equal") {
    const participantIds = args.participantIds ?? [];
    if (participantIds.some((id: any) => !memberIds.has(id))) throw new Error("Invalid participant.");
    shares = splitEvenly(args.amount, participantIds);
  } else if (args.splitType === "custom") {
    shares = args.customShares ?? [];
    if (!shares.length || shares.some((share) => !memberIds.has(share.memberId))) {
      throw new Error("Add at least one valid participant.");
    }
    const unique = new Set(shares.map((share) => share.memberId));
    if (unique.size !== shares.length) throw new Error("Each participant can appear only once.");
    shares.forEach((share) => validateCents(share.amount, "Share"));
    if (shares.reduce((sum, share) => sum + share.amount, 0) !== args.amount) {
      throw new Error("Custom shares must equal the expense total.");
    }
  } else {
    const subtotal = args.subtotal;
    const tax = args.tax ?? 0;
    const tip = args.tip ?? 0;
    if (subtotal === undefined) throw new Error("Enter the receipt subtotal.");
    validateCents(subtotal, "Subtotal");
    validateCents(tax, "Tax", true);
    validateCents(tip, "Tip", true);
    if (subtotal + tax + tip !== args.amount) throw new Error("Subtotal, tax, and tip must equal the total.");
    const items = args.items ?? [];
    if (items.some((item: any) => item.assigneeIds.some((id: any) => !memberIds.has(id)))) {
      throw new Error("A receipt item has an invalid assignee.");
    }
    shares = calculateReceiptShares({ subtotal, tax, tip, items });
    if (shares.reduce((sum, share) => sum + share.amount, 0) !== args.amount) {
      throw new Error("Receipt shares do not equal the total.");
    }
  }

  return {
    groupId: args.groupId,
    description,
    amount: args.amount,
    payerId: args.payerId,
    splitType: args.splitType,
    shares,
    date: args.date,
    notes: args.notes?.trim() || undefined,
    receiptStorageId: args.receiptStorageId,
    subtotal: args.splitType === "receipt" ? args.subtotal : undefined,
    tax: args.splitType === "receipt" ? args.tax ?? 0 : undefined,
    tip: args.splitType === "receipt" ? args.tip ?? 0 : undefined,
    items: args.splitType === "receipt" ? args.items : undefined,
  };
}

export const get = query({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, { expenseId }) => {
    const expense = await ctx.db.get(expenseId);
    if (!expense) return null;
    await requireOwnedGroup(ctx, expense.groupId);
    const members = await ctx.db
      .query("members")
      .withIndex("by_group", (q) => q.eq("groupId", expense.groupId))
      .collect();
    const receiptUrl = expense.receiptStorageId
      ? await ctx.storage.getUrl(expense.receiptStorageId)
      : null;
    return { expense, members, receiptUrl };
  },
});

export const create = mutation({
  args: expenseFields,
  handler: async (ctx, args) => {
    const values = await prepareExpense(ctx, args);
    const now = Date.now();
    return await ctx.db.insert("expenses", { ...values, createdAt: now, updatedAt: now });
  },
});

export const update = mutation({
  args: { expenseId: v.id("expenses"), ...expenseFields },
  handler: async (ctx, args) => {
    const current = await ctx.db.get(args.expenseId);
    if (!current) throw new Error("Expense not found.");
    if (current.groupId !== args.groupId) throw new Error("Expense does not belong to this group.");
    const values = await prepareExpense(ctx, args);
    if (current.receiptStorageId && current.receiptStorageId !== args.receiptStorageId) {
      await ctx.storage.delete(current.receiptStorageId);
    }
    await ctx.db.patch(args.expenseId, { ...values, updatedAt: Date.now() });
  },
});

export const remove = mutation({
  args: { expenseId: v.id("expenses") },
  handler: async (ctx, { expenseId }) => {
    const expense = await ctx.db.get(expenseId);
    if (!expense) return;
    await requireOwnedGroup(ctx, expense.groupId);
    if (expense.receiptStorageId) await ctx.storage.delete(expense.receiptStorageId);
    await ctx.db.delete(expenseId);
  },
});

export const generateUploadUrl = mutation({
  args: { groupId: v.id("groups") },
  handler: async (ctx, { groupId }) => {
    await requireOwnedGroup(ctx, groupId);
    return await ctx.storage.generateUploadUrl();
  },
});
