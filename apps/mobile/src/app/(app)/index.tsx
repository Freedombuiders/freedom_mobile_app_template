// Example signed-in screen: list / add / toggle / delete notes through /api/notes.
// Copy this pattern for your own resources (see docs/02-bat-dau-du-an-moi.md), then delete it.
import type { Note } from "@app/shared/api";
import { firstError, noteInputSchema } from "@app/shared/schemas";
import { useCallback, useEffect, useState } from "react";
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button, Card, ErrorText, Field, Muted, Title } from "@/components/ui";
import { api } from "@/lib/api";
import { useUser } from "@/lib/session";
import { colors, radius, space } from "@/lib/theme";

export default function NotesScreen() {
  const user = useUser();
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setNotes(await api.get<Note[]>("/api/notes"));
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api.get<Note[]>("/api/notes").then(
      (list) => alive && setNotes(list),
      (e: Error) => alive && setError(e.message),
    );
    return () => {
      alive = false;
    };
  }, []);

  async function add() {
    const parsed = noteInputSchema.safeParse({ title, body });
    if (!parsed.success) return setError(firstError(parsed.error));
    setBusy(true);
    setError("");
    try {
      const note = await api.post<Note>("/api/notes", parsed.data);
      setNotes((list) => [note, ...(list ?? [])]);
      setTitle("");
      setBody("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(note: Note) {
    try {
      const updated = await api.patch<Note>(`/api/notes/${note.id}`, { done: !note.done });
      setNotes((list) => list?.map((n) => (n.id === note.id ? updated : n)) ?? null);
    } catch (e) {
      Alert.alert("Không lưu được", (e as Error).message);
    }
  }

  function remove(note: Note) {
    Alert.alert("Xoá ghi chú?", note.title, [
      { text: "Huỷ", style: "cancel" },
      {
        text: "Xoá",
        style: "destructive",
        onPress: async () => {
          try {
            await api.del(`/api/notes/${note.id}`);
            setNotes((list) => list?.filter((n) => n.id !== note.id) ?? null);
          } catch (e) {
            Alert.alert("Không xoá được", (e as Error).message);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={styles.content}>
          <Title>Chào {user.name} 👋</Title>
          <Card>
            <Field label="Tiêu đề" value={title} onChangeText={setTitle} placeholder="Việc cần nhớ" />
            <Field label="Nội dung" value={body} onChangeText={setBody} placeholder="Không bắt buộc" multiline />
            <ErrorText>{error}</ErrorText>
            <Button title="Thêm ghi chú" onPress={add} busy={busy} />
          </Card>
          {notes === null ? (
            <Muted>Đang tải…</Muted>
          ) : notes.length === 0 ? (
            <Muted>Chưa có ghi chú nào.</Muted>
          ) : (
            notes.map((n) => (
              <Pressable key={n.id} onPress={() => toggle(n)} onLongPress={() => remove(n)} style={styles.note}>
                <View style={[styles.check, n.done && styles.checkDone]}>{n.done && <Text style={styles.tick}>✓</Text>}</View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.noteTitle, n.done && styles.done]}>{n.title}</Text>
                  {!!n.body && <Muted>{n.body}</Muted>}
                </View>
              </Pressable>
            ))
          )}
          {!!notes?.length && <Muted style={{ textAlign: "center" }}>Chạm để đánh dấu xong · giữ lâu để xoá</Muted>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: space.lg },
  content: { width: "100%", maxWidth: 640, alignSelf: "center", gap: space.lg },
  note: {
    flexDirection: "row",
    gap: space.md,
    alignItems: "flex-start",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.line, alignItems: "center", justifyContent: "center", marginTop: 1 },
  checkDone: { backgroundColor: colors.brand, borderColor: colors.brand },
  tick: { color: "#fff", fontSize: 14, fontWeight: "800" },
  noteTitle: { fontSize: 16, fontWeight: "600", color: colors.ink },
  done: { color: colors.muted, textDecorationLine: "line-through" },
});
