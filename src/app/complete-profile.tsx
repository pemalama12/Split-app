import { api } from "@/../convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Button, ErrorBanner, Field, PageHeader, Screen } from "@/components/ui";
import { errorMessage } from "@/lib/errors";

export default function CompleteProfileScreen() {
  const updateName = useMutation(api.users.updateName);
  const [name, setName] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit() { setLoading(true); setError(""); try { await updateName({ name }); router.replace("/(tabs)/groups"); } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); } }
  return <Screen><PageHeader eyebrow="One quick step" title="What should we call you?" subtitle="This is the name your groups will see." />{error ? <ErrorBanner message={error} /> : null}<Field label="Display name" value={name} onChangeText={setName} autoFocus autoCapitalize="words" placeholder="Your name" maxLength={60} /><Button label="Save and continue" onPress={submit} loading={loading} disabled={!name.trim()} /></Screen>;
}
