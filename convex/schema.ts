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
    seedOwnerClerkId: v.optional(v.string()),
    name: v.string(),
    currency: v.literal("USD"),
    createdAt: v.number(),
  }).index("by_owner", ["ownerClerkId"]).index("by_seed_owner", ["seedOwnerClerkId"]),

  members: defineTable({
    groupId: v.id("groups"),
    linkedClerkId: v.optional(v.string()),
    seedOwnerClerkId: v.optional(v.string()),
    // Optional while existing memberships are progressively linked to users.
    userId: v.optional(v.id("users")),
    membershipType: v.optional(v.union(v.literal("guest"), v.literal("registered"))),
    membershipStatus: v.optional(v.union(v.literal("active"), v.literal("invited"))),
    name: v.string(),
    normalizedName: v.string(),
    archived: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_group", ["groupId"])
    .index("by_group_and_normalized_name", ["groupId", "normalizedName"])
    .index("by_linked_user", ["linkedClerkId"])
    .index("by_group_and_linked_user", ["groupId", "linkedClerkId"])
    .index("by_user", ["userId"]),

  invitations: defineTable({
    groupId: v.id("groups"),
    memberId: v.id("members"),
    token: v.string(),
    status: v.union(v.literal("pending"), v.literal("accepted"), v.literal("revoked")),
    createdByClerkId: v.string(),
    createdAt: v.number(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    acceptedByUserId: v.optional(v.id("users")),
  })
    .index("by_token", ["token"])
    .index("by_group", ["groupId"])
    .index("by_group_and_status", ["groupId", "status"])
    .index("by_member", ["memberId"]),

  expenses: defineTable({
    groupId: v.id("groups"),
    seedOwnerClerkId: v.optional(v.string()),
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
  }).index("by_group", ["groupId"]).index("by_seed_owner", ["seedOwnerClerkId"]),

  settlements: defineTable({
    groupId: v.id("groups"),
    seedOwnerClerkId: v.optional(v.string()),
    fromMemberId: v.id("members"),
    toMemberId: v.id("members"),
    amount: v.number(),
    date: v.number(),
    createdAt: v.number(),
  }).index("by_group", ["groupId"]).index("by_seed_owner", ["seedOwnerClerkId"]),
});
