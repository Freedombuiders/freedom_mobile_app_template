// Account screen. Both stores require: links to the privacy policy inside the app, and in-app account deletion
// (App Store guideline 5.1.1(v), Google Play account deletion policy).
import type { User } from "@app/shared/api";
import { APP_INFO, LEGAL_PATHS } from "@app/shared/app-info";
import { firstError, updateProfileSchema } from "@app/shared/schemas";
import * as WebBrowser from "expo-web-browser";
import { useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { Button, Card, ErrorText, Field, Muted, Screen, Title } from "@/components/ui";
import { api, APP_VERSION } from "@/lib/api";
import { WEB_URL } from "@/lib/config";
import { useSession, useUser } from "@/lib/session";
import { colors, space } from "@/lib/theme";

export default function SettingsScreen() {
  const user = useUser();
  const { setUser, signOut, forget } = useSession();
  const [name, setName] = useState(user.name);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"save" | "delete" | null>(null);
  const [showDelete, setShowDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");

  async function save() {
    const parsed = updateProfileSchema.safeParse({ name });
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy("save");
    setError("");
    try {
      setUser(await api.patch<User>("/api/me", parsed.data));
      setMsg("Đã lưu.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  function confirmDelete() {
    Alert.alert("Xoá tài khoản?", "Toàn bộ dữ liệu sẽ bị xoá vĩnh viễn và không thể khôi phục.", [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá vĩnh viễn",
        style: "destructive",
        onPress: async () => {
          setBusy("delete");
          setDeleteError("");
          try {
            await api.del("/api/me", { password });
            await forget(); // Stack.Protected sends us back to login
          } catch (e) {
            setDeleteError((e as Error).message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  const open = (path: string) => void WebBrowser.openBrowserAsync(WEB_URL + path);

  return (
    <Screen>
      <Title>Cài đặt</Title>
      <Card>
        <Muted>{user.email}</Muted>
        <Field label="Tên" value={name} onChangeText={(t) => (setName(t), setMsg(""))} />
        <ErrorText>{error}</ErrorText>
        {!!msg && <Text style={{ color: colors.success }}>{msg}</Text>}
        <Button title="Lưu" onPress={save} busy={busy === "save"} />
      </Card>

      <Card>
        {[
          ["Chính sách bảo mật", LEGAL_PATHS.privacy],
          ["Điều khoản sử dụng", LEGAL_PATHS.terms],
          ["Hỗ trợ", LEGAL_PATHS.support],
        ].map(([label, path]) => (
          <Pressable key={path} onPress={() => open(path!)} style={styles.row}>
            <Text style={styles.rowText}>{label}</Text>
            <Text style={styles.chevron}>›</Text>
          </Pressable>
        ))}
      </Card>

      <Button title="Đăng xuất" variant="secondary" onPress={() => void signOut()} />

      <Card>
        {showDelete ? (
          <>
            <Text style={styles.danger}>Xoá tài khoản</Text>
            <Field label="Nhập mật khẩu để xác nhận" value={password} onChangeText={setPassword} secureTextEntry autoComplete="current-password" />
            <ErrorText>{deleteError}</ErrorText>
            <Button title="Xoá tài khoản vĩnh viễn" variant="danger" onPress={confirmDelete} busy={busy === "delete"} />
            <Button title="Huỷ" variant="ghost" onPress={() => setShowDelete(false)} />
          </>
        ) : (
          <Button title="Xoá tài khoản" variant="ghost" onPress={() => setShowDelete(true)} />
        )}
      </Card>

      <View style={{ alignItems: "center", paddingBottom: space.xl }}>
        <Muted>
          {APP_INFO.name} {APP_VERSION}
        </Muted>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: space.sm },
  rowText: { fontSize: 16, color: colors.ink },
  chevron: { fontSize: 22, color: colors.muted },
  danger: { fontSize: 16, fontWeight: "700", color: colors.danger },
});
