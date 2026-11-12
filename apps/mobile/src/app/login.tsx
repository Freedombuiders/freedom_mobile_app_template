import { APP_INFO } from "@app/shared/app-info";
import { firstError, loginSchema } from "@app/shared/schemas";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function LoginScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy(true);
    setError("");
    try {
      await signIn("/api/auth/login", parsed.data); // Stack.Protected then shows the (app) group
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen edges={["top", "bottom"]}>
      <View style={styles.hero}>
        <Image source={require("@/assets/images/icon.png")} style={styles.logo} />
        <Title>{APP_INFO.name}</Title>
        <Muted>{APP_INFO.tagline}</Muted>
      </View>
      <Card>
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Mật khẩu" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
        <ErrorText>{error}</ErrorText>
        <Button title="Đăng nhập" onPress={submit} busy={busy} />
      </Card>
      <Text style={styles.footer}>
        Chưa có tài khoản?{" "}
        <Link href="/signup" style={styles.link}>
          Đăng ký
        </Link>
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: 8, marginTop: 48, marginBottom: 8 },
  logo: { width: 80, height: 80, borderRadius: 20, marginBottom: 8 },
  footer: { textAlign: "center", color: colors.muted },
  link: { color: colors.brand, fontWeight: "700" },
});
