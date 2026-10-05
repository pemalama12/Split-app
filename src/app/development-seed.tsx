import { api } from "@/../convex/_generated/api";
import { useMutation } from "convex/react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { useEffect, useRef } from "react";
import { Text, View } from "react-native";
import { colors } from "@/constants/theme";
import { useToast } from "@/components/toast";

export default function DevelopmentSeedRunner() {
  const { run } = useLocalSearchParams<{ run?: string }>();
  const seed = useMutation(api.developmentSeed.seed);
  const { showToast } = useToast();
  const started = useRef(false);
  useEffect(() => {
    if (__DEV__ && run === "1" && !started.current) {
      started.current = true;
      void seed({}).then((result) => {
        showToast(result.created ? "Development sample data added." : "Sample data already exists.", "success");
        router.replace("/(tabs)/groups");
      }).catch((error) => {
        showToast(error instanceof Error ? error.message : "Could not add development sample data.");
        router.replace("/(tabs)/profile");
      });
    }
  }, [run, seed, showToast]);
  if (!__DEV__) return <Redirect href="/(tabs)/groups" />;
  return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background }}><Text style={{ color: colors.ink, fontSize: 16, fontWeight: "600" }}>Adding development sample data…</Text></View>;
}
