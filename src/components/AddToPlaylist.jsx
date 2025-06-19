import { memo, useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./AddToPlaylist.css";

const AddToPlaylist = memo(() => {
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState(""); // "success" or "error"

    const handleSubmit = useCallback(
        async (e) => {
            e.preventDefault();

            const trimmedInput = input.trim();
            if (!trimmedInput) {
                setMessage("YouTube URL 또는 검색어를 입력해주세요.");
                setMessageType("error");
                setTimeout(() => setMessage(""), 3000);
                return;
            }

            setLoading(true);
            setMessage("");

            try {
                await invoke("add_to_playlist_direct", { query: trimmedInput });
                setMessage("플레이리스트에 추가되었습니다!");
                setMessageType("success");
                setInput(""); // Clear input on success
                setTimeout(() => setMessage(""), 3000);
            } catch (error) {
                console.error("Failed to add to playlist:", error);
                setMessage(`추가 실패: ${error}`);
                setMessageType("error");
                setTimeout(() => setMessage(""), 5000);
            } finally {
                setLoading(false);
            }
        },
        [input],
    );

    const handleInputChange = useCallback(
        (e) => {
            setInput(e.target.value);
            // Clear message when user starts typing again
            if (message) {
                setMessage("");
            }
        },
        [message],
    );

    const handleKeyPress = useCallback(
        (e) => {
            if (e.key === "Enter" && !e.shiftKey) {
                handleSubmit(e);
            }
        },
        [handleSubmit],
    );

    return (
        <div className="add-to-playlist">
            <form onSubmit={handleSubmit} className="add-form">
                <div className="input-group">
                    <input
                        type="text"
                        value={input}
                        onChange={handleInputChange}
                        onKeyPress={handleKeyPress}
                        placeholder="YouTube URL 또는 검색어를 입력하세요..."
                        className="playlist-input"
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        className="add-button"
                        disabled={loading || !input.trim()}
                    >
                        {loading ? (
                            <span className="loading-spinner">⏳</span>
                        ) : (
                            <span>추가 ➕</span>
                        )}
                    </button>
                </div>

                {message && (
                    <div className={`message ${messageType}`}>{message}</div>
                )}
            </form>

            <div className="input-hints">
                <div className="hint-item">
                    <span className="hint-icon">🔗</span>
                    <span className="hint-text">
                        YouTube URL을 붙여넣으세요
                    </span>
                </div>
                <div className="hint-item">
                    <span className="hint-icon">🔍</span>
                    <span className="hint-text">또는 검색어를 입력하세요</span>
                </div>
            </div>
        </div>
    );
});

AddToPlaylist.displayName = "AddToPlaylist";

export default AddToPlaylist;
