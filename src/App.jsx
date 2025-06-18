import React, { useState } from "react";
import "./App.css";
import ChzzkChat from "./components/ChzzkChat";
import AIConfig from "./components/AIConfig";
import ChatAnalysis from "./components/ChatAnalysis";
import PlaylistTab from "./components/PlaylistTab";
import CommandConfig from "./components/CommandConfig";

// props가 변경되지 않으면 리렌더링하지 않음
const App = React.memo(() => {
    const [activeTab, setActiveTab] = useState("chat");

    return (
        <main className="container">
            <div className="app-header">
                <h1>치지직 스트리밍 어시스턴트</h1>

                <div className="tab-navigation">
                    <button
                        className={`tab-button ${activeTab === "chat" ? "active" : ""}`}
                        onClick={() => setActiveTab("chat")}
                    >
                        채팅
                    </button>
                    <button
                        className={`tab-button ${activeTab === "ai-config" ? "active" : ""}`}
                        onClick={() => setActiveTab("ai-config")}
                    >
                        AI 설정
                    </button>
                    <button
                        className={`tab-button ${activeTab === "analysis" ? "active" : ""}`}
                        onClick={() => setActiveTab("analysis")}
                    >
                        채팅 분석
                    </button>
                    <button
                        className={`tab-button ${activeTab === "playlist" ? "active" : ""}`}
                        onClick={() => setActiveTab("playlist")}
                    >
                        플레이리스트
                    </button>
                    <button
                        className={`tab-button ${activeTab === "command-config" ? "active" : ""}`}
                        onClick={() => setActiveTab("command-config")}
                    >
                        명령어 설정
                    </button>
                </div>
            </div>

            <div className="tab-content-wrapper">
                <div className="tab-content">
                    <div
                        style={{
                            display: activeTab === "chat" ? "block" : "none",
                        }}
                    >
                        <ChzzkChat />
                    </div>
                    <div
                        style={{
                            display:
                                activeTab === "ai-config" ? "block" : "none",
                        }}
                    >
                        <AIConfig />
                    </div>
                    <div
                        style={{
                            display:
                                activeTab === "analysis" ? "block" : "none",
                        }}
                    >
                        <ChatAnalysis />
                    </div>
                    <div
                        style={{
                            display:
                                activeTab === "playlist" ? "block" : "none",
                        }}
                    >
                        <PlaylistTab />
                    </div>
                    <div
                        style={{
                            display:
                                activeTab === "command-config"
                                    ? "block"
                                    : "none",
                        }}
                    >
                        <CommandConfig />
                    </div>
                </div>
            </div>
        </main>
    );
});

// 디스플레이 이름 설정
App.displayName = "App";

export default App;
