import { getFunctionName } from "convex/server";

type Member = { _id: string; groupId: string; name: string; normalizedName: string; archived: boolean; linkedClerkId?: string };
type Expense = { _id: string; groupId: string; description: string; amount: number; payerId: string; splitType: "equal" | "custom"; shares: { memberId: string; amount: number }[]; date: number; createdAt: number; notes?: string };
type Settlement = { _id: string; groupId: string; fromMemberId: string; toMemberId: string; amount: number; date: number; createdAt: number };

const now = Date.now();
const group = { _id: "mock-group-weekend", name: "Austin weekend", currency: "USD", createdAt: now - 86400000 * 12, ownerClerkId: "mock-user" };
const members: Member[] = [
  { _id: "mock-member-alex", groupId: group._id, name: "Alex Morgan", normalizedName: "alex morgan", archived: false, linkedClerkId: "mock-user" },
  { _id: "mock-member-jordan", groupId: group._id, name: "Jordan Lee", normalizedName: "jordan lee", archived: false },
  { _id: "mock-member-sam", groupId: group._id, name: "Sam Rivera", normalizedName: "sam rivera", archived: false },
  { _id: "mock-member-taylor", groupId: group._id, name: "Taylor Kim", normalizedName: "taylor kim", archived: false },
];
const expenses: Expense[] = [
  { _id: "mock-expense-dinner", groupId: group._id, description: "Dinner at Loro", amount: 18640, payerId: "mock-member-alex", splitType: "equal", shares: members.map((member) => ({ memberId: member._id, amount: 4660 })), date: now - 86400000 * 2, createdAt: now - 86400000 * 2, notes: "Including tip" },
  { _id: "mock-expense-rental", groupId: group._id, description: "Cabin rental", amount: 32000, payerId: "mock-member-jordan", splitType: "equal", shares: members.slice(0, 3).map((member) => ({ memberId: member._id, amount: 10667 })), date: now - 86400000 * 5, createdAt: now - 86400000 * 5 },
];
const settlements: Settlement[] = [{ _id: "mock-settlement-one", groupId: group._id, fromMemberId: "mock-member-sam", toMemberId: "mock-member-alex", amount: 1800, date: now - 86400000, createdAt: now - 86400000 }];

function balanceRows(list: Member[], listExpenses: Expense[], listSettlements: Settlement[]) {
  const totals = new Map(list.map((member) => [member._id, 0]));
  for (const expense of listExpenses) {
    totals.set(expense.payerId, (totals.get(expense.payerId) ?? 0) + expense.amount);
    for (const share of expense.shares) totals.set(share.memberId, (totals.get(share.memberId) ?? 0) - share.amount);
  }
  for (const settlement of listSettlements) {
    totals.set(settlement.fromMemberId, (totals.get(settlement.fromMemberId) ?? 0) + settlement.amount);
    totals.set(settlement.toMemberId, (totals.get(settlement.toMemberId) ?? 0) - settlement.amount);
  }
  return list.map((member) => ({ memberId: member._id, name: member.name, amount: totals.get(member._id) ?? 0 }));
}

class MockWatch<T> {
  constructor(private readonly read: () => T, private readonly subscribe: (listener: () => void) => () => void) {}
  onUpdate(listener: () => void) { return this.subscribe(listener); }
  localQueryResult() { return this.read(); }
  journal() { return undefined; }
}

export class MockConvexClient {
  private groups = [group]; private members = [...members]; private expenses = [...expenses]; private settlements = [...settlements];
  private profile = { _id: "mock-user", clerkId: "mock-user", name: "Alex Morgan", email: "alex@example.com" };
  private listeners = new Set<() => void>();
  setAuth(_fetchToken: unknown, onChange?: (authenticated: boolean) => void) { onChange?.(true); }
  clearAuth() {}
  close() {}
  connectionState() { return { isWebSocketConnected: true, hasInflightRequests: false, timeOfOldestInflightRequest: undefined }; }
  private notify() { this.listeners.forEach((listener) => listener()); }
  private detail(groupId: string) {
    const currentGroup = this.groups.find((item) => item._id === groupId); if (!currentGroup) return null;
    const currentMembers = this.members.filter((item) => item.groupId === groupId); const currentExpenses = this.expenses.filter((item) => item.groupId === groupId); const currentSettlements = this.settlements.filter((item) => item.groupId === groupId); const rows = balanceRows(currentMembers, currentExpenses, currentSettlements);
    const creditors = rows.filter((item) => item.amount > 0); const debtors = rows.filter((item) => item.amount < 0);
    const suggestions = debtors.flatMap((from) => creditors.map((to) => ({ fromMemberId: from.memberId, fromName: from.name, toMemberId: to.memberId, toName: to.name, amount: Math.min(-from.amount, to.amount) }))).filter((item) => item.amount > 0);
    return { group: currentGroup, members: currentMembers, balances: rows.sort((a, b) => b.amount - a.amount), suggestions, expenses: currentExpenses.map((item) => ({ ...item, receiptUrl: null })).sort((a, b) => b.date - a.date), settlements: currentSettlements.sort((a, b) => b.date - a.date) };
  }
  private read(name: string, args: any) {
    if (name === "users:current") return this.profile;
    if (name === "groups:list") return this.groups.map((item) => { const data = this.detail(item._id)!; return { ...item, memberCount: data.members.filter((member) => !member.archived).length, expenseCount: data.expenses.length, myBalance: data.balances.find((balance) => balance.memberId === "mock-member-alex")?.amount ?? 0 }; });
    if (name === "groups:detail") return this.detail(args.groupId);
    if (name === "expenses:get") { const expense = this.expenses.find((item) => item._id === args.expenseId); return expense ? { expense, members: this.members.filter((item) => item.groupId === expense.groupId), receiptUrl: null } : null; }
    if (name === "activity:list") return [...this.expenses.map((item) => ({ type: "expense", id: item._id, groupId: item.groupId, groupName: this.groups.find((groupItem) => groupItem._id === item.groupId)?.name ?? "Group", title: item.description, amount: item.amount, timestamp: item.date })), ...this.settlements.map((item) => ({ type: "settlement", id: item._id, groupId: item.groupId, groupName: this.groups.find((groupItem) => groupItem._id === item.groupId)?.name ?? "Group", title: "Settlement recorded", amount: item.amount, timestamp: item.date }))].sort((a, b) => b.timestamp - a.timestamp);
    return undefined;
  }
  watchQuery(query: any, args: any = {}) { const name = getFunctionName(query); return new MockWatch(() => this.read(name, args), (listener) => { this.listeners.add(listener); return () => this.listeners.delete(listener); }); }
  async query(query: any, args: any = {}) { return this.read(getFunctionName(query), args); }
  async mutation(mutation: any, args: any = {}) {
    const name = getFunctionName(mutation);
    if (name === "users:sync" || name === "users:updateName") this.profile = { ...this.profile, name: args.name?.trim() || this.profile.name, email: args.email?.trim() || this.profile.email };
    if (name === "groups:create") { const id = `mock-group-${Date.now()}`; this.groups.push({ _id: id, name: args.name.trim(), currency: "USD", createdAt: Date.now(), ownerClerkId: "mock-user" }); this.members.push({ _id: `mock-member-${Date.now()}`, groupId: id, name: this.profile.name, normalizedName: this.profile.name.toLowerCase(), archived: false, linkedClerkId: "mock-user" }); this.notify(); return id; }
    if (name === "groups:remove") { this.groups = this.groups.filter((item) => item._id !== args.groupId); this.members = this.members.filter((item) => item.groupId !== args.groupId); this.expenses = this.expenses.filter((item) => item.groupId !== args.groupId); this.notify(); }
    if (name === "members:add") { const id = `mock-member-${Date.now()}`; this.members.push({ _id: id, groupId: args.groupId, name: args.name.trim(), normalizedName: args.name.trim().toLowerCase(), archived: false }); this.notify(); return id; }
    if (name === "members:archive") { const member = this.members.find((item) => item._id === args.memberId); if (member) member.archived = true; this.notify(); }
    if (name === "expenses:create") { const id = `mock-expense-${Date.now()}`; const participantIds = args.participantIds ?? []; const share = Math.floor(args.amount / Math.max(participantIds.length, 1)); this.expenses.push({ _id: id, groupId: args.groupId, description: args.description.trim(), amount: args.amount, payerId: args.payerId, splitType: args.splitType, shares: args.customShares ?? participantIds.map((memberId: string) => ({ memberId, amount: share })), date: args.date, createdAt: Date.now(), notes: args.notes }); this.notify(); return id; }
    if (name === "expenses:update") { const current = this.expenses.find((item) => item._id === args.expenseId); if (current) { const participantIds = args.participantIds ?? []; const share = Math.floor(args.amount / Math.max(participantIds.length, 1)); Object.assign(current, { description: args.description.trim(), amount: args.amount, payerId: args.payerId, splitType: args.splitType, shares: args.customShares ?? participantIds.map((memberId: string) => ({ memberId, amount: share })), date: args.date, notes: args.notes }); } this.notify(); }
    if (name === "expenses:remove") { this.expenses = this.expenses.filter((item) => item._id !== args.expenseId); this.notify(); }
    if (name === "settlements:create") { this.settlements.push({ ...args, _id: `mock-settlement-${Date.now()}`, createdAt: Date.now() }); this.notify(); }
    if (name === "expenses:generateUploadUrl") return "mock-upload-url";
    this.notify(); return undefined;
  }
  action() { return Promise.resolve(undefined); }
}

export const mockConvex = new MockConvexClient();
