import type { PropsWithChildren } from "react";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, radius } from "@/constants/theme";

type ToastTone = "error" | "success";
type Toast = { message: string; tone: ToastTone } | null;
type ToastContextValue = { showToast: (message: string, tone?: ToastTone) => void };

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: PropsWithChildren) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<Toast>(null);
  const showToast = useCallback((message: string, tone: ToastTone = "error") => setToast({ message, tone }), []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 4800);
    return () => clearTimeout(timeout);
  }, [toast]);
  const value = useMemo(() => ({ showToast }), [showToast]);
  return <ToastContext.Provider value={value}>{children}{toast ? <View pointerEvents="box-none" style={[styles.host, { top: insets.top + 12 }]}><Pressable accessibilityRole="alert" onPress={() => setToast(null)} style={[styles.toast, toast.tone === "success" ? styles.success : styles.error]}><Text style={styles.icon}>{toast.tone === "success" ? "✓" : "!"}</Text><Text style={styles.message}>{toast.message}</Text></Pressable></View> : null}</ToastContext.Provider>;
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider.");
  return context;
}

const styles = StyleSheet.create({
  host: { position: "absolute", left: 16, right: 16, zIndex: 100, elevation: 100 },
  toast: { minHeight: 58, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, flexDirection: "row", alignItems: "center", gap: 10, shadowColor: "#10221B", shadowOpacity: 0.16, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 8 },
  error: { backgroundColor: "#3F2422" }, success: { backgroundColor: colors.primary },
  icon: { width: 22, height: 22, borderRadius: 11, textAlign: "center", lineHeight: 22, backgroundColor: "rgba(255,255,255,0.2)", color: colors.white, fontWeight: "800" },
  message: { flex: 1, color: colors.white, fontSize: 14, lineHeight: 20, fontWeight: "600" },
});
