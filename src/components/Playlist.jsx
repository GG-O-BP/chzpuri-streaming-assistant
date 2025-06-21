import { memo, useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./Playlist.css";

const Playlist = memo(() => {
    const [playlist, setPlaylist] = useState({
        items: [],
        current_index: null,
        is_playing: false,
        autoplay: true,
    });
    const [draggedIndex, setDraggedIndex] = useState(null);
    const [dragOverIndex, setDragOverIndex] = useState(null);
    const [errorMessage, setErrorMessage] = useState("");

    // Load initial playlist
    useEffect(() => {
        loadPlaylist();
    }, []);

    // Listen for playlist updates
    useEffect(() => {
        const unlisten = listen("playlist:updated", (event) => {
            setPlaylist(event.payload);
        });

        return async () => {
            (await unlisten)();
        };
    }, []);

    // Listen for playlist errors
    useEffect(() => {
        const unlisten = listen("playlist:error", (event) => {
            setErrorMessage(event.payload);
            // Clear error message after 5 seconds
            setTimeout(() => setErrorMessage(""), 5000);
        });

        return async () => {
            (await unlisten)();
        };
    }, []);

    const loadPlaylist = async () => {
        try {
            const playlistData = await invoke("get_playlist");
            setPlaylist(playlistData);
        } catch (error) {
            console.error("Failed to load playlist:", error);
        }
    };

    // Handle drag start
    const handleDragStart = useCallback((e, index) => {
        setDraggedIndex(index);
        e.dataTransfer.effectAllowed = "move";
        // Add drag class for visual feedback
        e.target.classList.add("dragging");
    }, []);

    // Handle drag end
    const handleDragEnd = useCallback((e) => {
        e.target.classList.remove("dragging");
        setDraggedIndex(null);
        setDragOverIndex(null);
    }, []);

    // Handle drag over
    const handleDragOver = useCallback((e, index) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        setDragOverIndex(index);
    }, []);

    // Handle drag leave
    const handleDragLeave = useCallback(() => {
        setDragOverIndex(null);
    }, []);

    // Handle drop
    const handleDrop = useCallback(
        async (e, dropIndex) => {
            e.preventDefault();
            setDragOverIndex(null);

            if (draggedIndex === null || draggedIndex === dropIndex) {
                return;
            }

            try {
                await invoke("move_playlist_item", {
                    from: draggedIndex,
                    to: dropIndex,
                });
            } catch (error) {
                console.error("Failed to move item:", error);
            }
        },
        [draggedIndex],
    );

    // Handle item click to play
    const handlePlayItem = useCallback(async (index) => {
        try {
            await invoke("play_at_index", { index });
        } catch (error) {
            console.error("Failed to play item:", error);
        }
    }, []);

    // Handle remove item
    const handleRemoveItem = useCallback(async (index, e) => {
        e.stopPropagation(); // Prevent triggering play when clicking remove

        try {
            await invoke("remove_playlist_item", { index });
        } catch (error) {
            console.error("Failed to remove item:", error);
        }
    }, []);

    // Format duration
    const formatDuration = (duration) => {
        if (!duration) return "";
        return duration;
    };

    // Format timestamp
    const formatTime = (timestamp) => {
        const date = new Date(timestamp * 1000);
        const now = new Date();
        const diff = now - date;

        if (diff < 60000) {
            return "방금 전";
        } else if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return `${minutes}분 전`;
        } else if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}시간 전`;
        } else {
            const days = Math.floor(diff / 86400000);
            return `${days}일 전`;
        }
    };

    return (
        <div className="playlist">
            <div className="playlist-header">
                <h3>플레이리스트</h3>
                <div className="playlist-info">
                    {playlist.items.length}개 항목
                </div>
            </div>

            {errorMessage && (
                <div className="playlist-error">{errorMessage}</div>
            )}

            <div className="playlist-items">
                {playlist.items.length === 0 ? (
                    <div className="playlist-empty">
                        <p>플레이리스트가 비어있습니다</p>
                        <p className="playlist-empty-hint">
                            채팅에서 !playlist 명령어를 사용하여 곡을 추가하세요
                        </p>
                    </div>
                ) : (
                    playlist.items.map((item, index) => (
                        <div
                            key={item.id}
                            className={`playlist-item ${
                                index === playlist.current_index ? "active" : ""
                            } ${dragOverIndex === index ? "drag-over" : ""}`}
                            draggable
                            onDragStart={(e) => handleDragStart(e, index)}
                            onDragEnd={handleDragEnd}
                            onDragOver={(e) => handleDragOver(e, index)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, index)}
                            onClick={() => handlePlayItem(index)}
                        >
                            <div className="item-index">
                                {index === playlist.current_index &&
                                playlist.is_playing ? (
                                    <span className="playing-icon">▶</span>
                                ) : (
                                    <span>{index + 1}</span>
                                )}
                            </div>

                            {item.thumbnail && (
                                <img
                                    src={item.thumbnail}
                                    alt={item.title}
                                    className="item-thumbnail"
                                />
                            )}

                            <div className="item-info">
                                <div className="item-title">{item.title}</div>
                                <div className="item-meta">
                                    <span className="item-channel">
                                        {item.channel}
                                    </span>
                                    {item.duration && (
                                        <>
                                            <span className="meta-separator">
                                                •
                                            </span>
                                            <span className="item-duration">
                                                {formatDuration(item.duration)}
                                            </span>
                                        </>
                                    )}
                                    <span className="meta-separator">•</span>
                                    <span
                                        className={`item-added-by ${item.added_by === "App User" ? "app-user" : "chat-user"}`}
                                    >
                                        {item.added_by === "App User"
                                            ? "👤 직접 추가"
                                            : `💬 ${item.added_by}`}
                                    </span>
                                    <span className="meta-separator">•</span>
                                    <span className="item-added-at">
                                        {formatTime(item.added_at)}
                                    </span>
                                </div>
                            </div>

                            <button
                                className="item-remove"
                                onClick={(e) => handleRemoveItem(index, e)}
                                title="제거"
                            >
                                ✕
                            </button>
                        </div>
                    ))
                )}
            </div>

            {playlist.items.length > 0 && (
                <div className="playlist-controls">
                    <button
                        className="playlist-control-button"
                        onClick={async () => {
                            try {
                                await invoke("skip_to_next_command");
                            } catch (error) {
                                console.error("Failed to skip:", error);
                            }
                        }}
                    >
                        다음 곡 ⏭️
                    </button>

                    <button
                        className="playlist-control-button danger"
                        onClick={async () => {
                            if (
                                window.confirm(
                                    "플레이리스트를 모두 지우시겠습니까?",
                                )
                            ) {
                                try {
                                    await invoke("clear_playlist");
                                } catch (error) {
                                    console.error(
                                        "Failed to clear playlist:",
                                        error,
                                    );
                                }
                            }
                        }}
                    >
                        전체 삭제 🗑️
                    </button>
                </div>
            )}
        </div>
    );
});

Playlist.displayName = "Playlist";

export default Playlist;
