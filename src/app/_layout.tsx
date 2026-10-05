import { ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { ConvexReactClient, useConvexAuth } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import { initialWindowMetrics, SafeAreaProvider } from "react-native-safe-area-context";
import { colors } from "@/constants/theme";
import { ToastProvider } from "@/components/toast";

const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL;
// Group data is always backed by the configured Convex deployment.
const convex = convexUrl ? new ConvexReactClient(convexUrl, { unsavedChangesWarning: false }) : null;

function Navigator() {
  const { isLoaded, isSignedIn } = useAuth();
  const { isLoading: isConvexLoading, isAuthenticated: isConvexAuthenticated } = useConvexAuth();
  if (!isLoaded || (isSignedIn && isConvexLoading)) return <View style={styles.center}><Text style={styles.brand}>SplitSimple</Text></View>;
  if (isSignedIn && !isConvexAuthenticated) return <View style={styles.center}><Text style={styles.configTitle}>Couldn’t connect your account</Text><Text style={styles.configBody}>Your Clerk session could not be verified by Convex. Check the Clerk issuer configuration, then restart the app.</Text></View>;
  return <><StatusBar style="dark" /><Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: colors.background }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.background } }}>
    <Stack.Protected guard={!isSignedIn}><Stack.Screen name="sign-in" options={{ headerShown: false }} /></Stack.Protected>
    <Stack.Protected guard={Boolean(isSignedIn)}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="complete-profile" options={{ title: "Your profile", headerBackVisible: false }} />
      <Stack.Screen name="invite" options={{ title: "Join a group", presentation: "modal" }} />
      {__DEV__ ? <Stack.Screen name="development-seed" options={{ headerShown: false }} /> : null}
      <Stack.Screen name="group/new" options={{ title: "New group", presentation: "modal" }} />
      <Stack.Screen name="group/[groupId]" options={{ title: "Group" }} />
      <Stack.Screen name="group/[groupId]/members" options={{ title: "Members" }} />
      <Stack.Screen name="group/[groupId]/expense" options={{ title: "Add expense", presentation: "modal" }} />
      <Stack.Screen name="group/[groupId]/receipt" options={{ title: "Split receipt", presentation: "modal" }} />
      <Stack.Screen name="group/[groupId]/settle" options={{ title: "Settle up", presentation: "modal" }} />
      <Stack.Screen name="expense/[expenseId]" options={{ title: "Expense" }} />
    </Stack.Protected>
  </Stack></>;
}

export default function RootLayout() {
  if (!clerkKey || !convex) return <View style={styles.config}><Text style={styles.brand}>SplitSimple</Text><Text style={styles.configTitle}>{!clerkKey ? "Add your Clerk key" : "Connect your services"}</Text><Text style={styles.configBody}>{!clerkKey ? "Set EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY in .env.local, then restart Expo." : "Set EXPO_PUBLIC_CONVEX_URL, then restart the app."}</Text></View>;
  return <SafeAreaProvider initialMetrics={initialWindowMetrics}><ToastProvider><ClerkProvider publishableKey={clerkKey} tokenCache={tokenCache}><ConvexProviderWithClerk client={convex as any} useAuth={useAuth}><Navigator /></ConvexProviderWithClerk></ClerkProvider></ToastProvider></SafeAreaProvider>;
}

const styles = StyleSheet.create({ center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }, config: { flex: 1, alignItems: "center", justifyContent: "center", padding: 28, backgroundColor: colors.background }, brand: { color: colors.primary, fontSize: 26, fontWeight: "800", letterSpacing: -0.6 }, configTitle: { marginTop: 24, color: colors.ink, fontSize: 22, fontWeight: "700" }, configBody: { marginTop: 10, color: colors.inkMuted, textAlign: "center", fontSize: 15, lineHeight: 22 } });
