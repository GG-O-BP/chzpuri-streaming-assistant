import { memo, useState, useCallback, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

const ChatAnalysis = React.memo(() => {
    const [contextAnalysis, setContextAnalysis] = useState(null);
    const [scriptRecommendations, setScriptRecommendations] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isGeneratingScripts, setIsGeneratingScripts] = useState(false);
    const [error, setError] = useState("");
    const [aiStatus, setAiStatus] = useState(null);
    const [autoAnalyze, setAutoAnalyze] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState("");

    // AI 상태 확인
    const checkAIStatus = useCallback(async () => {
        try {
            const status = await invoke("get_ai_status");
            setAiStatus(status);
        } catch (err) {
            console.error("Failed to get AI status:", err);
        }
    }, []);

    // 초기 로드 시 AI 상태 확인
    useEffect(() => {
        checkAIStatus();
        const interval = setInterval(checkAIStatus, 5000); // 5초마다 상태 확인
        return () => clearInterval(interval);
    }, [checkAIStatus]);

    // 채팅 맥락 분석
    const analyzeContext = useCallback(async () => {
        setIsAnalyzing(true);
        setError("");
        setLoadingMessage("채팅 메시지를 분석하고 있습니다...");

        try {
            const analysis = await invoke("analyze_chat_context");
            setContextAnalysis(analysis);
            setLoadingMessage("");

            // 분석 후 자동으로 스크립트 추천 받기 (옵션)
            if (autoAnalyze) {
                generateScripts();
            }
        } catch (err) {
            const errorMessage = err.toString();
            if (errorMessage.includes("No chat messages")) {
                setError(
                    "분석할 채팅 메시지가 없습니다. 채팅이 활성화되어 있는지 확인해주세요.",
                );
            } else if (errorMessage.includes("API key")) {
                setError(
                    "API 키가 유효하지 않습니다. AI 설정을 다시 확인해주세요.",
                );
            } else if (errorMessage.includes("rate limit")) {
                setError(
                    "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
                );
            } else if (errorMessage.includes("timeout")) {
                setError(
                    "요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.",
                );
            } else {
                setError(`분석 실패: ${errorMessage}`);
            }
            setContextAnalysis(null);
        } finally {
            setIsAnalyzing(false);
            setLoadingMessage("");
        }
    }, [autoAnalyze]);

    // 스크립트 추천 받기
    const generateScripts = useCallback(async () => {
        if (!contextAnalysis) {
            setError("먼저 채팅 맥락을 분석해주세요.");
            return;
        }

        setIsGeneratingScripts(true);
        setError("");
        setLoadingMessage("타겟 시청자에 맞는 스크립트를 생성하고 있습니다...");

        try {
            const recommendations = await invoke("get_script_recommendations");
            setScriptRecommendations(recommendations);
            setLoadingMessage("");
        } catch (err) {
            const errorMessage = err.toString();
            if (errorMessage.includes("Target audience not configured")) {
                setError(
                    "타겟 시청자가 설정되지 않았습니다. AI 설정에서 타겟 정보를 입력해주세요.",
                );
            } else if (errorMessage.includes("rate limit")) {
                setError(
                    "API 요청 한도를 초과했습니다. 잠시 후 다시 시도해주세요.",
                );
            } else if (errorMessage.includes("timeout")) {
                setError(
                    "요청 시간이 초과되었습니다. 네트워크 연결을 확인해주세요.",
                );
            } else {
                setError(`스크립트 생성 실패: ${errorMessage}`);
            }
            setScriptRecommendations(null);
        } finally {
            setIsGeneratingScripts(false);
            setLoadingMessage("");
        }
    }, [contextAnalysis]);

    // 스크립트 복사
    const copyScript = useCallback(async (script) => {
        try {
            await navigator.clipboard.writeText(script);
            // 복사 성공 피드백 (실제로는 토스트 메시지 등을 사용하면 좋음)
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = "복사됨!";
            setTimeout(() => {
                button.textContent = originalText;
            }, 1500);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    }, []);

    // 자동 분석 토글
    const toggleAutoAnalyze = useCallback(() => {
        setAutoAnalyze((prev) => !prev);
    }, []);

    // 자동 분석 타이머
    useEffect(() => {
        if (!autoAnalyze || !aiStatus?.configured) return;

        const interval = setInterval(() => {
            if (aiStatus.chat_buffer_size > 5) {
                // 최소 5개 이상의 메시지가 있을 때만
                analyzeContext();
            }
        }, 30000); // 30초마다 자동 분석

        return () => clearInterval(interval);
    }, [autoAnalyze, aiStatus, analyzeContext]);

    if (!aiStatus?.configured) {
        return (
            <div className="chat-analysis">
                <div className="warning-message">
                    <p>⚠️ AI 서비스가 설정되지 않았습니다.</p>
                    <p>먼저 AI 설정을 완료해주세요.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="chat-analysis">
            <div className="analysis-header">
                <h2>채팅 분석 & 스크립트 추천</h2>
                <div className="header-controls">
                    <label className="auto-analyze-toggle">
                        <input
                            type="checkbox"
                            checked={autoAnalyze}
                            onChange={toggleAutoAnalyze}
                        />
                        자동 분석
                    </label>
                    <span className="buffer-status">
                        버퍼: {aiStatus?.chat_buffer_size || 0}개 메시지
                    </span>
                </div>
            </div>

            <div className="analysis-controls">
                <button
                    onClick={analyzeContext}
                    disabled={
                        isAnalyzing ||
                        isGeneratingScripts ||
                        aiStatus?.chat_buffer_size === 0
                    }
                    className="analyze-btn"
                    title={
                        aiStatus?.chat_buffer_size === 0
                            ? "분석할 채팅 메시지가 없습니다"
                            : ""
                    }
                >
                    {isAnalyzing ? (
                        <>
                            <span className="btn-spinner"></span>
                            분석 중...
                        </>
                    ) : (
                        "채팅 맥락 분석"
                    )}
                </button>
                <button
                    onClick={generateScripts}
                    disabled={
                        isGeneratingScripts || isAnalyzing || !contextAnalysis
                    }
                    className="generate-btn"
                    title={
                        !contextAnalysis ? "먼저 채팅 맥락을 분석해주세요" : ""
                    }
                >
                    {isGeneratingScripts ? (
                        <>
                            <span className="btn-spinner"></span>
                            생성 중...
                        </>
                    ) : (
                        "스크립트 추천 받기"
                    )}
                </button>
            </div>

            {error && (
                <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                </div>
            )}

            {(isAnalyzing || isGeneratingScripts) && loadingMessage && (
                <div className="loading-overlay">
                    <div className="loading-content">
                        <div className="loading-spinner"></div>
                        <p>{loadingMessage}</p>
                    </div>
                </div>
            )}

            {contextAnalysis && (
                <div className="context-analysis-section">
                    <h3>현재 채팅 맥락</h3>
                    <div className="analysis-content">
                        <div className="analysis-item">
                            <strong>요약:</strong>
                            <p>{contextAnalysis.summary}</p>
                        </div>
                        <div className="analysis-item">
                            <strong>주요 주제:</strong>
                            <div className="topic-tags">
                                {contextAnalysis.main_topics.map(
                                    (topic, index) => (
                                        <span key={index} className="topic-tag">
                                            {topic}
                                        </span>
                                    ),
                                )}
                            </div>
                        </div>
                        <div className="analysis-item">
                            <strong>분위기:</strong>
                            <span
                                className={`sentiment sentiment-${contextAnalysis.sentiment}`}
                            >
                                {contextAnalysis.sentiment === "positive" &&
                                    "긍정적 😊"}
                                {contextAnalysis.sentiment === "neutral" &&
                                    "중립적 😐"}
                                {contextAnalysis.sentiment === "negative" &&
                                    "부정적 😟"}
                            </span>
                        </div>
                        {contextAnalysis.key_questions.length > 0 && (
                            <div className="analysis-item">
                                <strong>주요 질문들:</strong>
                                <ul className="questions-list">
                                    {contextAnalysis.key_questions.map(
                                        (question, index) => (
                                            <li key={index}>{question}</li>
                                        ),
                                    )}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {scriptRecommendations && (
                <div className="script-recommendations-section">
                    <h3>추천 대화 스크립트</h3>
                    <div className="recommendations-info">
                        <span
                            className={`info-badge ${scriptRecommendations.context_based ? "active" : ""}`}
                        >
                            {scriptRecommendations.context_based ? "✓" : "✗"}{" "}
                            맥락 기반
                        </span>
                        <span
                            className={`info-badge ${scriptRecommendations.audience_aligned ? "active" : ""}`}
                        >
                            {scriptRecommendations.audience_aligned ? "✓" : "✗"}{" "}
                            타겟 시청자 맞춤
                        </span>
                    </div>
                    <div className="scripts-list">
                        {scriptRecommendations.scripts.map((script, index) => (
                            <div key={index} className="script-item">
                                <div className="script-number">
                                    #{index + 1}
                                </div>
                                <div className="script-content">
                                    <p>{script}</p>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.target.disabled = true;
                                        copyScript(script);
                                        setTimeout(() => {
                                            e.target.disabled = false;
                                        }, 1500);
                                    }}
                                    className="copy-btn"
                                >
                                    복사
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="analysis-footer">
                <small>
                    AI 제공자: {aiStatus?.provider || "없음"} | 타겟 설정:{" "}
                    {aiStatus?.has_target_audience ? "완료" : "미설정"}
                </small>
            </div>
        </div>
    );
});

ChatAnalysis.displayName = "ChatAnalysis";

export default ChatAnalysis;
