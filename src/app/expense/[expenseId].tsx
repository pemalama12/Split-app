import { api } from "@/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { Alert, Image, StyleSheet, Text, View } from "react-native";
import { Avatar, Button, Card, EmptyState, LoadingState, PageHeader, SectionHeader } from "@/components/ui";
import { colors } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";
import { formatMoney } from "@/lib/money";

export default function ExpenseDetailScreen() {
  const { expenseId } = useLocalSearchParams<{ expenseId: string }>(); const data = useQuery(api.expenses.get, { expenseId }); const remove = useMutation(api.expenses.remove);
  if (data === undefined) return <LoadingState label="Loading expense…" />; if (!data) return <EmptyState icon="?" title="Expense not found" body="It may have been deleted." />;
  const { expense, members, receiptUrl } = data; const names = new Map<string, string>(members.map((member: any) => [member._id, member.name]));
  function edit() { router.push({ pathname: expense.splitType === "receipt" ? "/group/[groupId]/receipt" : "/group/[groupId]/expense", params: { groupId: expense.groupId, expenseId } }); }
  function confirmDelete() { Alert.alert("Delete this expense?", "Balances will be recalculated immediately.", [{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: () => void remove({ expenseId }).then(() => router.back()).catch((error) => Alert.alert("Couldn’t delete expense", errorMessage(error))) }]); }
  return <View style={styles.page}><View style={styles.content}><PageHeader eyebrow={expense.splitType === "receipt" ? "Receipt expense" : "Expense"} title={expense.description} subtitle={`${new Date(expense.date).toLocaleDateString()} · ${names.get(expense.payerId)} paid`} /><Card style={styles.hero}><Text style={styles.total}>{formatMoney(expense.amount)}</Text><Text style={styles.totalLabel}>total</Text></Card>{receiptUrl ? <Image source={{ uri: receiptUrl }} style={styles.receipt} /> : null}
    {expense.items?.length ? <><SectionHeader title="Receipt items" />{expense.items.map((item: any) => <Card key={item.key} style={styles.row}><View style={styles.copy}><Text style={styles.itemName}>{item.name}</Text><Text style={styles.meta}>{item.assigneeIds.map((id: string) => names.get(id)).join(", ")}</Text></View><Text style={styles.amount}>{formatMoney(item.amount)}</Text></Card>)}</> : null}
    <SectionHeader title="Split" />{expense.shares.map((share: any) => <Card key={share.memberId} style={styles.row}><Avatar name={names.get(share.memberId) ?? "Member"} size={36} /><Text style={styles.member}>{names.get(share.memberId)}</Text><Text style={styles.amount}>{formatMoney(share.amount)}</Text></Card>)}
    {expense.notes ? <Card><Text style={styles.meta}>NOTE</Text><Text style={styles.note}>{expense.notes}</Text></Card> : null}<View style={styles.actions}><View style={styles.flex}><Button label="Edit" variant="secondary" onPress={edit} /></View><View style={styles.flex}><Button label="Delete" variant="danger" onPress={confirmDelete} /></View></View>
  </View></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { padding: 16, paddingBottom: 44, gap: 12 }, hero: { alignItems: "center", paddingVertical: 24 }, total: { color: colors.ink, fontWeight: "800", fontSize: 34, letterSpacing: -1 }, totalLabel: { color: colors.inkMuted, marginTop: 4 }, receipt: { width: "100%", height: 220, borderRadius: 16, resizeMode: "cover" }, row: { flexDirection: "row", alignItems: "center", gap: 11, padding: 13 }, copy: { flex: 1 }, itemName: { color: colors.ink, fontWeight: "600" }, meta: { color: colors.inkMuted, fontSize: 12, marginTop: 3 }, amount: { color: colors.ink, fontWeight: "700" }, member: { flex: 1, color: colors.ink, fontWeight: "600" }, note: { color: colors.ink, marginTop: 7, lineHeight: 21 }, actions: { flexDirection: "row", gap: 10, marginTop: 8 }, flex: { flex: 1 } });
