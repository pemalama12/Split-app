import { api } from "@/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Chip, Field, LoadingState, PageHeader, Screen, SectionHeader } from "@/components/ui";
import { useToast } from "@/components/toast";
import { colors } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";
import { formatMoney, moneyInput, parseMoney } from "@/lib/money";

export default function ExpenseFormScreen() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId?: string }>();
  const group = useQuery(api.groups.detail, { groupId: groupId as any }); const existing = useQuery(api.expenses.get, expenseId ? { expenseId: expenseId as any } : "skip");
  const create = useMutation(api.expenses.create); const update = useMutation(api.expenses.update);
  const { showToast } = useToast();
  const [description, setDescription] = useState(""); const [total, setTotal] = useState(""); const [payerId, setPayerId] = useState("");
  const [splitType, setSplitType] = useState<"equal" | "custom">("equal"); const [selectedIds, setSelectedIds] = useState<string[]>([]); const [amounts, setAmounts] = useState<Record<string, string>>({}); const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false); const initialized = useRef(false);
  const activeMembers = useMemo(() => group?.members.filter((member: any) => !member.archived && member.membershipStatus !== "invited") ?? [], [group?.members]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the editable form once after its Convex query resolves.
  useEffect(() => { if (!group || initialized.current) return; if (expenseId && existing === undefined) return; initialized.current = true; if (existing?.expense) { const expense = existing.expense; setDescription(expense.description); setTotal(moneyInput(expense.amount)); setPayerId(expense.payerId); setSplitType(expense.splitType === "custom" ? "custom" : "equal"); setSelectedIds(expense.shares.map((share: any) => share.memberId)); setAmounts(Object.fromEntries(expense.shares.map((share: any) => [share.memberId, moneyInput(share.amount)]))); setNotes(expense.notes ?? ""); } else { setPayerId(activeMembers[0]?._id ?? ""); setSelectedIds(activeMembers.map((member: any) => member._id)); } }, [activeMembers, existing, expenseId, group]);
  if (group === undefined || (expenseId && existing === undefined)) return <LoadingState label="Preparing expense…" />;
  function toggle(id: string) { setSelectedIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  async function submit() {
    const amount = parseMoney(total);
    if (!description.trim()) return showToast("Add a name for this expense.");
    if (amount === null || amount <= 0) return showToast("Enter a valid expense total.");
    if (!payerId) return showToast("Choose who paid for this expense.");
    if (!selectedIds.length) return showToast("Choose at least one participant.");
    const customShares = selectedIds.map((memberId) => ({ memberId, amount: parseMoney(amounts[memberId] ?? "") }));
    if (splitType === "custom") {
      if (customShares.some((share) => share.amount === null || share.amount <= 0)) return showToast("Enter a positive split amount for every participant.");
      const assigned = customShares.reduce((sum, share) => sum + (share.amount ?? 0), 0);
      const difference = amount - assigned;
      if (difference > 0) return showToast(`Split amounts must equal ${formatMoney(amount)}. ${formatMoney(difference)} is still unassigned.`);
      if (difference < 0) return showToast(`Split amounts exceed the total by ${formatMoney(-difference)}.`);
    }
    setLoading(true);
    try {
      const values = { groupId, description, amount, payerId, splitType, participantIds: splitType === "equal" ? selectedIds : undefined, customShares: splitType === "custom" ? customShares.map((share) => ({ memberId: share.memberId, amount: share.amount! })) : undefined, date: existing?.expense.date ?? Date.now(), notes: notes || undefined };
      if (expenseId) await update({ expenseId: expenseId as any, ...values } as any); else await create(values as any);
      router.back();
    } catch (err) { showToast(errorMessage(err)); } finally { setLoading(false); }
  }
  return <Screen><PageHeader title={expenseId ? "Edit expense" : "Add an expense"} subtitle="One payer, any set of participants." /><Card style={styles.form}><Field label="What was it for?" value={description} onChangeText={setDescription} placeholder="Groceries" maxLength={100} /><Field label="Total" value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0.00" /></Card>
    <SectionHeader title="Who paid?" /><View style={styles.chips}>{activeMembers.map((member: any) => <Chip key={member._id} label={member.name} selected={payerId === member._id} onPress={() => setPayerId(member._id)} />)}</View>
    <SectionHeader title="How should it split?" /><View style={styles.mode}><Chip label="Equally" selected={splitType === "equal"} onPress={() => setSplitType("equal")} /><Chip label="Custom amounts" selected={splitType === "custom"} onPress={() => setSplitType("custom")} /></View>
    <Card style={styles.form}><Text style={styles.hint}>Tap everyone who participated.</Text><View style={styles.chips}>{activeMembers.map((member: any) => <Chip key={member._id} label={member.name} selected={selectedIds.includes(member._id)} onPress={() => toggle(member._id)} />)}</View>{splitType === "custom" ? <View style={styles.custom}>{selectedIds.map((id) => { const member = activeMembers.find((item: any) => item._id === id); return <Field key={id} label={member?.name ?? "Member"} value={amounts[id] ?? ""} onChangeText={(value) => setAmounts((current) => ({ ...current, [id]: value }))} keyboardType="decimal-pad" placeholder="0.00" />; })}</View> : null}</Card>
    <Field label="Note (optional)" value={notes} onChangeText={setNotes} placeholder="Anything worth remembering" multiline maxLength={300} /><Button label={expenseId ? "Save changes" : "Add expense"} onPress={submit} loading={loading} disabled={!description.trim() || !total || !payerId || !selectedIds.length} />
  </Screen>;
}
const styles = StyleSheet.create({ form: { gap: 14 }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, mode: { flexDirection: "row", gap: 8 }, hint: { color: colors.inkMuted, fontSize: 13 }, custom: { marginTop: 6, gap: 12 } });
