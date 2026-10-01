import { api } from "@/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, Chip, ErrorBanner, Field, LoadingState, PageHeader, Screen } from "@/components/ui";
import { colors } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";
import { formatMoney, moneyInput, parseMoney } from "@/lib/money";

export default function SettleScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>(); const data = useQuery(api.groups.detail, { groupId }); const create = useMutation(api.settlements.create);
  const [selected, setSelected] = useState(0); const [amount, setAmount] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  if (data === undefined) return <LoadingState label="Checking balances…" />;
  const suggestion = data?.suggestions[selected]; const displayedAmount = amount ?? moneyInput(suggestion?.amount);
  async function submit() { const cents = parseMoney(displayedAmount); if (!suggestion || cents === null) return; setLoading(true); setError(""); try { await create({ groupId, fromMemberId: suggestion.fromMemberId, toMemberId: suggestion.toMemberId, amount: cents, date: Date.now() }); router.back(); } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); } }
  return <Screen><PageHeader title="Settle up" subtitle="Record a payment that already happened." />{error ? <ErrorBanner message={error} /> : null}<View style={styles.chips}>{data?.suggestions.map((item: any, index: number) => <Chip key={`${item.fromMemberId}-${item.toMemberId}`} selected={selected === index} onPress={() => { setSelected(index); setAmount(null); }} label={`${item.fromName} → ${item.toName}`} />)}</View>{suggestion ? <Card style={styles.summary}><Text style={styles.route}><Text style={styles.strong}>{suggestion.fromName}</Text> pays <Text style={styles.strong}>{suggestion.toName}</Text></Text><Text style={styles.max}>Up to {formatMoney(suggestion.amount)}</Text></Card> : null}<Field label="Amount paid" value={displayedAmount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" /><Button label="Record payment" onPress={submit} loading={loading} disabled={!suggestion || !displayedAmount} /></Screen>;
}
const styles = StyleSheet.create({ chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, summary: { alignItems: "center", gap: 6 }, route: { color: colors.inkMuted, fontSize: 16 }, strong: { color: colors.ink, fontWeight: "700" }, max: { color: colors.primary, fontWeight: "700", fontSize: 20 } });
