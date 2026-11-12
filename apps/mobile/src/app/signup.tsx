import { LEGAL_PATHS } from "@app/shared/app-info";
import { firstError, signupSchema } from "@app/shared/schemas";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { StyleSheet, Text } from "react-native";
import { Button, Card, ErrorText, Field, Screen } from "@/components/ui";
import { WEB_URL } from "@/lib/config";
import { useSession } from "@/lib/session";
import { colors } from "@/lib/theme";

export default function SignupScreen() {
  const { signIn } = useSession();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const parsed = signupSchema.safeParse({ name, email, password });
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy(true);
    setError("");
    try {
      await signIn("/api/auth/signup", parsed.data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const open = (path: string) => void WebBrowser.openBrowserAsync(WEB_URL + path);

  return (
    <Screen edges={["bottom"]}>
      <Card>
        <Field label="Tên của bạn" value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
        <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} spellCheck={false} autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
        <Field label="Mật khẩu (ít nhất 8 ký tự)" value={password} onChangeText={setPassword} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
        <ErrorText>{error}</ErrorText>
        <Button title="Đăng ký" onPress={submit} busy={busy} />
      </Card>
      <Text style={styles.legal}>
        Khi đăng ký, bạn đồng ý với{" "}
        <Text style={styles.link} onPress={() => open(LEGAL_PATHS.terms)}>
          Điều khoản
        </Text>{" "}
        và{" "}
        <Text style={styles.link} onPress={() => open(LEGAL_PATHS.privacy)}>
          Chính sách bảo mật
        </Text>
        .
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  legal: { textAlign: "center", color: colors.muted, fontSize: 13 },
  link: { color: colors.brand, textDecorationLine: "underline" },
});
