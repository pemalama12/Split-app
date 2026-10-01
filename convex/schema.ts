import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const share = v.object({ memberId: v.id("members"), amount: v.number() });
const receiptItem = v.object({
  key: v.string(),
  name: v.string(),
  amount: v.number(),
  assigneeIds: v.array(v.id("members")),
});

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    name: v.string(),
    email: v.string(),
    updatedAt: v.number(),
  }).index("by_clerk", ["clerkId"]),

  groups: defineTable({
    ownerClerkId: v.string(),
    name: v.string(),
    currency: v.literal("USD"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerClerkId"]),

  members: defineTable({
    groupId: v.id("groups"),
    linkedClerkId: v.optional(v.string()),
    name: v.string(),
    normalizedName: v.string(),
    archived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_linked_user", ["linkedClerkId"]),

  expenses: defineTable({
    groupId: v.id("groups"),
    description: v.string(),
    amount: v.number(),
    payerId: v.id("members"),
    splitType: v.union(v.literal("equal"), v.literal("custom"), v.literal("receipt")),
    shares: v.array(share),
    date: v.number(),
    notes: v.optional(v.string()),
    receiptStorageId: v.optional(v.id("_storage")),
    subtotal: v.optional(v.number()),
    tax: v.optional(v.number()),
    tip: v.optional(v.number()),
    items: v.optional(v.array(receiptItem)),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_group", ["groupId"]),

  settlements: defineTable({
    groupId: v.id("groups"),
    fromMemberId: v.id("members"),
    toMemberId: v.id("members"),
    amount: v.number(),
    date: v.number(),
    createdAt: v.number(),
  }).index("by_group", ["groupId"]),
});
