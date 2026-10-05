import { api } from "@/../convex/_generated/api";
import { useAuth, useUser } from "@clerk/expo";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Avatar, Button, Card, ErrorBanner, Field, LoadingState, PageHeader } from "@/components/ui";
import { colors } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";
import { useToast } from "@/components/toast";

export default function ProfileScreen() {
  const profile = useQuery(api.users.current);
  if (profile === undefined) return <LoadingState label="Loading profile…" />;
  return <ProfileForm initialName={profile?.name ?? ""} />;
}

function ProfileForm({ initialName }: { initialName: string }) {
  const updateName = useMutation(api.users.updateName); const { user } = useUser(); const { signOut } = useAuth();
  const seed = useMutation(api.developmentSeed.seed); const resetSeed = useMutation(api.developmentSeed.reset); const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initialName); const [loading, setLoading] = useState(false); const [error, setError] = useState(""); const [saved, setSaved] = useState(false);
  async function save() { setLoading(true); setError(""); setSaved(false); try { await updateName({ name }); setSaved(true); } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); } }
  async function seedData() { try { const result = await seed({}); showToast(result.created ? `Added ${result.groups} sample groups.` : "Sample data already exists. Reset it before seeding again.", "success"); } catch (err) { showToast(errorMessage(err)); } }
  function resetData() { Alert.alert("Reset development sample data?", "Only untouched seeded groups are removed. Any group you changed is kept to protect your data.", [{ text: "Cancel", style: "cancel" }, { text: "Reset", style: "destructive", onPress: () => void resetSeed({}).then((result) => showToast(`Removed ${result.removedGroups} sample groups.${result.skippedGroups ? ` Kept ${result.skippedGroups} changed groups.` : ""}`, "success")).catch((err) => showToast(errorMessage(err))) }]); }
  return <View style={styles.page}><KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.page}><ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 16 }]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}><PageHeader title="Profile" subtitle="Your identity across SplitSimple." /><Card style={styles.identity}><Avatar name={initialName || "You"} size={58} /><View><Text style={styles.name}>{initialName || "Add your name"}</Text><Text style={styles.email}>{user?.primaryEmailAddress?.emailAddress}</Text></View></Card>{error ? <ErrorBanner message={error} /> : null}{saved ? <Text style={styles.saved}>Profile updated.</Text> : null}<Field label="Display name" value={name} onChangeText={(value) => { setName(value); setSaved(false); }} autoCapitalize="words" maxLength={60} /><Button label="Save changes" onPress={save} loading={loading} disabled={!name.trim() || name.trim() === initialName} />{__DEV__ ? <Card style={styles.devCard}><Text style={styles.devTitle}>Development sample data</Text><Text style={styles.devCopy}>Creates realistic Convex data for your account only. It is not available in production builds.</Text><Button label="Seed sample data" variant="secondary" onPress={seedData} /><Button label="Reset sample data" variant="ghost" onPress={resetData} /></Card> : null}<View style={styles.spacer} /><Button label="Sign out" variant="secondary" onPress={() => void signOut()} /></ScrollView></KeyboardAvoidingView></View>;
}
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: colors.background }, content: { flexGrow: 1, padding: 16, paddingBottom: 44, gap: 16 }, identity: { flexDirection: "row", alignItems: "center", gap: 14 }, name: { color: colors.ink, fontSize: 18, fontWeight: "700" }, email: { color: colors.inkMuted, marginTop: 4 }, saved: { color: colors.positive, backgroundColor: colors.primarySoft, padding: 12, borderRadius: 10, overflow: "hidden" }, devCard: { gap: 10, backgroundColor: colors.primarySoft }, devTitle: { color: colors.ink, fontWeight: "700", fontSize: 16 }, devCopy: { color: colors.inkMuted, fontSize: 13, lineHeight: 18 }, spacer: { flex: 1 } });
