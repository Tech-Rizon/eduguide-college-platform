"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useBackofficeRealtime } from "@/hooks/useBackofficeRealtime";

type ThreadAttachment = {
  id: string;
  file_name: string;
  content_type: string;
  file_size: number;
};

type ThreadMessage = {
  id: string;
  author_user_id: string | null;
  visibility: "public" | "internal";
  body: string;
  created_at: string;
  attachments: ThreadAttachment[];
};

type InternalNote = {
  id: string;
  staff_user_id: string | null;
  note: string;
  created_at: string;
};

export function TicketThreadPanel({
  ticketId,
  accessToken,
  canAddInternalNotes,
}: {
  ticketId: string;
  accessToken?: string;
  canAddInternalNotes: boolean;
}) {
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [notes, setNotes] = useState<InternalNote[]>([]);
  const [publicMessage, setPublicMessage] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [visibility, setVisibility] = useState<"public" | "internal">("public");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const authHeaders = useMemo(
    () => ({
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    }),
    [accessToken]
  );

  const loadThread = useCallback(async () => {
    if (!accessToken || !ticketId) return;

    setLoading(true);
    try {
      const [messagesRes, notesRes] = await Promise.all([
        fetch(`/api/backoffice/tickets/messages?ticketId=${encodeURIComponent(ticketId)}`, {
          headers: authHeaders,
        }),
        canAddInternalNotes
          ? fetch(`/api/backoffice/tickets/notes?ticketId=${encodeURIComponent(ticketId)}`, {
              headers: authHeaders,
            })
          : Promise.resolve(null),
      ]);

      if (!messagesRes.ok) {
        const payload = await messagesRes.json().catch(() => null);
        throw new Error(payload?.error ?? "Failed to load ticket thread.");
      }

      const messagePayload = await messagesRes.json();
      setMessages(messagePayload?.messages ?? []);

      if (notesRes) {
        if (!notesRes.ok) {
          const payload = await notesRes.json().catch(() => null);
          throw new Error(payload?.error ?? "Failed to load internal notes.");
        }
        const notePayload = await notesRes.json();
        setNotes(notePayload?.notes ?? []);
      } else {
        setNotes([]);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to load thread.";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, [accessToken, authHeaders, canAddInternalNotes, ticketId]);

  useEffect(() => {
    loadThread();
  }, [loadThread]);

  useBackofficeRealtime({
    enabled: Boolean(accessToken && ticketId),
    channelKey: `thread-${ticketId}`,
    onChange: loadThread,
  });

  const uploadAttachmentIfAny = async (): Promise<string[]> => {
    if (!pendingFile) return [];

    const uploadUrlRes = await fetch("/api/backoffice/tickets/attachments/upload-url", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({
        ticketId,
        fileName: pendingFile.name,
        contentType: pendingFile.type,
        fileSize: pendingFile.size,
      }),
    });

    const uploadUrlPayload = await uploadUrlRes.json().catch(() => null);
    if (!uploadUrlRes.ok) {
      throw new Error(uploadUrlPayload?.error ?? "Failed to prepare attachment upload.");
    }

    const putRes = await fetch(uploadUrlPayload.signedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": pendingFile.type || "application/octet-stream",
      },
      body: pendingFile,
    });

    if (!putRes.ok) {
      throw new Error("Attachment upload failed.");
    }

    return [uploadUrlPayload.attachmentId];
  };

  const sendMessage = async () => {
    if (!publicMessage.trim()) return;
    if (!accessToken) return;

    setSending(true);
    try {
      const attachmentIds = await uploadAttachmentIfAny();

      const res = await fetch("/api/backoffice/tickets/messages", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ticketId,
          body: publicMessage.trim(),
          visibility,
          attachmentIds,
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to send message.");
      }

      setPublicMessage("");
      setPendingFile(null);
      setVisibility("public");
      await loadThread();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send message.";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const addInternalNote = async () => {
    if (!internalNote.trim() || !canAddInternalNotes) return;
    if (!accessToken) return;

    setSending(true);
    try {
      const res = await fetch("/api/backoffice/tickets/notes", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ticketId,
          note: internalNote.trim(),
        }),
      });

      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to add note.");
      }

      setInternalNote("");
      await loadThread();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to add note.";
      toast.error(message);
    } finally {
      setSending(false);
    }
  };

  const openAttachment = async (attachmentId: string) => {
    try {
      const res = await fetch("/api/backoffice/tickets/attachments/download-url", {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ attachmentId }),
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(payload?.error ?? "Failed to open attachment.");
      }
      window.open(payload.signedUrl, "_blank", "noopener,noreferrer");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to open attachment.";
      toast.error(message);
    }
  };

  return (
    <Card className="bg-slate-900 border-slate-800">
      <CardHeader>
        <CardTitle>Ticket Thread</CardTitle>
        <CardDescription className="text-slate-400">
          Conversation and operational notes for ticket {ticketId}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-slate-400">Loading thread...</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {messages.map((message) => (
              <div key={message.id} className="rounded-md border border-slate-700 bg-slate-800 p-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    {message.author_user_id ?? "System"} | {new Date(message.created_at).toLocaleString()}
                  </p>
                  <Badge className={message.visibility === "internal" ? "bg-amber-500/20 text-amber-300" : "bg-blue-500/20 text-blue-300"}>
                    {message.visibility}
                  </Badge>
                </div>
                <p className="text-sm text-slate-100 mt-2 whitespace-pre-wrap">{message.body}</p>
                {message.attachments?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {message.attachments.map((attachment) => (
                      <Button
                        key={attachment.id}
                        type="button"
                        variant="outline"
                        className="border-slate-700 bg-transparent hover:bg-slate-700 text-xs"
                        onClick={() => openAttachment(attachment.id)}
                      >
                        {attachment.file_name}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {messages.length === 0 && (
              <p className="text-sm text-slate-400">No messages yet.</p>
            )}
          </div>
        )}

        <div className="rounded-md border border-slate-700 bg-slate-800 p-3 space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant={visibility === "public" ? "default" : "outline"}
              className={visibility === "public" ? "bg-emerald-600 hover:bg-emerald-500" : "border-slate-700 bg-transparent hover:bg-slate-700"}
              onClick={() => setVisibility("public")}
            >
              Public Reply
            </Button>
            {canAddInternalNotes && (
              <Button
                type="button"
                variant={visibility === "internal" ? "default" : "outline"}
                className={visibility === "internal" ? "bg-amber-600 hover:bg-amber-500" : "border-slate-700 bg-transparent hover:bg-slate-700"}
                onClick={() => setVisibility("internal")}
              >
                Internal Message
              </Button>
            )}
          </div>

          <Textarea
            placeholder={visibility === "internal" ? "Add internal staff message..." : "Reply to student..."}
            value={publicMessage}
            onChange={(event) => setPublicMessage(event.target.value)}
            className="bg-slate-900 border-slate-700"
          />
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              type="file"
              onChange={(event) => setPendingFile(event.target.files?.[0] ?? null)}
              className="bg-slate-900 border-slate-700"
            />
            <Button onClick={sendMessage} disabled={sending || !publicMessage.trim()} className="bg-emerald-600 hover:bg-emerald-500">
              Send
            </Button>
          </div>
        </div>

        {canAddInternalNotes && (
          <div className="rounded-md border border-slate-700 bg-slate-800 p-3 space-y-3">
            <p className="text-sm font-semibold">Internal Notes</p>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {notes.map((note) => (
                <div key={note.id} className="rounded-md border border-slate-700 bg-slate-900 p-3">
                  <p className="text-xs text-slate-400">
                    {note.staff_user_id ?? "Staff"} | {new Date(note.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-slate-100 mt-2 whitespace-pre-wrap">{note.note}</p>
                </div>
              ))}
              {notes.length === 0 && <p className="text-sm text-slate-400">No internal notes yet.</p>}
            </div>

            <Textarea
              placeholder="Add manager/staff note..."
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
              className="bg-slate-900 border-slate-700"
            />
            <Button onClick={addInternalNote} disabled={sending || !internalNote.trim()} className="bg-amber-600 hover:bg-amber-500">
              Add Note
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
