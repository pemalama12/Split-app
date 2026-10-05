import { api } from "@/../convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, Card, Field, PageHeader, Screen } from "@/components/ui";
import { useToast } from "@/components/toast";
import { colors } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";
export default function InviteScreen() {
  const accept = useMutation(api.invitations.accept); const { showToast } = useToast(); const [code, setCode] = useState(""); const [loading, setLoading] = useState(false);
  async function join() { setLoading(true); try { const result = await accept({ code }); showToast("You joined the group.", "success"); router.replace({ pathname: "/group/[groupId]", params: { groupId: result.groupId } }); } catch (err) { showToast(errorMessage(err)); } finally { setLoading(false); } }
  return <Screen><PageHeader title="Join a group" subtitle="Sign in first, then enter the invite code a group owner shared with you." /><Card style={styles.card}><Field label="Invite code" value={code} onChangeText={(value) => setCode(value.toUpperCase())} placeholder="AB12CD34…" autoCapitalize="characters" autoCorrect={false} maxLength={24} /><Button label="Join group" onPress={join} loading={loading} disabled={!code.trim()} /><Text style={styles.note}>New here? Create your account in the sign-in flow, finish your profile, then return to this code.</Text></Card></Screen>;
}
const styles = StyleSheet.create({ card: { gap: 14 }, note: { color: colors.inkMuted, fontSize: 13, lineHeight: 19 } });
