export type LedgerMember = { _id: string; name: string };
export type LedgerExpense = {
  amount: number;
  payerId: string;
  shares: { memberId: string; amount: number }[];
};
export type LedgerSettlement = { fromMemberId: string; toMemberId: string; amount: number };

export function calculateBalances(
  members: LedgerMember[],
  expenses: LedgerExpense[],
  settlements: LedgerSettlement[],
) {
  const balances = new Map(members.map((member) => [member._id, 0]));

  for (const expense of expenses) {
    balances.set(expense.payerId, (balances.get(expense.payerId) ?? 0) + expense.amount);
    for (const share of expense.shares) {
      balances.set(share.memberId, (balances.get(share.memberId) ?? 0) - share.amount);
    }
  }

  for (const settlement of settlements) {
    balances.set(
      settlement.fromMemberId,
      (balances.get(settlement.fromMemberId) ?? 0) + settlement.amount,
    );
    balances.set(
      settlement.toMemberId,
      (balances.get(settlement.toMemberId) ?? 0) - settlement.amount,
    );
  }

  return members.map((member) => ({
    memberId: member._id,
    name: member.name,
    amount: balances.get(member._id) ?? 0,
  }));
}

export function simplifyBalances(balances: ReturnType<typeof calculateBalances>) {
  const debtors = balances
    .filter((entry) => entry.amount < 0)
    .map((entry) => ({ ...entry, remaining: -entry.amount }))
    .sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));
  const creditors = balances
    .filter((entry) => entry.amount > 0)
    .map((entry) => ({ ...entry, remaining: entry.amount }))
    .sort((a, b) => b.remaining - a.remaining || a.name.localeCompare(b.name));

  const suggestions: Array<{
    fromMemberId: string;
    fromName: string;
    toMemberId: string;
    toName: string;
    amount: number;
  }> = [];
  let debtorIndex = 0;
  let creditorIndex = 0;

  while (debtorIndex < debtors.length && creditorIndex < creditors.length) {
    const debtor = debtors[debtorIndex];
    const creditor = creditors[creditorIndex];
    const amount = Math.min(debtor.remaining, creditor.remaining);
    if (amount > 0) {
      suggestions.push({
        fromMemberId: debtor.memberId,
        fromName: debtor.name,
        toMemberId: creditor.memberId,
        toName: creditor.name,
        amount,
      });
    }
    debtor.remaining -= amount;
    creditor.remaining -= amount;
    if (debtor.remaining === 0) debtorIndex += 1;
    if (creditor.remaining === 0) creditorIndex += 1;
  }

  return suggestions;
}

export function splitEvenly(total: number, memberIds: string[]) {
  if (!Number.isInteger(total) || total <= 0 || memberIds.length === 0) {
    throw new Error("Choose at least one participant and enter a valid amount.");
  }
  const ordered = [...new Set(memberIds)].sort();
  const base = Math.floor(total / ordered.length);
  let remainder = total - base * ordered.length;
  return ordered.map((memberId) => ({
    memberId,
    amount: base + (remainder-- > 0 ? 1 : 0),
  }));
}

function allocateProportionally(total: number, weights: Map<string, number>) {
  const weightTotal = [...weights.values()].reduce((sum, value) => sum + value, 0);
  const ordered = [...weights.entries()].sort(([a], [b]) => a.localeCompare(b));
  if (total === 0) return new Map(ordered.map(([id]) => [id, 0]));
  if (weightTotal <= 0) throw new Error("Receipt items must have a positive subtotal.");

  const result = new Map<string, number>();
  let allocated = 0;
  for (const [id, weight] of ordered) {
    const amount = Math.floor((total * weight) / weightTotal);
    result.set(id, amount);
    allocated += amount;
  }
  let remainder = total - allocated;
  for (const [id] of ordered) {
    if (remainder <= 0) break;
    result.set(id, (result.get(id) ?? 0) + 1);
    remainder -= 1;
  }
  return result;
}

export type ReceiptInput = {
  subtotal: number;
  tax: number;
  tip: number;
  items: { key: string; name: string; amount: number; assigneeIds: string[] }[];
};

export function calculateReceiptShares(receipt: ReceiptInput) {
  if (!receipt.items.length) throw new Error("Add at least one receipt item.");
  const itemTotal = receipt.items.reduce((sum, item) => sum + item.amount, 0);
  if (itemTotal !== receipt.subtotal) throw new Error("Item prices must equal the subtotal.");

  const pretax = new Map<string, number>();
  for (const item of receipt.items) {
    if (!item.name.trim() || !Number.isInteger(item.amount) || item.amount <= 0) {
      throw new Error("Every item needs a name and positive price.");
    }
    if (!item.assigneeIds.length) throw new Error(`Assign ${item.name} to at least one person.`);
    for (const share of splitEvenly(item.amount, item.assigneeIds)) {
      pretax.set(share.memberId, (pretax.get(share.memberId) ?? 0) + share.amount);
    }
  }

  const taxShares = allocateProportionally(receipt.tax, pretax);
  const tipShares = allocateProportionally(receipt.tip, pretax);
  return [...pretax.keys()].sort().map((memberId) => ({
    memberId,
    amount:
      (pretax.get(memberId) ?? 0) +
      (taxShares.get(memberId) ?? 0) +
      (tipShares.get(memberId) ?? 0),
  }));
}
