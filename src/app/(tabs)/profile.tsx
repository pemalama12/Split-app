import { api } from "@/../convex/_generated/api";
import { useAuth, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Avatar, Button, Card, ErrorBanner, Field, LoadingState, PageHeader } from "@/components/ui";
import { colors } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";

export default function ProfileScreen() {
  const profile = useQuery(api.users.current);
  if (profile === undefined) return <LoadingState label="Loading profile…" />;
  return <ProfileForm initialName={profile?.name ?? ""} />;
}

function ProfileForm({ initialName }: { initialName: string }) {
  const updateName = useMutation(api.users.updateName); const { user } = useUser(); const { signOut } = useAuth();
  const [name, setName] = useState(initialName); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  async function save() { setLoading(true); setError(""); setSaved(false); try { await updateName({ name }); setSaved(true); } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); } }
  return <SafeAreaView style={styles.page} edges={["top"]}><View style={styles.content}><PageHeader title="Profile" subtitle="Your identity across SplitSimple." /><Card style={styles.identity}><Avatar name={initialName || "You"} size={58} /><View><Text style={styles.name}>{initialName || "Add your name"}</Text><Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text></View></Card>{error ? <ErrorBanner message={error} /> : null}{saved ? <Text style={styles.saved}>Profile updated.</Text> : null}<Field label="Display name" value={name} onChangeText={(value) => { setName(value); setSaved(false); }} autoCapitalize="words" maxLength={60} /><Button label="Save changes" onPress={save} loading={loading} disabled={!name.trim() || name.trim() === initialName} /><View style={styles.spacer} /><Button label="Sign out" variant="secondary" onPress={() => void signOut()} /></View></SafeAreaView>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { flex: 1, padding: 16, paddingTop: 22, gap: 16 }, identity: { flexDirection: "row", alignItems: "center", gap: 14 }, name: { color: colors.ink, fontSize: 18, fontWeight: "700" }, email: { color: colors.inkMuted, marginTop: 4 }, saved: { color: colors.positive, backgroundColor: colors.primarySoft, padding: 12, borderRadius: 10, overflow: "hidden" }, spacer: { flex: 1 } });
