import { NativeTabs } from "expo-router/unstable-native-tabs";
import { colors } from "@/constants/theme";

export default function TabLayout() {
  return <NativeTabs tintColor={colors.primary} backgroundColor={colors.surface} indicatorColor={colors.primarySoft}>
    <NativeTabs.Trigger name="groups"><NativeTabs.Trigger.Icon sf={{ default: "person.3", selected: "person.3.fill" }} md={{ default: "groups", selected: "groups" }} /><NativeTabs.Trigger.Label>Groups</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="activity"><NativeTabs.Trigger.Icon sf={{ default: "clock", selected: "clock.fill" }} md={{ default: "history", selected: "history" }} /><NativeTabs.Trigger.Label>Activity</NativeTabs.Trigger.Label></NativeTabs.Trigger>
    <NativeTabs.Trigger name="profile"><NativeTabs.Trigger.Icon sf={{ default: "person", selected: "person.fill" }} md={{ default: "person", selected: "person" }} /><NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label></NativeTabs.Trigger>
  </NativeTabs>;
}
