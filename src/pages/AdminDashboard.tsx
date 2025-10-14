import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "../../supabaseClient";

type Poll = {
  id: number;
  question: string | null;
  option1: string | null;
  option2: string | null;
  option3: string | null;
  option4: string | null;
  description: string | null;
  file_url: string | null;
  image_url: string | null;
  file_type: string | null;
  created_by: string | null;
  created_at: string | null;
};

const emptyForm: Omit<Poll, "id" | "created_by" | "created_at"> = {
  question: "",
  option1: "",
  option2: "",
  option3: "",
  option4: "",
  description: "",
  file_url: "",
  image_url: "",
  file_type: "",
};

const AdminDashboard: React.FC = () => {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [error, setError] = useState("");

  const isEdit = useMemo(() => editingId !== null, [editingId]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("polls")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) {
        setError(error.message);
      } else {
        setPolls((data as Poll[]) || []);
      }
      setLoading(false);
    };
    load();
  }, []);

  const resetForm = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const savePoll = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      setError("Not authenticated");
      setSaving(false);
      return;
    }

    try {
      if (isEdit) {
        const { error } = await supabase
          .from("polls")
          .update({ ...form })
          .eq("id", editingId!);
        if (error) throw error;
        setPolls((prev) => prev.map((p) => (p.id === editingId ? { ...p, ...form } as Poll : p)));
      } else {
        const insertPayload = { ...form, created_by: userData.user.id } as any;
        const { data, error } = await supabase
          .from("polls")
          .insert(insertPayload)
          .select("*")
          .single();
        if (error) throw error;
        setPolls((prev) => [data as Poll, ...prev]);
      }
      resetForm();
    } catch (e: any) {
      setError(e.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (poll: Poll) => {
    setEditingId(poll.id);
    setForm({
      question: poll.question || "",
      option1: poll.option1 || "",
      option2: poll.option2 || "",
      option3: poll.option3 || "",
      option4: poll.option4 || "",
      description: poll.description || "",
      file_url: poll.file_url || "",
      image_url: poll.image_url || "",
      file_type: poll.file_type || "",
    });
  };

  const deletePoll = async (pollId: number) => {
    if (!confirm("Delete this poll?")) return;
    const { error } = await supabase.from("polls").delete().eq("id", pollId);
    if (error) {
      setError(error.message);
      return;
    }
    setPolls((prev) => prev.filter((p) => p.id !== pollId));
    if (editingId === pollId) resetForm();
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{isEdit ? "Edit Poll" : "Create Poll"}</CardTitle>
        </CardHeader>
        <CardContent>
          {error && <p className="text-red-500 mb-2">{error}</p>}
          <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={savePoll}>
            <div className="md:col-span-2 flex flex-col gap-3">
              <Label htmlFor="question">Question</Label>
              <Input id="question" name="question" value={form.question || ""} onChange={handleChange} required />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="option1">Option 1</Label>
              <Input id="option1" name="option1" value={form.option1 || ""} onChange={handleChange} required />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="option2">Option 2</Label>
              <Input id="option2" name="option2" value={form.option2 || ""} onChange={handleChange} required />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="option3">Option 3</Label>
              <Input id="option3" name="option3" value={form.option3 || ""} onChange={handleChange} />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="option4">Option 4</Label>
              <Input id="option4" name="option4" value={form.option4 || ""} onChange={handleChange} />
            </div>
            <div className="md:col-span-2 flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={form.description || ""} onChange={handleChange} />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="image_url">Image URL</Label>
              <Input id="image_url" name="image_url" value={form.image_url || ""} onChange={handleChange} />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="file_url">File URL</Label>
              <Input id="file_url" name="file_url" value={form.file_url || ""} onChange={handleChange} />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="file_type">File Type</Label>
              <Input id="file_type" name="file_type" value={form.file_type || ""} onChange={handleChange} />
            </div>
            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>{isEdit ? "Update" : "Create"}</Button>
              {isEdit && (
                <Button type="button" variant="secondary" onClick={resetForm}>Cancel</Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>All Polls</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Loading...</p>
          ) : polls.length === 0 ? (
            <p>No polls found</p>
          ) : (
            <div className="space-y-3">
              {polls.map((p) => (
                <div key={p.id} className="border rounded p-3 flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{p.question}</p>
                    <p className="text-sm text-muted-foreground">Options: {[p.option1, p.option2, p.option3, p.option4].filter(Boolean).join(", ")}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>Edit</Button>
                    <Button size="sm" variant="destructive" onClick={() => deletePoll(p.id)}>Delete</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;


