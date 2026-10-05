import { api } from "@/../convex/_generated/api";
import { useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button, Card, EmptyState, LoadingState, PageHeader } from "@/components/ui";
import { colors } from "@/constants/theme";
import { formatMoney } from "@/lib/money";

export default function GroupsScreen() {
  const { user } = useUser(); const sync = useMutation(api.users.sync); const didSync = useRef(false);
  const profile = useQuery(api.users.current); const groups = useQuery(api.groups.list);
  const insets = useSafeAreaInsets();
  useEffect(() => { if (user && !didSync.current) { didSync.current = true; const name = [user.firstName, user.lastName].filter(Boolean).join(" "); void sync({ name, email: user.primaryEmailAddress?.emailAddress ?? "" }).catch(() => { didSync.current = false; }); } }, [sync, user]);
  useEffect(() => { if (profile && !profile.name) router.replace("/complete-profile"); }, [profile]);
  if (groups === undefined || profile === undefined) return <LoadingState label="Loading your groups…" />;
  return <View style={styles.page}><ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}><PageHeader eyebrow="Your shared life" title="Groups" subtitle="Every balance, in one calm place." action={<View style={styles.headerActions}><Button label="Join" compact variant="secondary" onPress={() => router.push("/invite")} /><Button label="＋ New" compact onPress={() => router.push("/group/new")} /></View>} />
    {!groups.length ? <EmptyState icon="🤝" title="Start your first group" body="Create a group, or join one with a code from a friend." action={<View style={styles.emptyActions}><Button label="Join with code" variant="secondary" onPress={() => router.push("/invite")} /><Button label="Create a group" onPress={() => router.push("/group/new")} /></View>} /> : <View style={styles.list}>{groups.map((group: any) => <Pressable key={group._id} onPress={() => router.push({ pathname: "/group/[groupId]", params: { groupId: group._id } })}><Card style={styles.groupCard}><View style={styles.groupIcon}><Text style={styles.groupIconText}>{group.name.slice(0, 1).toUpperCase()}</Text></View><View style={styles.groupCopy}><Text style={styles.groupName}>{group.name}</Text><Text style={styles.meta}>{group.memberCount} members · {group.expenseCount} expenses</Text></View><View style={styles.balance}><Text style={[styles.balanceAmount, group.myBalance < 0 ? styles.negative : styles.positive]}>{formatMoney(Math.abs(group.myBalance))}</Text><Text style={styles.balanceLabel}>{group.myBalance < 0 ? "you owe" : group.myBalance > 0 ? "you get" : "settled"}</Text></View></Card></Pressable>)}</View>}
  </ScrollView></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 16, paddingBottom: 44, gap: 18 }, headerActions: { flexDirection: "row", gap: 7 }, emptyActions: { gap: 10 }, list: { gap: 12 }, groupCard: { flexDirection: "row", alignItems: "center", gap: 12 }, groupIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", backgroundColor: colors.primarySoft }, groupIconText: { color: colors.primary, fontWeight: "800", fontSize: 20 }, groupCopy: { flex: 1, gap: 4 }, groupName: { color: colors.ink, fontSize: 17, fontWeight: "700" }, meta: { color: colors.inkMuted, fontSize: 13 }, balance: { alignItems: "flex-end", gap: 3 }, balanceAmount: { fontWeight: "700", fontSize: 15 }, positive: { color: colors.positive }, negative: { color: colors.negative }, balanceLabel: { color: colors.inkMuted, fontSize: 11 } });
