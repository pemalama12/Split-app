import { api } from "@/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { useLocalSearchParams } from "expo-router";
import { Alert, StyleSheet, Text, View } from "react-native";
import { useState } from "react";
import { Avatar, Button, Card, ErrorBanner, Field, LoadingState, PageHeader, Screen } from "@/components/ui";
import { colors } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";

export default function MembersScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>(); const data = useQuery(api.groups.detail, { groupId }); const add = useMutation(api.members.add); const archive = useMutation(api.members.archive);
  const [name, setName] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  if (data === undefined) return <LoadingState label="Loading members…" />;
  async function addMember() { setLoading(true); setError(""); try { await add({ groupId, name }); setName(""); } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); } }
  function remove(member: any) { Alert.alert(`Remove ${member.name}?`, "Members with financial history are archived so past expenses stay accurate.", [{ text: "Cancel", style: "cancel" }, { text: "Remove", style: "destructive", onPress: () => void archive({ memberId: member._id }).catch((err) => setError(errorMessage(err))) }]); }
  return <Screen><PageHeader title="Members" subtitle="Add placeholder members by name—no account needed." />{error ? <ErrorBanner message={error} /> : null}<Card style={styles.add}><Field label="Member name" value={name} onChangeText={setName} placeholder="Alex" autoCapitalize="words" maxLength={60} /><Button label="Add member" onPress={addMember} loading={loading} disabled={!name.trim()} /></Card><View style={styles.list}>{data?.members.map((member: any) => <Card key={member._id} style={styles.row}><Avatar name={member.name} /><View style={styles.copy}><Text style={styles.name}>{member.name}</Text><Text style={styles.meta}>{member.linkedClerkId ? "You" : member.archived ? "Archived" : "Group member"}</Text></View>{!member.linkedClerkId && !member.archived ? <Button label="Remove" compact variant="ghost" onPress={() => remove(member)} /> : null}</Card>)}</View></Screen>;
}
const styles = StyleSheet.create({ add: { gap: 14 }, list: { gap: 9 }, row: { flexDirection: "row", alignItems: "center", padding: 13 }, copy: { flex: 1, marginLeft: 11 }, name: { color: colors.ink, fontWeight: "600" }, meta: { color: colors.inkMuted, fontSize: 12, marginTop: 3 } });
