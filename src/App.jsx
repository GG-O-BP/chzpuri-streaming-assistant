import React, { useState } from "react";
import "./App.css";
import ChzzkChat from "./components/ChzzkChat";
import AIConfig from "./components/AIConfig";
import ChatAnalysis from "./components/ChatAnalysis";

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
                </div>
            </div>

            <div className="tab-content-wrapper">
                <div className="tab-content">
                    {activeTab === "chat" && <ChzzkChat />}
                    {activeTab === "ai-config" && <AIConfig />}
                    {activeTab === "analysis" && <ChatAnalysis />}
                </div>
            </div>
        </main>
    );
});

// 디스플레이 이름 설정
App.displayName = "App";

export default App;
