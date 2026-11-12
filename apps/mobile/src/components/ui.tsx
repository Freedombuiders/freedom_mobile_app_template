// Small UI kit for the app. Restyle these to match your design instead of styling every screen by hand.
import type { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, font, radius, space } from "@/lib/theme";

/** Scrollable screen with safe areas, keyboard avoidance and a readable max width on tablets. */
export function Screen({ children, edges = ["top"] }: { children: ReactNode; edges?: ("top" | "bottom")[] }) {
  return (
    <SafeAreaView style={styles.safe} edges={edges}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.content}>{children}</View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Title({ children }: { children: ReactNode }) {
  return <Text style={styles.title}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: object }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} {...props} style={[styles.input, props.multiline && { minHeight: 88 }, props.style]} />
    </View>
  );
}

type ButtonProps = {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger" | "ghost";
  busy?: boolean;
  disabled?: boolean;
};

export function Button({ title, onPress, variant = "primary", busy, disabled }: ButtonProps) {
  const dark = variant === "primary" || variant === "danger";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        variant === "primary" && { backgroundColor: pressed ? colors.brandDark : colors.brand },
        variant === "danger" && { backgroundColor: colors.danger },
        variant === "secondary" && { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line },
        variant === "ghost" && { backgroundColor: "transparent" },
        (disabled || busy) && { opacity: 0.6 },
        pressed && variant !== "primary" && { opacity: 0.7 },
      ]}
    >
      {busy ? (
        <ActivityIndicator color={dark ? "#fff" : colors.ink} />
      ) : (
        <Text style={[styles.buttonText, { color: dark ? "#fff" : variant === "ghost" ? colors.muted : colors.ink }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function ErrorText({ children }: { children?: string }) {
  if (!children) return null;
  return <Text style={styles.error}>{children}</Text>;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scroll: { flexGrow: 1, padding: space.lg },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", gap: space.lg },
  title: { fontSize: font.title, fontWeight: "800", color: colors.ink },
  muted: { fontSize: font.small, color: colors.muted },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 1, borderColor: colors.line, padding: space.lg, gap: space.md },
  label: { fontSize: font.small, fontWeight: "600", color: colors.ink },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.md,
    backgroundColor: colors.card,
    paddingHorizontal: space.md,
    paddingVertical: Platform.OS === "ios" ? 12 : 8,
    fontSize: font.body,
    color: colors.ink,
  },
  button: { minHeight: 48, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  buttonText: { fontSize: font.body, fontWeight: "700" },
  error: { color: colors.danger, backgroundColor: "#fef2f2", padding: space.sm, borderRadius: radius.sm, fontSize: font.small },
});
