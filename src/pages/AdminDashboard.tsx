import React, { useEffect, useMemo, useState } from "react";

import mammoth from "mammoth";

import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf";
import pdfjsWorkerUrl from "pdfjs-dist/legacy/build/pdf.worker.min?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

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

  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | "doc" | null>(
    null
  );
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

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
    setFilePreview(null);
    setFileType(null);
    setSelectedFile(null);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  // Try to extract a date-like string from text to use as description
  const extractDateFromText = (text: string): string => {
    const patterns: RegExp[] = [
      /\b\d{4}-\d{2}-\d{2}\b/,
      /\b\d{2}\/\d{2}\/\d{4}\b/,
      /\b\d{2}-\d{2}-\d{4}\b/,
      /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/i,
      /\b\d{1,2}\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\s+\d{4}\b/i,
    ];
    for (const re of patterns) {
      const m = text.match(re);
      if (m) return m[0];
    }
    return "";
  };

  // PDF content extract function
  const readPDFContent = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((item: any) => item.str);
        fullText += strings.join(" ") + "\n\n";
      }
      const extracted = extractDateFromText(fullText);
      setForm((prev) => ({ ...prev, description: extracted || fullText }));
    } catch (err: any) {
      console.error("Failed to parse PDF:", err);
      setError(
        err?.message ||
          "Failed to read PDF content. You can still upload the file."
      );
    } finally {
      setFilePreview(null);
    }
  };

  // DOCX content extract function using mammoth
  const readDocxContent = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extracted = extractDateFromText(result.value || "");
      setForm((prev) => ({ ...prev, description: extracted || result.value }));
    } catch (err: any) {
      console.error("Failed to parse DOC/DOCX:", err);
      setError(
        err?.message ||
          "Failed to read document content. You can still upload the file."
      );
    } finally {
      setFilePreview(null);
    }
  };

  // Handle file input changes
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    const file = e.target.files[0];
    const mimeType = file.type;

    if (mimeType.startsWith("image/")) {
      setFileType("image");
      setFilePreview(URL.createObjectURL(file));
      setForm((prev) => ({ ...prev, image_url: "" }));
      setForm((prev) => ({ ...prev, description: "" }));
      setSelectedFile(null);
    } else if (mimeType === "application/pdf") {
      setFileType("pdf");
      setSelectedFile(file); // ensure file is preserved even if parsing fails
      setForm((prev) => ({ ...prev, image_url: "" }));
      await readPDFContent(file);
    } else if (
      mimeType ===
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      setFileType("doc");
      setSelectedFile(file); // ensure file is preserved even if parsing fails
      setForm((prev) => ({ ...prev, image_url: "" }));
      await readDocxContent(file);
    } else {
      alert("Unsupported file type.");
      setFileType(null);
      setFilePreview(null);
      setSelectedFile(null);
    }
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
      let imageUrl = form.image_url;
      console.log("imge  url --> ", imageUrl);

      let fileUrl = form.file_url;
      console.log("file  url --> ", fileUrl);

      if (fileType === "image" && filePreview) {
        const response = await fetch(filePreview);
        const blob = await response.blob();
        const fileName = `images/${Date.now()}-${blob.size}.jpg`;
        const { data, error: uploadError } = await supabase.storage
          .from("poll-images")
          .upload(fileName, blob);

        console.log("filename --> ", fileName);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from("poll-images")
          .getPublicUrl(fileName);

        imageUrl = publicData.publicUrl;
      }

      if ((fileType === "pdf" || fileType === "doc") && selectedFile) {
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `files/${Date.now()}-${safeName}`;
        const { error: uploadDocErr } = await supabase.storage
          .from("poll-files")
          .upload(path, selectedFile, {
            contentType: selectedFile.type,
            upsert: false,
          });
        if (uploadDocErr) throw uploadDocErr;
        fileUrl = supabase.storage
          .from("poll-files")
          .getPublicUrl(path).publicUrl;
      }

      const insertData = {
        ...form,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        ...(fileUrl ? { file_url: fileUrl } : {}),
        file_type: fileType,
        created_by: userData.user.id,
      };

      if (isEdit) {
        const { error } = await supabase
          .from("polls")
          .update(insertData)
          .eq("id", editingId!);

        if (error) throw error;

        setPolls((prev) =>
          prev.map((p) =>
            p.id === editingId ? ({ ...p, ...insertData } as Poll) : p
          )
        );
      } else {
        const { data, error } = await supabase
          .from("polls")
          .insert(insertData)
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
    setFilePreview(poll.image_url || null);
    setFileType(poll.image_url ? "image" : null);
    setSelectedFile(null);
  };

  const handleDownload = async (url: string) => {
    try {
      const a = document.createElement("a");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      a.download = "";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (err) {
      console.error(err);
      alert("Failed to start download");
    }
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
          <form
            className="grid grid-cols-1 md:grid-cols-2 gap-4"
            onSubmit={savePoll}
          >
            <div className="md:col-span-2 flex flex-col gap-3">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                name="question"
                value={form.question || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="option1">Option 1</Label>
              <Input
                id="option1"
                name="option1"
                value={form.option1 || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="option2">Option 2</Label>
              <Input
                id="option2"
                name="option2"
                value={form.option2 || ""}
                onChange={handleChange}
                required
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="option3">Option 3</Label>
              <Input
                id="option3"
                name="option3"
                value={form.option3 || ""}
                onChange={handleChange}
              />
            </div>
            <div className="flex flex-col gap-3">
              <Label htmlFor="option4">Option 4</Label>
              <Input
                id="option4"
                name="option4"
                value={form.option4 || ""}
                onChange={handleChange}
              />
            </div>
            <div className="md:col-span-2 flex flex-col gap-3">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={form.description || ""}
                onChange={handleChange}
              />
            </div>

            {/* File upload input */}
            <div className="md:col-span-2 flex flex-col gap-3">
              <Label htmlFor="fileUpload">Upload PDF, DOCX or Image file</Label>
              <Input
                type="file"
                id="fileUpload"
                accept=".pdf,.doc,.docx,image/*"
                onChange={handleFileChange}
              />
            </div>

            {/* Display image preview if available */}
            {fileType === "image" && filePreview && (
              <div className="md:col-span-2 flex justify-center">
                <img
                  src={filePreview}
                  alt="Preview"
                  style={{ maxWidth: "400px", maxHeight: "300px" }}
                />
              </div>
            )}

            <div className="md:col-span-2 flex gap-2">
              <Button type="submit" disabled={saving}>
                {isEdit ? "Update" : "Create"}
              </Button>
              {isEdit && (
                <Button type="button" variant="secondary" onClick={resetForm}>
                  Cancel
                </Button>
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
                <div
                  key={p.id}
                  className="border rounded p-3 flex items-start justify-between gap-4"
                >
                  <div>
                    <p className="font-medium">{p.question}</p>
                    <p className="text-sm text-muted-foreground">
                      Options:{" "}
                      {[p.option1, p.option2, p.option3, p.option4]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                    {p.description && (
                      <p className="mt-1 text-sm">{p.description}</p>
                    )}
                    {p.image_url && (
                      <img
                        src={p.image_url}
                        alt="Poll Visual"
                        className="mt-2 max-w-xs max-h-48 object-contain rounded"
                      />
                    )}
                    {p.file_url && (
                      <p className="mt-2 text-sm">
                        Attached file:{" "}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDownload(p.file_url!)}
                        >
                          Download
                        </Button>
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => startEdit(p)}
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deletePoll(p.id)}
                    >
                      Delete
                    </Button>
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
