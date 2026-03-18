"use client";

/**
 * NotesPanel — Feature C: Ghi chú từ chat
 * Shows saved notes. Click "💬 Xem trong chat" to navigate to originating conversation.
 */

import { useState, useEffect } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://ai-mentor-iwkf.onrender.com";

interface Note {
    note_id?: string;
    content: string;
    source: string;
    tags: string[];
    created_at: string;
    session_id?: string;
}

interface Props {
    userId?: string;
    onClose: () => void;
    onGoToChat?: (sessionId: string) => void;
}

export default function NotesPanel({ userId = "default", onClose, onGoToChat }: Props) {
    const [notes, setNotes] = useState<Note[]>([]);
    const [loading, setLoading] = useState(true);

    const loadNotes = () => {
        fetch(`${API_URL}/api/notes?user_id=${userId}`)
            .then(r => r.json())
            .then(d => setNotes(d.notes || []))
            .catch(() => {})
            .finally(() => setLoading(false));
    };

    useEffect(() => { loadNotes(); }, [userId]);

    const deleteNote = async (idx: number, noteId?: string) => {
        if (noteId) {
            await fetch(`${API_URL}/api/notes/${noteId}?user_id=${userId}`, { method: "DELETE" });
        }
        setNotes(prev => prev.filter((_, i) => i !== idx));
    };

    return (
        <div className="notes-panel">
            <div className="notes-panel__header">
                <span>📌 Ghi chú của tôi</span>
                <button className="notes-panel__close" onClick={onClose}>✕</button>
            </div>
            <div className="notes-panel__body">
                {loading && <div className="notes-panel__empty">Đang tải...</div>}
                {!loading && notes.length === 0 && (
                    <div className="notes-panel__empty">
                        <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
                        <div>Chưa có ghi chú nào</div>
                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Hover vào tin nhắn AI → bấm 📌 để lưu</div>
                    </div>
                )}
                {notes.map((note, i) => (
                    <div key={i} className="note-card">
                        <div className="note-card__content">{note.content}</div>
                        <div className="note-card__footer">
                            <span className="note-card__date">
                                {note.created_at ? new Date(note.created_at).toLocaleDateString("vi-VN") : ""}
                            </span>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                {note.session_id && onGoToChat && (
                                    <button
                                        className="note-card__goto"
                                        onClick={() => onGoToChat(note.session_id!)}
                                        title="Xem đoạn chat gốc"
                                    >
                                        💬 Xem chat
                                    </button>
                                )}
                                <button
                                    className="note-card__delete"
                                    onClick={() => deleteNote(i, note.note_id)}
                                    title="Xóa ghi chú"
                                >
                                    🗑️
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
