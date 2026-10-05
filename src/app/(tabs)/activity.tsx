import { api } from "@/../convex/_generated/api";
import { useQuery } from "convex/react";
import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Card, EmptyState, LoadingState, PageHeader } from "@/components/ui";
import { colors } from "@/constants/theme";
import { formatMoney } from "@/lib/money";

export default function ActivityScreen() {
  const activity = useQuery(api.activity.list);
  const insets = useSafeAreaInsets();
  if (activity === undefined) return <LoadingState label="Loading activity…" />;
  return <View style={styles.page}><ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}><PageHeader title="Activity" subtitle="Recent expenses and payments across every group." />{!activity.length ? <EmptyState icon="🧾" title="Nothing here yet" body="Expenses and settlements will appear here as you add them." /> : <View style={styles.list}>{activity.map((item: any) => <Pressable key={`${item.type}-${item.id}`} onPress={() => item.type === "expense" ? router.push({ pathname: "/expense/[expenseId]", params: { expenseId: item.id } }) : router.push({ pathname: "/group/[groupId]", params: { groupId: item.groupId } })}><Card style={styles.row}><View style={[styles.icon, item.type === "settlement" && styles.paymentIcon]}><Text>{item.type === "expense" ? "↗" : "✓"}</Text></View><View style={styles.copy}><Text style={styles.title}>{item.title}</Text><Text style={styles.meta}>{item.groupName} · {new Date(item.timestamp).toLocaleDateString()}</Text></View><Text style={styles.amount}>{formatMoney(item.amount)}</Text></Card></Pressable>)}</View>}</ScrollView></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 16, paddingBottom: 44, gap: 18 }, list: { gap: 10 }, row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 }, icon: { width: 40, height: 40, borderRadius: 13, backgroundColor: "#FCEEEA", alignItems: "center", justifyContent: "center" }, paymentIcon: { backgroundColor: colors.primarySoft }, copy: { flex: 1, gap: 4 }, title: { color: colors.ink, fontWeight: "600", fontSize: 15 }, meta: { color: colors.inkMuted, fontSize: 12 }, amount: { color: colors.ink, fontWeight: "700" } });
