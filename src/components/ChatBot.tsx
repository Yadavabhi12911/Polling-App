import { useEffect, useState, useRef } from "react";
import { chatWithPollBot, resetChat } from "@/utils/geminiModel";
import { useUserRole } from "./useUserRole";
import { Bot, Send, RotateCcw, FileText, Image as ImageIcon, Download, User as UserIcon, X, Paperclip } from "lucide-react";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker;

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text:
        userRole.role === "admin"
          ? `Hi ${userRole.name || "there"} 👋\n\nI can help you create, update, or close polls — or show results. What would you like to do?`
          : `Hi ${userRole.name || "there"} 👋\n\nI can show polls, share results, and help you vote. Want to check current polls?`,
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [loadingSteps, setLoadingSteps] = useState<string[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  // File handling state
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [fileType, setFileType] = useState<"image" | "pdf" | "doc" | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileDescription, setFileDescription] = useState("");

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  // Keep input focused
  useEffect(() => {
    if (!loading) {
      textareaRef.current?.focus();
    }
  }, [loading]);
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
   console.log("usr --> ", userRole.role);
   
  }, [messages]);

  // Set initial message based on user role
  useEffect(() => {
    if (userRole.role) {
      const initialMessage =
        userRole.role === "admin"
          ? `Hi ${userRole.name || "there"} 👋\n\nReady to manage polls? I can create, update, close, or show results.`
          : `Hi ${userRole.name || "there"} 👋\n\nWant to view polls, see results, or cast a vote?`;
      setMessages([{ role: "model", text: initialMessage }]);
    }
  }, [userRole.role]);

  // Progress step cycler while loading
  useEffect(() => {
    if (!loading || loadingSteps.length === 0) return;
    setCurrentStepIndex(0);
    const interval = setInterval(() => {
      setCurrentStepIndex((idx) => {
        const next = idx + 1;
        return next < loadingSteps.length ? next : idx;
      });
    }, 1200);
    return () => clearInterval(interval);
  }, [loading, loadingSteps]);

  // Date extraction function
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

  // PDF content extract
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
      setError(err?.message || "Failed to read PDF content. You can still upload the file.");
    } finally {
      setFilePreview(null);
    }
  };

  // DOCX content extract function
  const readDocxContent = async (file: File) => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.extractRawText({ arrayBuffer });
      const extracted = extractDateFromText(result.value || "");
      setFileDescription(extracted || result.value);
    } catch (err: any) {
      setError(err?.message || "Failed to read document content. You can still upload the file.");
    } finally {
      setFilePreview(null);
    }
  };

  // File input handler
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
      alert("That file type isn’t supported yet.");
      setFileType(null);
      setFilePreview(null);
      setSelectedFile(null);
    }
  };

  const clearFile = () => {
    setFilePreview(null);
    setFileType(null);
    setSelectedFile(null);
    setFileDescription("");
  };

  const handleSend = async () => {
    const userText = input.trim();
    if (!userText) return;

    setMessages((prev) => [...prev, { role: "user", text: userText }]);
    setInput("");
    setLoading(true);
    setError("");

    // Determine lightweight intent to show contextual progress text
    const textLower = userText.toLowerCase();
    const isDeleteAll = /delete\s+all/.test(textLower) || (/delete/.test(textLower) && /poll/.test(textLower) && /all|every|everything/.test(textLower));
    const isGetAll = (/get\s+all/.test(textLower) || /show\s+all/.test(textLower)) && /poll/.test(textLower);
    const isDeleteSpecific = /delete/.test(textLower) && /poll/.test(textLower) && !isDeleteAll;
    const isResults = (/get|show/.test(textLower)) && (/result|results|polls/.test(textLower));

    if (isDeleteAll) {
      setLoadingSteps(["Analyzing request…", "Fetching poll IDs…", "Deleting active polls…"]);
    } else if (isDeleteSpecific) {
      setLoadingSteps(["Finding the target poll…", "Closing the poll…"]);
    } else if (isGetAll || isResults) {
      setLoadingSteps(["Fetching active polls…"]);
    } else {
      setLoadingSteps(["Thinking…"]);
    }

    try {
      let fileInfo = undefined;

      // Handle file upload
      if (fileType === "image" && filePreview) {
        const response = await fetch(filePreview);
        const blob = await response.blob();
        const fileName = `images/${Date.now()}-${blob.size}.jpg`;
        const { error: uploadError } = await supabase.storage.from("poll-images").upload(fileName, blob);

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

      const res = await chatWithPollBot(userText, userRole.role, userRole.name, fileInfo);
    
      

      if (res.type === "text") {
        // ensure text is always a string to satisfy Message type
        setMessages((prev) => [...prev, { role: "model", text: res.message ?? "" }]);
      } else if (res.type === "poll") {
        setMessages((prev) => [
          ...prev,
          {
            role: "model",
            text: `✅ Poll created!\n\nQuestion: ${res.data.question}\n\nOptions:\n• ${res.data.option1}\n• ${res.data.option2}\n• ${res.data.option3}\n• ${res.data.option4}\n\nIt’s live now. Want me to share the link or view results?`,
            fileInfo: fileInfo,
          },
        ]);
      } else if (res.type === "pollResults") {
        const resultsText =
          res.data.length === 0
            ? "I’m not seeing any active polls right now. Want to create one?"
            : res.data.length > 5
            ? `📊 **${res.data.length} active polls**\n\n` +
              `**Quick summary:**\n` +
              res.data.slice(0, 3).map((poll: any) => {
                 const topOption = poll.options.reduce((max: any, opt: any) => 
                   opt.votes > max.votes ? opt : max, poll.options[0]);
                 const winnerText = poll.total_votes > 0 
                   ? `🏆 ${topOption.text} (${topOption.votes} votes)`
                   : "No votes yet";
                 return `• **${poll.question}** - ${winnerText}`;
               }).join("\n") +
               `\n\n💡 Want the full list or a specific poll? Try: "show all polls" or "show poll [ID]"`
             : `📊 **${res.data.length} active poll${res.data.length === 1 ? '' : 's'}**\n\n${res.data
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
                      `💡 **Try:** "vote on poll ${poll.id} for option [1-4]" or "show poll ${poll.id}"\n`;
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
      // Clear file state
      if (res.type === "poll") {
        clearFile();
      }
    } catch (err: any) {
      setError(err.message || "Something didn’t go through. Want to try again?");
      setMessages((prev) => [...prev, { role: "model", text: "Something didn’t go through. Want to try again?" }]);
    } finally {
      setLoading(false);
      setLoadingSteps([]);
      setCurrentStepIndex(0);
      // refocus input after response
      setTimeout(() => textareaRef.current?.focus(), 0);
    }
  };

  const handleReset = () => {
    resetChat(userRole.role ?? "user", userRole.name ?? "User");
    setMessages([
      {
        role: "model",
        text:
          userRole.role === "admin"
            ? `Hi ${userRole.name || "there"} 👋\n\nNew chat started. Want to create a poll or review results?`
            : `Hi ${userRole.name || "there"} 👋\n\nNew chat started. Want to view polls or vote?`,
      },
    ]);
    clearFile();
    setError("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-background via-muted/20 to-background">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary shadow-sm">
                <Bot className="h-5 w-5 text-primary-foreground" strokeWidth={2.5} />
              </div>
              <div>
                <h1 className="text-xl font-semibold tracking-tight">AI Poll Assistant</h1>
              </div>
            </div>
            <Button onClick={handleReset} variant="ghost" size="sm" className="gap-2">
              <RotateCcw className="h-4 w-4" />
              <span className="hidden sm:inline">New chat</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Chat Messages Area - Scrollable */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="container max-w-5xl mx-auto px-4 py-6">
            {/* Error display */}
            {error && (
              <Alert variant="destructive" className="mb-4 animate-in slide-in-from-top-2">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Messages */}
            <div className="space-y-6 pb-32">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`flex gap-4 ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {m.role === "model" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                  )}

                  <div className={`flex flex-col gap-2 ${m.role === "user" ? "max-w-[85%] items-end" : "max-w-[90%] items-start"}`}>
                    <div className={`rounded-2xl px-5 py-3.5 ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                      <div className="text-[15px] leading-7 whitespace-pre-wrap">{m.text}</div>

                      {/* File info display */}
                      {m.fileInfo && (
                        <div className="mt-4 rounded-xl border bg-background/50 p-4">
                          <div className="flex items-center gap-2 text-sm font-medium mb-3">
                            {m.fileInfo.file_type === "image" ? (
                              <ImageIcon className="h-4 w-4" />
                            ) : (
                              <FileText className="h-4 w-4" />
                            )}
                            Attached File
                          </div>
                          {m.fileInfo.file_type === "image" && m.fileInfo.file_url && (
                            <img
                              src={m.fileInfo.file_url}
                              alt="Attached"
                              className="mt-2 max-w-md max-h-48 object-contain rounded-lg border"
                            />
                          )}
                          {(m.fileInfo.file_type === "pdf" || m.fileInfo.file_type === "doc") && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const a = document.createElement("a");
                                a.href = m.fileInfo!.file_url!;
                                a.download = "attached-file";
                                a.click();
                              }}
                              className="mt-2 gap-2"
                            >
                              <Download className="h-3 w-3" />
                              Download File
                            </Button>
                          )}
                          {m.fileInfo.description && (
                            <p className="text-sm mt-3 text-muted-foreground leading-relaxed">
                              {m.fileInfo.description}
                            </p>
                          )}
                        </div>
                      )}

                      {/* Poll results display */}
                      {m.pollResults && m.pollResults.length > 0 && (
                        <div className="mt-4 space-y-4">
                          {m.pollResults.map((poll: any) => (
                            <div key={poll.id} className="rounded-xl border bg-background p-4">
                              <h4 className="font-semibold text-base mb-3">{poll.question}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                                <Badge variant="secondary" className="text-xs">{poll.total_votes} votes</Badge>
                                <span>•</span>
                                <span>{new Date(poll.created_at).toLocaleDateString()}</span>
                              </div>
                              <div className="space-y-3">
                                {poll.options.map((option: any) => {
                                  const percentage =
                                    poll.total_votes > 0
                                      ? (option.votes / poll.total_votes) * 100
                                      : 0;
                                  return (
                                    <div key={option.id} className="space-y-2">
                                      <div className="flex items-center justify-between text-sm">
                                        <span className="font-medium">{option.text}</span>
                                        <span className="text-muted-foreground">
                                          {option.votes} ({percentage.toFixed(1)}%)
                                        </span>
                                      </div>
                                      <Progress value={percentage} className="h-2.5" />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  {m.role === "user" && (
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary mt-1">
                      <UserIcon className="h-5 w-5 text-primary-foreground" />
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="flex gap-4 justify-start">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="rounded-2xl bg-muted px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" />
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.1s" }} />
                        <div className="w-2 h-2 bg-muted-foreground/60 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                      </div>
                    </div>
                    {loadingSteps.length > 0 && (
                      <div className="mt-2 text-[13px] text-muted-foreground">
                        {loadingSteps[currentStepIndex]}
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>
        </ScrollArea>
      </div>

      {/* Fixed Input Area */}
      <div className="flex-shrink-0 border-t bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container max-w-5xl mx-auto px-4 py-4">
          {(filePreview || selectedFile) && (
            <div className="mb-3 p-3 bg-muted/50 rounded-xl border flex items-start gap-3">
              {fileType === "image" && filePreview && (
                <img
                  src={filePreview}
                  alt="Preview"
                  className="w-20 h-20 rounded-lg object-cover border"
                />
              )}
              {(fileType === "pdf" || fileType === "doc") && (
                <div className="flex items-center justify-center w-20 h-20 bg-background rounded-lg border">
                  <FileText className="h-10 w-10 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fileType === "image" ? "Image attached" : selectedFile?.name}</p>
                {fileDescription && (
                  <p className="text-xs text-muted-foreground truncate mt-1">{fileDescription.slice(0, 80)}...</p>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0" onClick={clearFile}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <div className="relative flex items-end gap-2 rounded-3xl border bg-background shadow-sm px-4 py-2.5 focus-within:shadow-md transition-shadow">
            <label htmlFor="fileUpload" className="cursor-pointer shrink-0">
              <Button type="button" variant="ghost" size="icon" className="h-10 w-10 rounded-full hover:bg-muted" asChild onMouseDown={(e) => e.preventDefault()}>
                <div>
                  <Paperclip className="h-5 w-5 text-muted-foreground" />
                </div>
              </Button>
              <Input
                id="fileUpload"
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,image/*"
                onChange={handleFileChange}
              />
            </label>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask me to show polls, create one, or help you vote..."
              disabled={loading}
              className="min-h-[44px] max-h-[200px] resize-none border-0 bg-transparent p-2.5 text-[15px] leading-6 focus-visible:ring-0 focus-visible:ring-offset-0 scrollbar-thin"
              rows={1}
            />
            <Button onClick={handleSend} onMouseDown={(e) => e.preventDefault()} disabled={loading || !input.trim()} size="icon" className="h-10 w-10 rounded-full shrink-0 disabled:opacity-50">
              {loading ? (
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        
        </div>
      </div>
    </div>
  );
}
