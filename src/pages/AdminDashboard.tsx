import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare, Bot, BarChart3, FileText, Download, X, Upload, Trash2, Edit3, Plus } from "lucide-react";

import mammoth from "mammoth";

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
  const [fileType, setFileType] = useState<"image" | "pdf" | "doc" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const isEdit = useMemo(() => editingId !== null, [editingId]);
  const navigate = useNavigate();

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

  const handleResultViewClick = () => {
    navigate("/app/polling");
  };

  const handleChatBotClick = () => {
    navigate("/app/chat-bot");
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
      setError(err?.message || "Failed to read PDF content. You can still upload the file.");
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
      setError(err?.message || "Failed to read document content. You can still upload the file.");
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
      setSelectedFile(file);
      setForm((prev) => ({ ...prev, image_url: "" }));
      await readPDFContent(file);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      setFileType("doc");
      setSelectedFile(file);
      setForm((prev) => ({ ...prev, image_url: "" }));
      await readDocxContent(file);
    } else {
      alert("Unsupported file type.");
      setFileType(null);
      setFilePreview(null);
      setSelectedFile(null);
    }
  };

  const clearFile = () => {
    setFilePreview(null);
    setFileType(null);
    setSelectedFile(null);
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
      let fileUrl = form.file_url;

      if (fileType === "image" && filePreview) {
        const response = await fetch(filePreview);
        const blob = await response.blob();
        const fileName = `images/${Date.now()}-${blob.size}.jpg`;
        const { data, error: uploadError } = await supabase.storage
          .from("poll-images")
          .upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from("poll-images").getPublicUrl(fileName);
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

        const { data: publicData } = supabase.storage.from("poll-files").getPublicUrl(path);
        fileUrl = publicData.publicUrl;
      }

      const insertData = {
        ...form,
        ...(imageUrl ? { image_url: imageUrl } : {}),
        ...(fileUrl ? { file_url: fileUrl } : {}),
        file_type: fileType,
        created_by: userData.user.id,
      };

      if (isEdit) {
        const { error } = await supabase.from("polls").update(insertData).eq("id", editingId!);
        if (error) throw error;
        setPolls((prev) =>
          prev.map((p) => (p.id === editingId ? ({ ...p, ...insertData } as Poll) : p))
        );
      } else {
        const { data, error } = await supabase.from("polls").insert(insertData).select("*").single();
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

  const handleDownload = async (url: string, filename?: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
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
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      <div className="container max-w-7xl mx-auto px-4 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary shadow-lg">
              <BarChart3 className="h-8 w-8 text-primary-foreground" strokeWidth={2.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Vote Assistant</h1>
            <CardDescription className="text-lg max-w-2xl mx-auto">
              Create, manage, and monitor polls for your organization with powerful analytics and AI assistance
            </CardDescription>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-muted">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{polls.length}</p>
                <p className="text-sm text-muted-foreground">Active Polls</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted cursor-pointer hover:shadow-lg transition-shadow" onClick={handleChatBotClick}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/20">
                <Bot className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">AI Assistant</p>
                <p className="text-sm text-muted-foreground">Get help with polls</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-muted cursor-pointer hover:shadow-lg transition-shadow" onClick={handleResultViewClick}>
            <CardContent className="flex items-center gap-4 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-green-100 dark:bg-green-900/20">
                <MessageSquare className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-semibold">View Results</p>
                <p className="text-sm text-muted-foreground">Analyze poll data</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Create/Edit Poll Card */}
        <Card className="border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                {isEdit ? <Edit3 className="h-5 w-5 text-primary" /> : <Plus className="h-5 w-5 text-primary" />}
              </div>
              {isEdit ? "Edit Poll" : "Create New Poll"}
            </CardTitle>
            <CardDescription>
              {isEdit ? "Update your poll details" : "Fill in the form below to create a new poll"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form className="space-y-6" onSubmit={savePoll}>
              {/* Question */}
              <div className="space-y-2">
                <Label htmlFor="question">Poll Question *</Label>
                <Input
                  id="question"
                  name="question"
                  value={form.question || ""}
                  onChange={handleChange}
                  required
                  className="h-12 text-base"
                  placeholder="What would you like to ask your audience?"
                />
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="option1">Option 1 *</Label>
                  <Input
                    id="option1"
                    name="option1"
                    value={form.option1 || ""}
                    onChange={handleChange}
                    required
                    placeholder="First choice"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="option2">Option 2 *</Label>
                  <Input
                    id="option2"
                    name="option2"
                    value={form.option2 || ""}
                    onChange={handleChange}
                    required
                    placeholder="Second choice"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="option3">Option 3 (Optional)</Label>
                  <Input
                    id="option3"
                    name="option3"
                    value={form.option3 || ""}
                    onChange={handleChange}
                    placeholder="Third choice"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="option4">Option 4 (Optional)</Label>
                  <Input
                    id="option4"
                    name="option4"
                    value={form.option4 || ""}
                    onChange={handleChange}
                    placeholder="Fourth choice"
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Input
                  id="description"
                  name="description"
                  value={form.description || ""}
                  onChange={handleChange}
                  placeholder="Add context or additional information"
                />
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="fileUpload">Attach File (Optional)</Label>
                <div className="flex items-center gap-2">
                  <label
                    htmlFor="fileUpload"
                    className="flex flex-1 items-center justify-center h-32 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-semibold">Click to upload</span> or drag and drop
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">PDF, DOCX, or images</p>
                    </div>
                    <Input
                      id="fileUpload"
                      type="file"
                      accept=".pdf,.doc,.docx,image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* File Preview */}
                {filePreview && (
                  <div className="relative p-4 bg-muted/30 rounded-lg border">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-8 w-8 p-0"
                      onClick={clearFile}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <img
                      src={filePreview}
                      alt="Preview"
                      className="max-w-md max-h-48 rounded-lg object-contain mx-auto"
                    />
                  </div>
                )}

                {selectedFile && (
                  <Badge variant="secondary" className="gap-2">
                    <FileText className="h-3 w-3" />
                    {selectedFile.name}
                  </Badge>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4">
                <Button type="submit" disabled={saving} className="flex-1 gap-2">
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      {isEdit ? "Updating..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {isEdit ? <Edit3 className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                      {isEdit ? "Update Poll" : "Create Poll"}
                    </>
                  )}
                </Button>
                {isEdit && (
                  <Button type="button" variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        {/* All Polls List */}
        <Card className="border-muted shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              All Polls
              <Badge variant="secondary" className="ml-auto">{polls.length}</Badge>
            </CardTitle>
            <CardDescription>Manage and view all your created polls</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted-foreground">Loading polls...</p>
              </div>
            ) : polls.length === 0 ? (
              <div className="text-center py-12">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted mx-auto mb-4">
                  <BarChart3 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No polls created yet</h3>
                <p className="text-sm text-muted-foreground">Create your first poll to get started!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {polls.map((p) => (
                  <Card key={p.id} className="border-muted">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between gap-6">
                        <div className="flex-1 space-y-4">
                          <div>
                            <h3 className="font-semibold text-lg mb-2">{p.question}</h3>
                            <div className="flex flex-wrap gap-2">
                              {[p.option1, p.option2, p.option3, p.option4]
                                .filter(Boolean)
                                .map((opt, idx) => (
                                  <Badge key={idx} variant="secondary">
                                    {opt}
                                  </Badge>
                                ))}
                            </div>
                          </div>

                          {p.description && (
                            <p className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
                              {p.description}
                            </p>
                          )}

                          {p.image_url && (
                            <img
                              src={p.image_url}
                              alt="Poll Visual"
                              className="max-w-sm max-h-40 object-contain rounded-lg border"
                            />
                          )}

                          {(p.file_url || p.image_url) && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDownload(p.file_url! || p.image_url!)}
                              className="gap-2"
                            >
                              <Download className="h-3 w-3" />
                              Download File
                            </Button>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <Button size="sm" variant="outline" onClick={() => startEdit(p)} className="gap-2">
                            <Edit3 className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deletePoll(p.id)}
                            className="gap-2 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Floating AI Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button size="lg" className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-transform" onClick={handleChatBotClick}>
            <Bot className="h-6 w-6" strokeWidth={2.5} />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
