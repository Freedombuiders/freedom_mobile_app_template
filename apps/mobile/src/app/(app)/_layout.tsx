import { NativeTabs } from "expo-router/native-tabs";
import { colors } from "@/lib/theme";

// Signed-in area: native tab bar (UITabBar on iOS, Material bottom navigation on Android).
// Add a tab = add a file in this folder + a Trigger here. iOS icons are SF Symbols, Android uses the PNGs in
// assets/images/tabIcons (replace them with your own).
export default function AppTabs() {
  return (
    <NativeTabs tintColor={colors.brand}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Ghi chú</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "note.text", selected: "note.text" }} src={require("@/assets/images/tabIcons/home.png")} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Cài đặt</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "gearshape", selected: "gearshape.fill" }} src={require("@/assets/images/tabIcons/explore.png")} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
