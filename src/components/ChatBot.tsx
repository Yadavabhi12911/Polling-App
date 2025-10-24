import { useEffect, useState } from "react";
import { chatWithPollBot, resetChat } from "@/utils/geminiModel";
import { useUserRole } from "./useUserRole";

import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "../../supabaseClient";

type Role = "user" | "model";

interface Message {
  role: Role;
  text: string;
  fileInfo?: {
    file_url?: string;
    file_type?: string;
    description?: string;
  };
  pollResults?: any[];
}

export default function ChatBot() {
  const userRole = useUserRole();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text:
        userRole !== "admin"
          ? "Let's see which polls are open for voting!"
          : "What poll tasks are on your agenda today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // File handling state
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | "doc" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");

  // Set initial message based on user role
  useEffect(() => {
    if (userRole) {
      const initialMessage =
        userRole === "admin"
          ? "What poll tasks are on your agenda today?"
          : "Let's see which polls are open for voting!";

      setMessages([{ role: "model", text: initialMessage }]);
    }
  }, [userRole]);

  // Extract date from text function
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
      setFileDescription(extracted || fullText);
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
      setFileDescription(extracted || result.value);
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
      setFileDescription("");
      setSelectedFile(null);
    } else if (mimeType === "application/pdf") {
      setFileType("pdf");
      setSelectedFile(file);
      setFileDescription("");
      await readPDFContent(file);
    } else if (
      mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
      mimeType === "application/msword"
    ) {
      setFileType("doc");
      setSelectedFile(file);
      setFileDescription("");
      await readDocxContent(file);
    } else {
      alert("Unsupported file type.");
      setFileType(null);
      setFilePreview(null);
      setSelectedFile(null);
    }
  };

  const handleSend = async () => {
    const userText = input.trim();
    if (!userText) return;

    const adminOnlyActions = ["create", "delete", "update"];
    const lowerText = userText.toLowerCase();

    if (
      userRole !== "admin" &&
      adminOnlyActions.some((action) => lowerText.includes(action))
    ) {
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "❌ Unauthorized access. Only admins can perform this action." },
      ]);
      setInput("");
      return;
    }

    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      let fileInfo = undefined;

      // Handle file upload if file is selected
      if (fileType === "image" && filePreview) {
        const response = await fetch(filePreview);
        const blob = await response.blob();
        const fileName = `images/${Date.now()}-${blob.size}.jpg`;
        const { data, error: uploadError } = await supabase.storage.from("poll-images").upload(fileName, blob);

        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage.from("poll-images").getPublicUrl(fileName);

        fileInfo = {
          file_url: publicData.publicUrl,
          file_type: "image",
          description: fileDescription,
        };
      }

      if ((fileType === "pdf" || fileType === "doc") && selectedFile) {
        const safeName = selectedFile.name.replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `files/${Date.now()}-${safeName}`;
        const { error: uploadDocErr } = await supabase.storage.from("poll-files").upload(path, selectedFile, {
          contentType: selectedFile.type,
          upsert: false,
        });
        if (uploadDocErr) throw uploadDocErr;

        const { data: publicData } = supabase.storage.from("poll-files").getPublicUrl(path);

        fileInfo = {
          file_url: publicData.publicUrl,
          file_type: fileType,
          description: fileDescription,
        };
      }

      const res = await chatWithPollBot(userText, userRole, fileInfo);

      if (res.type === "text") {
        setMessages((prev) => [...prev, { role: "model", text: res.message }]);
      } else if (res.type === "poll") {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: `✅ Poll Created Successfully!\n\nQuestion: ${res.data.question}\n\nOptions:\n• ${res.data.option1}\n• ${res.data.option2}\n• ${res.data.option3}\n• ${res.data.option4}\n\nYour poll is now live and ready for voting!`,
            fileInfo: fileInfo,
          },
        ]);
      } else if (res.type === "pollResults") {
        const resultsText =
          res.data.length === 0
            ? "No active polls found at the moment."
            : res.data.length > 5
            ? `📊 **${res.data.length} Active Polls Available**\n\n` +
              `**Quick Summary:**\n` +
              res.data.slice(0, 3).map((poll: any, index: number) => {
                const topOption = poll.options.reduce((max: any, opt: any) => 
                  opt.votes > max.votes ? opt : max, poll.options[0]);
                const winnerText = poll.total_votes > 0 
                  ? `🏆 ${topOption.text} (${topOption.votes} votes)`
                  : "No votes yet";
                return `• **${poll.question}** - ${winnerText}`;
              }).join("\n") +
              `\n\n💡 **View all polls:** Ask "show all polls" for complete results\n` +
              `💡 **View specific poll:** Ask "show results for [poll question]" or "show poll [ID]"`
            : `📊 **${res.data.length} Active Poll${res.data.length === 1 ? '' : 's'} Available**\n\n${res.data
                .map(
                  (poll: any, index: number) => {
                    const topOption = poll.options.reduce((max: any, opt: any) => 
                      opt.votes > max.votes ? opt : max, poll.options[0]);
                    const winnerText = poll.total_votes > 0 
                      ? `🏆 **Leading:** ${topOption.text} (${topOption.votes} votes, ${((topOption.votes / poll.total_votes) * 100).toFixed(1)}%)`
                      : "No votes yet";
                    
                    return `**${index + 1}. ${poll.question}**\n` +
                      `📅 ${new Date(poll.created_at).toLocaleDateString()} • 🗳️ ${poll.total_votes} votes\n` +
                      `${winnerText}\n` +
                      `💡 **Vote:** "vote on poll ${poll.id} for option [1-4]" or "vote on \"${poll.question}\" for option [1-4]"\n`;
                  }
                )
                .join("\n")}`;

        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: resultsText,
            pollResults: res.data,
          },
        ]);
      }

      // Clear file state after successful poll creation
      if (res.type === "poll") {
        setFilePreview(null);
        setFileType(null);
        setSelectedFile(null);
        setFileDescription("");
      }
    } catch (err: any) {
      console.error("Error chatting with AI:", err);
      setError(err.message || "Something went wrong. Please try again.");
      setMessages((prev) => [...prev, { role: "model", text: "Something went wrong. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    resetChat();
    setMessages([
      {
        role: "model",
        text:
          userRole === "admin"
            ? "What poll tasks are on your agenda today?"
            : "Let's see which polls are open for voting!",
      },
    ]);
    setFilePreview(null);
    setFileType(null);
    setSelectedFile(null);
    setFileDescription("");
    setError("");
  };

  return (
    <div className="max-w-5xl mx-auto mt-10 shadow-lg">
      <Card>
        <CardHeader>
          <CardTitle>Poll Assistant</CardTitle>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          {/* Error display */}
          {error && (
            <div className="text-red-500 text-sm mb-2 p-2 bg-red-50 rounded">{error}</div>
          )}

          {/* Chat messages */}
          <div className="flex flex-col gap-2 h-110 overflow-y-auto p-2 bg-gray-50 rounded-lg">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`px-3 py-2 rounded-lg max-w-[70%] ${
                    m.role === "user" ? "bg-gray-200 text-gray-900" : "bg-gray-200 text-gray-900"
                  }`}
                >
                  <b>{m.role === "user" ? "You" : "AI"}:</b> {m.text}

                  {/* Display file info if available */}
                  {m.fileInfo && (
                    <div className="mt-2 p-2 bg-blue-50 rounded border">
                      <p className="text-sm font-medium">Attached File:</p>
                      {m.fileInfo.file_type === "image" && m.fileInfo.file_url && (
                        <img
                          src={m.fileInfo.file_url}
                          alt="Attached"
                          className="mt-1 max-w-xs max-h-32 object-contain rounded"
                        />
                      )}
                      {(m.fileInfo.file_type === "pdf" || m.fileInfo.file_type === "doc") && (
                        <div className="mt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const a = document.createElement("a");
                              a.href = m.fileInfo!.file_url!;
                              a.download = "attached-file";
                              a.click();
                            }}
                          >
                            Download File
                          </Button>
                        </div>
                      )}
                      {m.fileInfo.description && (
                        <p className="text-xs mt-1 text-gray-600">{m.fileInfo.description}</p>
                      )}
                    </div>
                  )}

                  {/* Display poll results if available */}
                  {m.pollResults && m.pollResults.length > 0 && (
                    <div className="mt-2 p-3 bg-green-50 rounded border">
                      <p className="text-sm font-medium mb-2">📊 Detailed Poll Results:</p>
                      <div className="space-y-3">
                        {m.pollResults.map((poll: any, index: number) => (
                          <div key={poll.id} className="p-2 bg-white rounded border">
                            <h4 className="font-medium text-sm">{poll.question}</h4>
                            <p className="text-xs text-gray-600 mb-2">
                              Total Votes: {poll.total_votes} • Created:{" "}
                              {new Date(poll.created_at).toLocaleDateString()}
                            </p>
                            <div className="space-y-1">
                              {poll.options.map((option: any, optIndex: number) => {
                                const percentage =
                                  poll.total_votes > 0
                                    ? (option.votes / poll.total_votes) * 100
                                    : 0;
                                return (
                                  <div
                                    key={option.id}
                                    className="flex items-center justify-between text-xs"
                                  >
                                    <span className="flex-1">{option.text}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 bg-gray-200 rounded-full h-2">
                                        <div
                                          className="bg-blue-500 h-2 rounded-full"
                                          style={{ width: `${percentage}%` }}
                                        ></div>
                                      </div>
                                      <span className="w-12 text-right">
                                        {option.votes} ({percentage.toFixed(1)}%)
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && <p className="text-sm italic text-gray-500">AI is thinking...</p>}
          </div>

          {/* File upload section */}
          <div className="space-y-2">
            <Label htmlFor="fileUpload">Upload PDF, DOCX or Image file (optional)</Label>
            <Input
              type="file"
              id="fileUpload"
              accept=".pdf,.doc,.docx,image/*"
              onChange={handleFileChange}
            />

            {/* File preview */}
            {fileType === "image" && filePreview && (
              <div className="flex justify-center">
                <img
                  src={filePreview}
                  alt="Preview"
                  style={{ maxWidth: "300px", maxHeight: "200px" }}
                  className="rounded border"
                />
              </div>
            )}

            {/* File description for PDF/DOC */}
            {fileDescription && (
              <div className="p-2 bg-gray-100 rounded text-sm">
                <p className="font-medium">Extracted content:</p>
                <p className="text-gray-600">{fileDescription}</p>
              </div>
            )}
          </div>

          {/* Input + Send */}
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Type your message..."
            />
            <Button onClick={handleSend} disabled={loading}>
              Send
            </Button>
          </div>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button onClick={handleReset} variant="outline">
            Reset Chat
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
