import { useSignIn, useSignUp } from "@clerk/expo";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ErrorBanner } from "@/components/ui";
import { errorMessage } from "@/lib/errors";

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
  const [error, setError] = useState("");
  const codeInput = useRef<TextInput>(null);

  useEffect(() => {
    if (step !== "code") return;
    const focusTimer = setTimeout(() => codeInput.current?.focus(), 300);
    return () => clearTimeout(focusTimer);
  }, [step]);

  function goBack() {
    setError("");
    setCode("");
    if (step === "code") {
      Keyboard.dismiss();
      setStep("email");
    } else {
      setStep("welcome");
    }
  }

  async function prepareSignIn() {
    const { error: createError } = await signIn.create({ identifier: email.trim() });
    if (createError?.code === "form_identifier_not_found") return false;
    if (createError) throw new Error(createError.message);
    const { error: sendError } = await signIn.emailCode.sendCode({ emailAddress: email.trim() });
    if (sendError) throw new Error(sendError.message);
    setAttempt("signIn");
    return true;
  }

  async function prepareSignUp() {
    const { error: createError } = await signUp.create({ emailAddress: email.trim() });
    if (createError) throw new Error(createError.message);
    const { error: sendError } = await signUp.verifications.sendEmailCode();
    if (sendError) throw new Error(sendError.message);
    setAttempt("signUp");
  }

  async function sendCode() {
    setError("");
    setLoading(true);
    try {
      const existingUser = await prepareSignIn();
      if (!existingUser) await prepareSignUp();
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(verificationCode = code) {
    if (verificationCode.length !== 6) return;
    setError("");
    setLoading(true);
    try {
      if (attempt === "signIn") {
        const { error: verifyError } = await signIn.emailCode.verifyCode({ code: verificationCode });
        if (verifyError) throw new Error(verifyError.message);
        if (signIn.status !== "complete") throw new Error("That code could not be verified.");
        await signIn.finalize({ navigate: () => {} });
      } else {
        const { error: verifyError } = await signUp.verifications.verifyEmailCode({ code: verificationCode });
        if (verifyError) throw new Error(verifyError.message);
        if (signUp.status !== "complete") throw new Error("That code could not be verified.");
        await signUp.finalize({ navigate: () => {} });
      }
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (step === "welcome") {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.welcome}>
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

          <PrimaryButton label="Get started" onPress={() => setStep("email")} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.flex}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" hitSlop={16} onPress={goBack} style={styles.backButton}>
          <Text style={styles.backGlyph}>‹</Text>
        </Pressable>

        {step === "email" ? (
          <View style={styles.emailContent}>
            <Text style={styles.formTitle}>Enter your email</Text>
            <Text style={styles.formSubtitle}>We’ll send you a verification code{"\n"}to sign in to Split-app.</Text>

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

            {error ? <ErrorBanner message={error} /> : null}
            <PrimaryButton disabled={!email.trim().includes("@")} label="Send code" loading={loading || signInStatus === "fetching" || signUpStatus === "fetching"} onPress={sendCode} />
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

            {error ? <ErrorBanner message={error} /> : null}
            {loading ? <ActivityIndicator color={BLUE} style={styles.codeLoader} /> : null}

            <View style={styles.resendRow}>
              <Text style={styles.resendPrompt}>Didn’t get a code? </Text>
              <Pressable disabled={loading} hitSlop={8} onPress={sendCode}>
                <Text style={styles.resend}>Resend</Text>
              </Pressable>
            </View>
          </View>
        )}
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
  welcome: { flex: 1, paddingHorizontal: 24, paddingTop: 95, paddingBottom: 10 },
  brandBlock: { alignItems: "center" },
  logo: { width: 63, height: 46, marginBottom: 10 },
  logoLeft: { position: "absolute", left: 4, top: 1, width: 43, height: 43, borderRadius: 22, backgroundColor: "#006BFA" },
  logoRight: { position: "absolute", right: 4, top: 6, width: 39, height: 39, borderRadius: 20, backgroundColor: "rgba(76, 147, 255, 0.82)" },
  brand: { color: INK, fontSize: 29, lineHeight: 35, fontWeight: "800", letterSpacing: -1.1 },
  introCopy: { alignItems: "center", marginTop: 30 },
  headline: { color: INK, fontSize: 25, lineHeight: 28, fontWeight: "700", letterSpacing: -0.55, textAlign: "center" },
  subtitle: { color: MUTED, fontSize: 15, lineHeight: 22, textAlign: "center", marginTop: 13 },
  illustrationWrap: { flex: 1, minHeight: 220, justifyContent: "flex-end", marginHorizontal: -24, overflow: "hidden" },
  illustration: { width: "116%", height: "100%", alignSelf: "center", transform: [{ translateY: 14 }] },
  primaryButton: { height: 54, borderRadius: 18, backgroundColor: BLUE, alignItems: "center", justifyContent: "center" },
  primaryButtonPressed: { backgroundColor: "#0868E8", transform: [{ scale: 0.99 }] },
  primaryButtonDisabled: { opacity: 1 },
  primaryButtonText: { color: "#FFFFFF", fontSize: 16, fontWeight: "600", letterSpacing: -0.15 },
  backButton: { position: "absolute", zIndex: 2, top: 28, left: 18, width: 40, height: 42, justifyContent: "center" },
  backGlyph: { color: INK, fontSize: 38, lineHeight: 38, fontWeight: "300" },
  emailContent: { paddingHorizontal: 24, paddingTop: 240 },
  codeContent: { paddingHorizontal: 20, paddingTop: 224, alignItems: "center" },
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
  codeLoader: { marginTop: 16 },
});
