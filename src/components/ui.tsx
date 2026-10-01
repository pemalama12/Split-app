import type { PropsWithChildren, ReactNode } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, type TextInputProps, View, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing } from "@/constants/theme";

export function Screen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const content = scroll ? <ScrollView contentContainerStyle={styles.screenContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>{children}</ScrollView> : <View style={styles.screenContent}>{children}</View>;
  return <SafeAreaView style={styles.safe} edges={["bottom"]}><KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={88}>{content}</KeyboardAvoidingView></SafeAreaView>;
}
export function PageHeader({ eyebrow, title, subtitle, action }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return <View style={styles.headerRow}><View style={styles.headerCopy}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.title}>{title}</Text>{subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}</View>{action}</View>;
}
export function Card({ children, style }: PropsWithChildren<{ style?: ViewStyle }>) { return <View style={[styles.card, style]}>{children}</View>; }
export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) { return <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>{title}</Text>{action}</View>; }
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  return <View style={styles.fieldWrap}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#96A19C" selectionColor={colors.primary} style={[styles.input, props.multiline && styles.multiline, props.style]} />{error ? <Text style={styles.error}>{error}</Text> : null}</View>;
}
export function Button({ label, onPress, variant = "primary", loading, disabled, compact }: { label: string; onPress: () => void; variant?: "primary" | "secondary" | "danger" | "ghost"; loading?: boolean; disabled?: boolean; compact?: boolean }) {
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, compact && styles.buttonCompact, styles[`button_${variant}`], pressed && styles.buttonPressed, (disabled || loading) && styles.buttonDisabled]}>{loading ? <ActivityIndicator color={variant === "primary" ? colors.white : colors.primary} /> : <Text style={[styles.buttonText, styles[`buttonText_${variant}`]]}>{label}</Text>}</Pressable>;
}
export function EmptyState({ icon, title, body, action }: { icon: string; title: string; body: string; action?: ReactNode }) {
  return <View style={styles.empty}><View style={styles.emptyIcon}><Text style={styles.emptyEmoji}>{icon}</Text></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>{action ? <View style={styles.emptyAction}>{action}</View> : null}</View>;
}
export function LoadingState({ label = "Loading…" }: { label?: string }) { return <View style={styles.loading}><ActivityIndicator color={colors.primary} /><Text style={styles.muted}>{label}</Text></View>; }
export function ErrorBanner({ message }: { message: string }) { return <Text style={styles.errorBanner}>{message}</Text>; }
export function Avatar({ name, size = 42 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
  return <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}><Text style={[styles.avatarText, { fontSize: size * 0.35 }]}>{initials || "?"}</Text></View>;
}
export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) { return <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipSelected]}><Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text></Pressable>; }

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background }, screenContent: { padding: spacing.lg, paddingBottom: 44, gap: spacing.lg, flexGrow: 1 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 }, headerCopy: { flex: 1, gap: 5 }, eyebrow: { color: colors.primary, fontSize: 12, fontWeight: "700", letterSpacing: 1.2, textTransform: "uppercase" },
  title: { color: colors.ink, fontSize: 30, lineHeight: 35, fontWeight: "800", letterSpacing: -0.8 }, subtitle: { color: colors.inkMuted, fontSize: 15, lineHeight: 21 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.lg }, sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" }, sectionTitle: { color: colors.ink, fontSize: 18, fontWeight: "700" },
  fieldWrap: { gap: 7 }, label: { color: colors.ink, fontSize: 14, fontWeight: "600" }, input: { minHeight: 50, borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, backgroundColor: colors.surface, paddingHorizontal: 14, color: colors.ink, fontSize: 16 }, multiline: { minHeight: 92, paddingTop: 14, textAlignVertical: "top" }, error: { color: colors.negative, fontSize: 13 },
  button: { minHeight: 50, borderRadius: radius.sm, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", flexDirection: "row" }, buttonCompact: { minHeight: 38, paddingHorizontal: 13 }, button_primary: { backgroundColor: colors.primary }, button_secondary: { backgroundColor: colors.primarySoft }, button_danger: { backgroundColor: "#FCE8E5" }, button_ghost: { backgroundColor: "transparent" }, buttonPressed: { opacity: 0.76 }, buttonDisabled: { opacity: 0.45 }, buttonText: { fontSize: 16, fontWeight: "700" }, buttonText_primary: { color: colors.white }, buttonText_secondary: { color: colors.primary }, buttonText_danger: { color: colors.negative }, buttonText_ghost: { color: colors.primary },
  empty: { flex: 1, minHeight: 340, alignItems: "center", justifyContent: "center", paddingHorizontal: 24 }, emptyIcon: { width: 72, height: 72, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center", marginBottom: 18 }, emptyEmoji: { fontSize: 30 }, emptyTitle: { fontSize: 21, fontWeight: "700", color: colors.ink, textAlign: "center" }, emptyBody: { fontSize: 15, lineHeight: 21, color: colors.inkMuted, textAlign: "center", marginTop: 8 }, emptyAction: { marginTop: 20, alignSelf: "stretch" },
  loading: { flex: 1, minHeight: 320, alignItems: "center", justifyContent: "center", gap: 12 }, muted: { color: colors.inkMuted, fontSize: 14 }, errorBanner: { color: colors.negative, backgroundColor: "#FCE8E5", padding: 12, borderRadius: radius.sm, overflow: "hidden", fontSize: 14 }, avatar: { backgroundColor: colors.primarySoft, alignItems: "center", justifyContent: "center" }, avatarText: { color: colors.primary, fontWeight: "800" }, chip: { paddingHorizontal: 13, minHeight: 36, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface }, chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary }, chipText: { color: colors.inkMuted, fontWeight: "600" }, chipTextSelected: { color: colors.white },
});
