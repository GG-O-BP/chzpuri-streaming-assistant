import React, { useState } from "react";
import AddToPlaylist from "./AddToPlaylist";
import SearchAndAdd from "./SearchAndAdd";
import "./PlaylistInput.css";

const PlaylistInput = React.memo(() => {
    const [activeTab, setActiveTab] = useState("simple");

    return (
        <div className="playlist-input">
            <div className="playlist-input-header">
                <h3>플레이리스트에 추가</h3>
                <div className="input-tabs">
                    <button
                        className={`input-tab ${activeTab === "simple" ? "active" : ""}`}
                        onClick={() => setActiveTab("simple")}
                    >
                        <span className="tab-icon">🎵</span>
                        <span className="tab-label">빠른 추가</span>
                    </button>
                    <button
                        className={`input-tab ${activeTab === "search" ? "active" : ""}`}
                        onClick={() => setActiveTab("search")}
                    >
                        <span className="tab-icon">🔍</span>
                        <span className="tab-label">검색하여 추가</span>
                    </button>
                </div>
            </div>

            <div className="playlist-input-content">
                {activeTab === "simple" ? (
                    <div className="tab-content-wrapper">
                        <AddToPlaylist />
                        <div className="input-help">
                            <h4>사용 방법:</h4>
                            <ul>
                                <li>
                                    <strong>YouTube URL 직접 입력:</strong>
                                    <br />
                                    <code>https://youtube.com/watch?v=...</code>
                                </li>
                                <li>
                                    <strong>검색어로 찾기:</strong>
                                    <br />
                                    <span>아티스트명, 곡 제목 등을 입력하면 첫 번째 검색 결과가 추가됩니다</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                ) : (
                    <div className="tab-content-wrapper">
                        <SearchAndAdd />
                        <div className="input-help">
                            <h4>고급 검색 기능:</h4>
                            <ul>
                                <li>검색어를 입력하면 실시간으로 결과를 표시합니다</li>
                                <li>원하는 영상을 미리보고 선택할 수 있습니다</li>
                                <li>키보드 단축키로 빠르게 탐색 가능합니다</li>
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

PlaylistInput.displayName = "PlaylistInput";

export default PlaylistInput;
