import { useSignIn, useSignUp } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useToast } from "@/components/toast";

type Step = "welcome" | "email" | "code";
type AuthAttempt = "signIn" | "signUp";

const BLUE = "#1478FF";
const INK = "#07162F";
const MUTED = "#5E6D85";

export default function SignInScreen() {
  const { signIn, fetchStatus: signInStatus } = useSignIn();
  const { signUp, fetchStatus: signUpStatus } = useSignUp();
  const [step, setStep] = useState<Step>("welcome");
  const [attempt, setAttempt] = useState<AuthAttempt>("signIn");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();
  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    if (step !== "code") return;
    const focusTimer = setTimeout(() => codeInput.current?.focus(), 300);
    return () => clearTimeout(focusTimer);
  }, [step]);

  function goBack() {
    setCode("");
    if (step === "code") {
      Keyboard.dismiss();
      setStep("email");
    } else {
      setStep("welcome");
    }
  }

  function showAuthError(error: unknown, fallback: string) {
    const code = (error as { code?: string } | null)?.code;
    const message = (error as { message?: string } | null)?.message ?? "";
    if (code === "form_identifier_not_found") {
      showToast("No account found for that email. Choose Create account to get started.");
    } else if (code === "form_identifier_exists") {
      showToast("That email already has an account. Choose Sign in instead.");
    } else if (/code|verification/i.test(code ?? "") || /code|verification/i.test(message)) {
      showToast("That code isn’t correct or has expired. Check your email and try again.");
    } else if (/email|identifier/i.test(code ?? "") || /email|identifier/i.test(message)) {
      showToast("Enter a valid email address and try again.");
    } else {
      showToast(fallback);
    }
  }

  async function prepareSignIn() {
    const { error: createError } = await signIn.create({ identifier: email.trim() });
    if (createError) throw createError;
    const { error: sendError } = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
    if (sendError) throw sendError;
  }

  async function prepareSignUp() {
    const { error: createError } = await signUp.create({ emailAddress: email.trim() });
    if (createError) throw createError;
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) throw sendError;
  }

  async function sendCode() {
    setLoading(true);
    try {
      if (attempt === "signIn") await prepareSignIn();
      else await prepareSignUp();
      setStep("code");
    } catch (err) {
      showAuthError(err, "We couldn’t send a code. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(verificationCode = code) {
    if (verificationCode.length !== 6) {
      showToast("Enter the 6-digit code from your email.");
      return;
    }
    setLoading(true);
    try {
      if (attempt === "signIn") {
        const { error: verifyError } = await signIn.emailCode.verifyCode({ code: verificationCode });
        if (verifyError) throw verifyError;
        const { error: finalizeError } = await signIn.finalize({ navigate: () => {} });
        if (finalizeError) throw finalizeError;
      } else {
        const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: verificationCode });
        if (verifyError) throw verifyError;
        const { error: finalizeError } = await signUp.finalize({ navigate: () => {} });
        if (finalizeError) throw finalizeError;
      }
    } catch (err) {
      showAuthError(err, "We couldn’t verify that code. Try again in a moment.");
    } finally {
      setLoading(false);
    }
  }

  if (step === "welcome") {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.welcome} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.brandBlock}>
            <View style={styles.logo} accessibilityLabel="Split-app logo">
              <View style={styles.logoLeft} />
              <View style={styles.logoRight} />
            </View>
            <Text style={styles.brand}>Split-app</Text>
          </View>

          <View style={styles.introCopy}>
            <Text style={styles.headline}>Split expenses.{"\n"}Not friendships.</Text>
            <Text style={styles.subtitle}>Track shared expenses and know{"\n"}exactly who owes whom.</Text>
          </View>

          <View style={styles.illustrationWrap}>
            <Image source={require("../../assets/images/auth-friends.png")} resizeMode="contain" style={styles.illustration} />
          </View>

          <PrimaryButton label="Sign in" onPress={() => { setAttempt("signIn"); setStep("email"); }} />
          <Pressable accessibilityRole="button" onPress={() => { setAttempt("signUp"); setStep("email"); }} style={styles.secondaryAction}>
            <Text style={styles.secondaryActionText}>Create account</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={16} onPress={goBack} style={styles.backButton}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>

        <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {step === "email" ? (
          <View style={styles.emailContent}>
            <Text style={styles.formTitle}>{attempt === "signUp" ? "Create your account" : "Welcome back"}</Text>
            <Text style={styles.formSubtitle}>{attempt === "signUp" ? "Enter your email and we’ll send a verification code." : "Enter your email and we’ll send a sign-in code."}</Text>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Email address</Text>
              <TextInput
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                onChangeText={setEmail}
                placeholder="you@example.com"
                placeholderTextColor="#8290A5"
                selectionColor={BLUE}
                style={styles.input}
                value={email}
              />
            </View>

            <PrimaryButton disabled={!email.trim().includes("@")} label={attempt === "signUp" ? "Create account" : "Send code"} loading={loading || signInStatus === "fetching" || signUpStatus === "fetching"} onPress={sendCode} />
            <Pressable accessibilityRole="button" disabled={loading} onPress={() => setAttempt(attempt === "signIn" ? "signUp" : "signIn")} style={styles.switchAttempt}>
              <Text style={styles.switchAttemptText}>{attempt === "signIn" ? "New to Split-app? Create account" : "Already have an account? Sign in"}</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.codeContent}>
            <Text style={styles.formTitle}>Enter verification code</Text>
            <Text style={styles.formSubtitle}>We sent a 6-digit code to</Text>
            <Text style={styles.emailAddress}>{email.trim()}</Text>

            <Pressable onPress={() => codeInput.current?.focus()} style={styles.codeRow}>
              {Array.from({ length: 6 }, (_, index) => (
                <View key={index} style={[styles.codeBox, code.length === index && styles.codeBoxFocused]}>
                  <Text style={styles.codeDigit}>{code[index] ?? ""}</Text>
                </View>
              ))}
              <TextInput
                ref={codeInput}
                autoComplete="one-time-code"
                caretHidden
                keyboardType="number-pad"
                maxLength={6}
                onChangeText={(value) => {
                  const nextCode = value.replace(/\D/g, "");
                  setCode(nextCode);
                  if (nextCode.length === 6) void verifyCode(nextCode);
                }}
                onSubmitEditing={() => void verifyCode()}
                style={styles.hiddenCodeInput}
                value={code}
              />
            </Pressable>

            {loading ? <ActivityIndicator color={BLUE} style={styles.codeLoader} /> : null}

            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn’t get a code? </Text>
              <Pressable disabled={loading} hitSlop={8} onPress={sendCode}>
                <Text style={styles.resend}>Resend</Text>
              </Pressable>
            </View>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PrimaryButton({ disabled, label, loading, onPress }: { disabled?: boolean; label: string; loading?: boolean; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.primaryButton, pressed && styles.primaryButtonPressed, disabled && styles.primaryButtonDisabled]}
    >
      {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#FFFFFF" },
  flex: { flex: 1 },
  welcome: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 64, paddingBottom: 24 },
  brandBlock: { alignItems: "center" },
  logo: { width: 63, height: 46, marginBottom: 10 },
  logoLeft: { position: "absolute", left: 4, top: 1, width: 43, height: 43, borderRadius: 22, backgroundColor: "#006BFA" },
  logoRight: { position: "absolute", right: 4, top: 6, width: 39, height: 39, borderRadius: 20, backgroundColor: "rgba(76, 147, 255, 0.82)" },
  brand: { color: INK, fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -1.1 },
  introCopy: { alignItems: "center", marginTop: 30 },
  headline: { color: INK, fontSize: 25, lineHeight: 28, fontWeight: "700", letterSpacing: -0.55, textAlign: "center" },
  subtitle: { color: MUTED, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 13 },
  illustrationWrap: { flex: 1, minHeight: 220, justifyContent: "flex-end", marginHorizontal: -24, overflow: "hidden" },
  illustration: { width: "116%", height: 270, alignSelf: "center", transform: [{ translateY: 14 }] },
  primaryButton: { height: 54, borderRadius: 18, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  primaryButtonPressed: { backgroundColor: "#0868E8", transform: [{ scale: 0.99 }] },
  primaryButtonDisabled: { opacity: 1 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", letterSpacing: -0.15 },
  secondaryAction: { minHeight: 42, alignItems: "center", justifyContent: "center", marginTop: 4 },
  secondaryActionText: { color: BLUE, fontSize: 16, fontWeight: "600" },
  backButton: { position: "absolute", zIndex: 2, top: 28, left: 18, width: 40, height: 42, justifyContent: "center" },
  backGlyph: { color: INK, fontSize: 38, lineHeight: 38, fontWeight: "300" },
  formScroll: { flexGrow: 1 },
  emailContent: { flex: 1, paddingHorizontal: 24, paddingTop: 150, paddingBottom: 32 },
  codeContent: { flex: 1, paddingHorizontal: 20, paddingTop: 150, paddingBottom: 32, alignItems: "center" },
  formTitle: { color: INK, fontSize: 22, lineHeight: 28, fontWeight: "700", letterSpacing: -0.45, textAlign: "center" },
  formSubtitle: { color: MUTED, fontSize: 15, lineHeight: 21, textAlign: "center", marginTop: 13 },
  emailAddress: { color: INK, fontSize: 15, lineHeight: 21, textAlign: "center" },
  fieldGroup: { gap: 7, marginTop: 37, marginBottom: 16 },
  label: { color: INK, fontSize: 14, fontWeight: "600" },
  input: { height: 52, borderWidth: 1, borderColor: "#D5DDE8", borderRadius: 11, paddingHorizontal: 14, color: INK, fontSize: 16, backgroundColor: "#FFFFFF" },
  codeRow: { flexDirection: "row", gap: 7, marginTop: 31, alignSelf: "stretch", justifyContent: "center" },
  codeBox: { width: 45, height: 53, borderWidth: 1, borderColor: "#D5DDE8", borderRadius: 8, alignItems: "center", justifyContent: "center", backgroundColor: "#FFFFFF" },
  codeBoxFocused: { borderColor: "#AFC7E7" },
  codeDigit: { color: INK, fontSize: 22, fontWeight: "600" },
  hiddenCodeInput: { position: "absolute", width: 1, height: 1, opacity: 0 },
  resendRow: { flexDirection: "row", alignItems: "center", marginTop: 24 },
  resendPrompt: { color: MUTED, fontSize: 14 },
  resend: { color: BLUE, fontSize: 14, fontWeight: "500" },
  switchAttempt: { alignSelf: "center", minHeight: 44, justifyContent: "center", marginTop: 12 },
  switchAttemptText: { color: BLUE, fontSize: 14, fontWeight: "600" },
  codeLoader: { marginTop: 16 },
});
