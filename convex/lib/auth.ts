export async function requireClerkId(ctx: any) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("You must be signed in.");
  return { clerkId: identity.subject, identity };
}

export async function requireOwnedGroup(ctx: any, groupId: any) {
  const { clerkId } = await requireClerkId(ctx);
  const group = await ctx.db.get(groupId);
  if (!group || group.ownerClerkId !== clerkId) throw new Error("Group not found.");
  return { clerkId, group };
}

export async function requireGroupMember(ctx: any, groupId: any) {
  const { clerkId } = await requireClerkId(ctx);
  const group = await ctx.db.get(groupId);
  if (!group) throw new Error("Group not found.");
  if (group.ownerClerkId === clerkId) return { clerkId, group, isOwner: true };
  const membership = await ctx.db
    .query("members")
    .withIndex("by_group_and_linked_user", (q: any) => q.eq("groupId", groupId).eq("linkedClerkId", clerkId))
    .unique();
  if (!membership || membership.archived || membership.membershipStatus === "invited") {
    throw new Error("Group not found.");
  }
  return { clerkId, group, membership, isOwner: false };
}

export async function groupLedger(ctx: any, groupId: any) {
  const [members, expenses, settlements] = await Promise.all([
    ctx.db.query("members").withIndex("by_group", (q: any) => q.eq("groupId", groupId)).collect(),
    ctx.db.query("expenses").withIndex("by_group", (q: any) => q.eq("groupId", groupId)).collect(),
    ctx.db.query("settlements").withIndex("by_group", (q: any) => q.eq("groupId", groupId)).collect(),
  ]);
  return { members, expenses, settlements };
}

export function cleanName(value: string) {
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 1 || name.length > 60) throw new Error("Enter a name between 1 and 60 characters.");
  return name;
}
