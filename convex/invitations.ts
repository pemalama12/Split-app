import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { cleanName, requireClerkId, requireOwnedGroup } from "./lib/auth";

const INVITE_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;

function createToken() {
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(36).padStart(2, "0")).join("").slice(0, 24).toUpperCase();
}

export const list = query({
  args: { groupId: v.id("groups") },
  returns: v.array(v.object({
    _id: v.id("invitations"),
    memberId: v.id("members"),
    memberName: v.string(),
    code: v.string(),
    expiresAt: v.number(),
  })),
  handler: async (ctx, { groupId }) => {
    await requireOwnedGroup(ctx, groupId);
    const invitations = await ctx.db
      .query("invitations")
      .withIndex("by_group_and_status", (q) => q.eq("groupId", groupId).eq("status", "pending"))
      .collect();
    const values = await Promise.all(invitations.map(async (invite) => {
      const member = await ctx.db.get(invite.memberId);
      return member ? { _id: invite._id, memberId: member._id, memberName: member.name, code: invite.token, expiresAt: invite.expiresAt } : null;
    }));
    return values.filter((value): value is NonNullable<typeof value> => value !== null && value.expiresAt >= Date.now());
  },
});

export const create = mutation({
  args: { groupId: v.id("groups"), name: v.string() },
  returns: v.object({ memberId: v.id("members"), code: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const { clerkId } = await requireOwnedGroup(ctx, args.groupId);
    const name = cleanName(args.name);
    const normalizedName = name.toLocaleLowerCase();
    const existing = await ctx.db
      .query("members")
      .withIndex("by_group_and_normalized_name", (q) => q.eq("groupId", args.groupId).eq("normalizedName", normalizedName))
      .unique();
    if (existing) throw new Error("A member with that name already exists.");
    const now = Date.now();
    const memberId = await ctx.db.insert("members", {
      groupId: args.groupId,
      name,
      normalizedName,
      membershipType: "registered",
      membershipStatus: "invited",
      archived: false,
      createdAt: now,
    });
    const code = createToken();
    const expiresAt = now + INVITE_LIFETIME_MS;
    await ctx.db.insert("invitations", {
      groupId: args.groupId,
      memberId,
      token: code,
      status: "pending",
      createdByClerkId: clerkId,
      createdAt: now,
      expiresAt,
    });
    return { memberId, code, expiresAt };
  },
});

export const createGuestClaim = mutation({
  args: { memberId: v.id("members") },
  returns: v.object({ code: v.string(), expiresAt: v.number() }),
  handler: async (ctx, { memberId }) => {
    const member = await ctx.db.get(memberId);
    if (!member) throw new Error("Member not found.");
    const { clerkId } = await requireOwnedGroup(ctx, member.groupId);
    if (member.archived || member.linkedClerkId || member.membershipStatus === "invited") {
      throw new Error("Only an active guest can be claimed.");
    }
    const existingInvites = await ctx.db
      .query("invitations")
      .withIndex("by_member", (q) => q.eq("memberId", memberId))
      .collect();
    for (const invite of existingInvites) {
      if (invite.status === "pending") await ctx.db.patch(invite._id, { status: "revoked" });
    }
    const now = Date.now();
    const code = createToken();
    const expiresAt = now + INVITE_LIFETIME_MS;
    await ctx.db.insert("invitations", {
      groupId: member.groupId,
      memberId,
      token: code,
      status: "pending",
      createdByClerkId: clerkId,
      createdAt: now,
      expiresAt,
    });
    return { code, expiresAt };
  },
});

export const revoke = mutation({
  args: { invitationId: v.id("invitations") },
  returns: v.null(),
  handler: async (ctx, { invitationId }) => {
    const invitation = await ctx.db.get(invitationId);
    if (!invitation) return null;
    await requireOwnedGroup(ctx, invitation.groupId);
    if (invitation.status === "pending") await ctx.db.patch(invitationId, { status: "revoked" });
    const member = await ctx.db.get(invitation.memberId);
    if (member?.membershipStatus === "invited") await ctx.db.delete(member._id);
    return null;
  },
});

export const accept = mutation({
  args: { code: v.string() },
  returns: v.object({ groupId: v.id("groups"), memberId: v.id("members") }),
  handler: async (ctx, { code }) => {
    const { clerkId } = await requireClerkId(ctx);
    const invite = await ctx.db
      .query("invitations")
      .withIndex("by_token", (q) => q.eq("token", code.trim().toUpperCase()))
      .unique();
    if (!invite || invite.status !== "pending" || invite.expiresAt < Date.now()) {
      throw new Error("This invite code is invalid or has expired.");
    }
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk", (q) => q.eq("clerkId", clerkId))
      .unique();
    if (!user) throw new Error("Complete your profile before accepting an invite.");
    const existingMembership = await ctx.db
      .query("members")
      .withIndex("by_group_and_linked_user", (q) => q.eq("groupId", invite.groupId).eq("linkedClerkId", clerkId))
      .unique();
    if (existingMembership && existingMembership._id !== invite.memberId) {
      throw new Error("You are already a member of this group.");
    }
    const member = await ctx.db.get(invite.memberId);
    if (!member || member.groupId !== invite.groupId || member.archived || member.linkedClerkId) {
      throw new Error("This invitation is no longer available.");
    }
    const now = Date.now();
    await ctx.db.patch(member._id, {
      linkedClerkId: clerkId,
      userId: user._id,
      membershipType: "registered",
      membershipStatus: "active",
    });
    await ctx.db.patch(invite._id, { status: "accepted", acceptedAt: now, acceptedByUserId: user._id });
    return { groupId: invite.groupId, memberId: member._id };
  },
});
