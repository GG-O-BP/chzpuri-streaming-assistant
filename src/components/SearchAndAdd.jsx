import React, { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./SearchAndAdd.css";

const SearchAndAdd = React.memo(() => {
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searching, setSearching] = useState(false);
    const [message, setMessage] = useState("");
    const [messageType, setMessageType] = useState("");
    const [selectedIndex, setSelectedIndex] = useState(0);
    const searchTimeoutRef = useRef(null);
    const resultsRef = useRef(null);

    // Auto-search with debounce
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        if (searchQuery.trim().length > 2) {
            searchTimeoutRef.current = setTimeout(() => {
                performSearch(searchQuery);
            }, 500); // 500ms debounce
        } else {
            setSearchResults([]);
        }

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery]);

    const performSearch = useCallback(async (query) => {
        if (!query.trim()) return;

        setSearching(true);
        setMessage("");

        try {
            const results = await invoke("search_youtube", {
                query: query.trim(),
                limit: 5,
            });
            setSearchResults(results);
            setSelectedIndex(0);
        } catch (error) {
            console.error("Search failed:", error);
            setMessage(`검색 실패: ${error}`);
            setMessageType("error");
            setSearchResults([]);
        } finally {
            setSearching(false);
        }
    }, []);

    const handleAddToPlaylist = useCallback(async (video) => {
        setLoading(true);
        setMessage("");

        try {
            await invoke("add_to_playlist_direct", {
                query: video.url,
            });
            setMessage(`"${video.title}" 플레이리스트에 추가됨`);
            setMessageType("success");

            // Clear search after successful add
            setTimeout(() => {
                setSearchQuery("");
                setSearchResults([]);
                setMessage("");
            }, 2000);
        } catch (error) {
            console.error("Failed to add to playlist:", error);
            setMessage(`추가 실패: ${error}`);
            setMessageType("error");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleKeyDown = useCallback((e) => {
        if (searchResults.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex((prev) =>
                    prev < searchResults.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                break;
            case "Enter":
                e.preventDefault();
                if (searchResults[selectedIndex]) {
                    handleAddToPlaylist(searchResults[selectedIndex]);
                }
                break;
            case "Escape":
                e.preventDefault();
                setSearchQuery("");
                setSearchResults([]);
                break;
        }
    }, [searchResults, selectedIndex, handleAddToPlaylist]);

    // Scroll selected item into view
    useEffect(() => {
        if (resultsRef.current && searchResults.length > 0) {
            const selectedElement = resultsRef.current.children[selectedIndex];
            if (selectedElement) {
                selectedElement.scrollIntoView({
                    behavior: "smooth",
                    block: "nearest",
                });
            }
        }
    }, [selectedIndex, searchResults.length]);

    const formatDuration = (duration) => {
        if (!duration) return "";
        return duration;
    };

    return (
        <div className="search-and-add">
            <div className="search-container">
                <div className="search-input-wrapper">
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="YouTube 검색..."
                        className="search-input"
                        disabled={loading}
                    />
                    {searching && (
                        <div className="search-indicator">
                            <span className="search-spinner">🔍</span>
                        </div>
                    )}
                </div>

                {message && (
                    <div className={`search-message ${messageType}`}>
                        {message}
                    </div>
                )}

                {searchResults.length > 0 && (
                    <div className="search-results" ref={resultsRef}>
                        {searchResults.map((video, index) => (
                            <div
                                key={video.video_id}
                                className={`search-result-item ${
                                    index === selectedIndex ? "selected" : ""
                                } ${loading ? "disabled" : ""}`}
                                onClick={() => handleAddToPlaylist(video)}
                                onMouseEnter={() => setSelectedIndex(index)}
                            >
                                {video.thumbnail && (
                                    <img
                                        src={video.thumbnail}
                                        alt={video.title}
                                        className="result-thumbnail"
                                    />
                                )}
                                <div className="result-info">
                                    <div className="result-title">
                                        {video.title}
                                    </div>
                                    <div className="result-meta">
                                        <span className="result-channel">
                                            {video.channel}
                                        </span>
                                        {video.duration && (
                                            <>
                                                <span className="meta-dot">•</span>
                                                <span className="result-duration">
                                                    {formatDuration(video.duration)}
                                                </span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <button
                                    className="add-result-button"
                                    disabled={loading}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAddToPlaylist(video);
                                    }}
                                >
                                    {loading ? "..." : "+"}
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {searchQuery.trim() && !searching && searchResults.length === 0 && (
                    <div className="no-results">
                        검색 결과가 없습니다
                    </div>
                )}
            </div>

            <div className="search-tips">
                <p className="tip-title">검색 팁:</p>
                <ul className="tip-list">
                    <li>↑↓ 화살표 키로 결과 탐색</li>
                    <li>Enter 키로 선택한 항목 추가</li>
                    <li>Esc 키로 검색 취소</li>
                </ul>
            </div>
        </div>
    );
});

SearchAndAdd.displayName = "SearchAndAdd";

export default SearchAndAdd;
