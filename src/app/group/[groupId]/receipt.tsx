import { api } from "@/../convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, Chip, Field, LoadingState, PageHeader, Screen, SectionHeader } from "@/components/ui";
import { useToast } from "@/components/toast";
import { colors } from "@/constants/theme";
import { errorMessage } from "@/lib/errors";
import { formatMoney, moneyInput, parseMoney } from "@/lib/money";

type DraftItem = { key: string; name: string; price: string; assigneeIds: string[] };
export default function ReceiptScreen() {
  const { groupId, expenseId } = useLocalSearchParams<{ groupId: string; expenseId?: string }>(); const group = useQuery(api.groups.detail, { groupId: groupId as any }); const existing = useQuery(api.expenses.get, expenseId ? { expenseId: expenseId as any } : "skip");
  const create = useMutation(api.expenses.create); const update = useMutation(api.expenses.update); const generateUploadUrl = useMutation(api.expenses.generateUploadUrl);
  const { showToast } = useToast();
  const [description, setDescription] = useState(""); const [payerId, setPayerId] = useState(""); const [subtotal, setSubtotal] = useState(""); const [tax, setTax] = useState("0.00"); const [tip, setTip] = useState("0.00"); const [receiptTotal, setReceiptTotal] = useState("");
  const [items, setItems] = useState<DraftItem[]>([{ key: "item-1", name: "", price: "", assigneeIds: [] }]); const [imageUri, setImageUri] = useState<string | null>(null); const [existingStorageId, setExistingStorageId] = useState<string | undefined>(); const [uploadedPhoto, setUploadedPhoto] = useState<{ uri: string; storageId: string } | null>(null);
  const [loading, setLoading] = useState(false); const initialized = useRef(false); const activeMembers = useMemo(() => group?.members.filter((member: any) => !member.archived && member.membershipStatus !== "invited") ?? [], [group?.members]);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- Hydrate the editable form once after its Convex query resolves.
  useEffect(() => { if (!group || initialized.current || (expenseId && existing === undefined)) return; initialized.current = true; if (existing?.expense) { const e = existing.expense; setDescription(e.description); setPayerId(e.payerId); setSubtotal(moneyInput(e.subtotal)); setTax(moneyInput(e.tax)); setTip(moneyInput(e.tip)); setReceiptTotal(moneyInput(e.amount)); setExistingStorageId(e.receiptStorageId); setImageUri(existing.receiptUrl); setItems((e.items ?? []).map((item: any) => ({ key: item.key, name: item.name, price: moneyInput(item.amount), assigneeIds: item.assigneeIds }))); } else setPayerId(activeMembers[0]?._id ?? ""); }, [activeMembers, existing, expenseId, group]);
  if (group === undefined || (expenseId && existing === undefined)) return <LoadingState label="Preparing receipt…" />;
  function chooseSource() { Alert.alert("Add receipt photo", undefined, [{ text: "Take photo", onPress: () => void takePhoto() }, { text: "Choose from library", onPress: () => void pickPhoto() }, { text: "Cancel", style: "cancel" }]); }
  async function takePhoto() { const permission = await ImagePicker.requestCameraPermissionsAsync(); if (!permission.granted) return Alert.alert("Camera access needed", "Allow camera access in Settings to photograph a receipt."); const result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.65, allowsEditing: true }); if (!result.canceled) { setImageUri(result.assets[0].uri); setUploadedPhoto(null); } }
  async function pickPhoto() { const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.65, allowsEditing: true }); if (!result.canceled) { setImageUri(result.assets[0].uri); setUploadedPhoto(null); } }
  function patchItem(key: string, values: Partial<DraftItem>) { setItems((current) => current.map((item) => item.key === key ? { ...item, ...values } : item)); }
  function toggleAssignee(item: DraftItem, memberId: string) { patchItem(item.key, { assigneeIds: item.assigneeIds.includes(memberId) ? item.assigneeIds.filter((id) => id !== memberId) : [...item.assigneeIds, memberId] }); }
  const subtotalCents = parseMoney(subtotal) ?? 0, taxCents = parseMoney(tax) ?? 0, tipCents = parseMoney(tip) ?? 0, calculatedTotal = subtotalCents + taxCents + tipCents;
  async function uploadPhoto() { if (!imageUri || imageUri === existing?.receiptUrl) return existingStorageId; if (uploadedPhoto?.uri === imageUri) return uploadedPhoto.storageId; const uploadUrl = await generateUploadUrl({ groupId: groupId as any }); const blob = await (await fetch(imageUri)).blob(); const result = await fetch(uploadUrl, { method: "POST", headers: { "Content-Type": blob.type || "image/jpeg" }, body: blob }); if (!result.ok) throw new Error("Receipt photo upload failed. Try again."); const storageId = (await result.json()).storageId as string; setUploadedPhoto({ uri: imageUri, storageId }); return storageId; }
  async function submit() {
    const enteredSubtotal = parseMoney(subtotal), enteredTax = parseMoney(tax), enteredTip = parseMoney(tip), enteredTotal = parseMoney(receiptTotal);
    if (!description.trim()) return showToast("Add a name for this receipt expense.");
    if (!payerId) return showToast("Choose who paid for this receipt.");
    if (enteredSubtotal === null || enteredSubtotal <= 0) return showToast("Enter a valid receipt subtotal.");
    if (enteredTax === null || enteredTax < 0 || enteredTip === null || enteredTip < 0) return showToast("Enter valid tax and tip amounts.");
    if (enteredTotal === null || enteredTotal <= 0) return showToast("Enter the receipt total.");
    const totalDifference = enteredTotal - (enteredSubtotal + enteredTax + enteredTip);
    if (totalDifference > 0) return showToast(`Subtotal, tax, and tip are ${formatMoney(totalDifference)} short of the receipt total.`);
    if (totalDifference < 0) return showToast(`Subtotal, tax, and tip exceed the receipt total by ${formatMoney(-totalDifference)}.`);
    const parsedItems = items.map((item) => ({ ...item, amount: parseMoney(item.price) }));
    if (parsedItems.some((item) => !item.name.trim() || item.amount === null || item.amount <= 0)) return showToast("Every receipt item needs a name and positive price.");
    const missingAssignee = parsedItems.find((item) => !item.assigneeIds.length);
    if (missingAssignee) return showToast(`Assign “${missingAssignee.name.trim()}” to at least one person.`);
    const itemTotal = parsedItems.reduce((sum, item) => sum + (item.amount ?? 0), 0);
    const itemDifference = enteredSubtotal - itemTotal;
    if (itemDifference > 0) return showToast(`Item prices are ${formatMoney(itemDifference)} short of the ${formatMoney(enteredSubtotal)} subtotal.`);
    if (itemDifference < 0) return showToast(`Item prices exceed the subtotal by ${formatMoney(-itemDifference)}.`);
    setLoading(true);
    try { const storageId = await uploadPhoto(); const values = { groupId, description, amount: enteredTotal, payerId, splitType: "receipt" as const, date: existing?.expense.date ?? Date.now(), receiptStorageId: storageId, subtotal: enteredSubtotal, tax: enteredTax, tip: enteredTip, items: parsedItems.map(({ key, name, amount, assigneeIds }) => ({ key, name, amount: amount!, assigneeIds })) }; if (expenseId) await update({ expenseId: expenseId as any, ...values } as any); else await create(values as any); router.back(); } catch (err) { showToast(errorMessage(err)); } finally { setLoading(false); }
  }
  return <Screen><PageHeader title={expenseId ? "Edit receipt" : "Split a receipt"} subtitle="Add each item, then assign who shared it." /><Pressable onPress={chooseSource} style={styles.photo}>{imageUri ? <Image source={{ uri: imageUri }} style={styles.image} /> : <><Text style={styles.camera}>📷</Text><Text style={styles.photoTitle}>Add receipt photo</Text><Text style={styles.photoBody}>Camera or photo library</Text></>}</Pressable><Card style={styles.form}><Field label="Expense name" value={description} onChangeText={setDescription} placeholder="Dinner at Loro" maxLength={100} /><Text style={styles.label}>Who paid?</Text><View style={styles.chips}>{activeMembers.map((member: any) => <Chip key={member._id} label={member.name} selected={payerId === member._id} onPress={() => setPayerId(member._id)} />)}</View></Card>
    <SectionHeader title="Receipt totals" /><Card style={styles.form}><Field label="Subtotal" value={subtotal} onChangeText={setSubtotal} keyboardType="decimal-pad" placeholder="0.00" /><View style={styles.two}><View style={styles.flex}><Field label="Tax" value={tax} onChangeText={setTax} keyboardType="decimal-pad" /></View><View style={styles.flex}><Field label="Tip" value={tip} onChangeText={setTip} keyboardType="decimal-pad" /></View></View><Field label="Receipt total" value={receiptTotal} onChangeText={setReceiptTotal} keyboardType="decimal-pad" placeholder="0.00" /><View style={styles.totalRow}><Text style={styles.totalLabel}>Calculated total</Text><Text style={styles.totalAmount}>{formatMoney(calculatedTotal)}</Text></View></Card>
    <SectionHeader title="Items" action={<Button label="＋ Item" compact variant="secondary" onPress={() => setItems((current) => [...current, { key: `item-${Date.now()}`, name: "", price: "", assigneeIds: [] }])} />} />
    {items.map((item, index) => <Card key={item.key} style={styles.form}><View style={styles.itemHeader}><Text style={styles.itemTitle}>Item {index + 1}</Text>{items.length > 1 ? <Text style={styles.remove} onPress={() => setItems((current) => current.filter((entry) => entry.key !== item.key))}>Remove</Text> : null}</View><Field label="Item name" value={item.name} onChangeText={(name) => patchItem(item.key, { name })} placeholder="Tacos" /><Field label="Price" value={item.price} onChangeText={(price) => patchItem(item.key, { price })} keyboardType="decimal-pad" placeholder="0.00" /><Text style={styles.label}>Who had this?</Text><View style={styles.chips}>{activeMembers.map((member: any) => <Chip key={member._id} label={member.name} selected={item.assigneeIds.includes(member._id)} onPress={() => toggleAssignee(item, member._id)} />)}</View></Card>)}
    <Button label={expenseId ? "Save receipt" : "Add receipt expense"} onPress={submit} loading={loading} disabled={!description.trim() || !payerId || !subtotal || !items.length} />
  </Screen>;
}
const styles = StyleSheet.create({ photo: { minHeight: 150, borderWidth: 1, borderStyle: "dashed", borderColor: colors.border, borderRadius: 16, alignItems: "center", justifyContent: "center", overflow: "hidden", backgroundColor: colors.surface }, image: { width: "100%", height: 210, resizeMode: "cover" }, camera: { fontSize: 28 }, photoTitle: { color: colors.ink, fontWeight: "700", marginTop: 8 }, photoBody: { color: colors.inkMuted, fontSize: 12, marginTop: 3 }, form: { gap: 13 }, label: { color: colors.ink, fontSize: 14, fontWeight: "600" }, chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 }, two: { flexDirection: "row", gap: 12 }, flex: { flex: 1 }, totalRow: { paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border, flexDirection: "row", justifyContent: "space-between" }, totalLabel: { color: colors.ink, fontWeight: "600" }, totalAmount: { color: colors.primary, fontWeight: "800", fontSize: 18 }, itemHeader: { flexDirection: "row", justifyContent: "space-between" }, itemTitle: { color: colors.ink, fontWeight: "700", fontSize: 16 }, remove: { color: colors.negative, fontWeight: "600" } });
