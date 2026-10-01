import { api } from "@/../convex/_generated/api";
import { useMutation } from "convex/react";
import { router } from "expo-router";
import { useState } from "react";
import { Button, Card, ErrorBanner, Field, PageHeader, Screen } from "@/components/ui";
import { errorMessage } from "@/lib/errors";

export default function NewGroupScreen() {
  const createGroup = useMutation(api.groups.create); const [name, setName] = useState(""); const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit() { setLoading(true); setError(""); try { const groupId = await createGroup({ name }); router.dismiss(); router.push({ pathname: "/group/[groupId]", params: { groupId } }); } catch (err) { setError(errorMessage(err)); } finally { setLoading(false); } }
  return <Screen><PageHeader eyebrow="New shared space" title="Create a group" subtitle="Trips, homes, dinners—keep each balance separate." />{error ? <ErrorBanner message={error} /> : null}<Card><Field label="Group name" value={name} onChangeText={setName} placeholder="Weekend in Austin" autoFocus maxLength={60} /></Card><Button label="Create group" onPress={submit} loading={loading} disabled={!name.trim()} /></Screen>;
}
