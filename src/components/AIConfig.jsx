import React, { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

const AIConfig = React.memo(() => {
    const [provider, setProvider] = useState("chatgpt");
    const [apiKey, setApiKey] = useState("");
    const [isConfiguring, setIsConfiguring] = useState(false);
    const [configStatus, setConfigStatus] = useState("");

    // Target audience state
    const [ageRange, setAgeRange] = useState("20-30");
    const [gender, setGender] = useState("all");
    const [interests, setInterests] = useState("");
    const [contentType, setContentType] = useState("gaming");

    const [showApiKey, setShowApiKey] = useState(false);

    const handleConfigureAI = useCallback(async () => {
        if (!apiKey.trim()) {
            setConfigStatus("API 키를 입력해주세요.");
            return;
        }

        setIsConfiguring(true);
        setConfigStatus("");

        try {
            const result = await invoke("configure_ai", {
                provider,
                apiKey: apiKey.trim()
            });
            setConfigStatus(result);

            // Configure target audience after AI setup
            const interestsList = interests
                .split(",")
                .map(i => i.trim())
                .filter(i => i.length > 0);

            await invoke("set_target_audience", {
                ageRange,
                gender,
                interests: interestsList,
                contentType
            });

            setConfigStatus("AI 서비스가 성공적으로 설정되었습니다!");
        } catch (error) {
            setConfigStatus(`설정 실패: ${error}`);
        } finally {
            setIsConfiguring(false);
        }
    }, [provider, apiKey, ageRange, gender, interests, contentType]);

    const toggleApiKeyVisibility = useCallback(() => {
        setShowApiKey(prev => !prev);
    }, []);

    return (
        <div className="ai-config">
            <h2>AI 서비스 설정</h2>

            <div className="config-section">
                <h3>AI 제공자 선택</h3>
                <div className="provider-selection">
                    <label>
                        <input
                            type="radio"
                            value="chatgpt"
                            checked={provider === "chatgpt"}
                            onChange={(e) => setProvider(e.target.value)}
                        />
                        ChatGPT (OpenAI)
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="claude"
                            checked={provider === "claude"}
                            onChange={(e) => setProvider(e.target.value)}
                        />
                        Claude (Anthropic)
                    </label>
                    <label>
                        <input
                            type="radio"
                            value="gemini"
                            checked={provider === "gemini"}
                            onChange={(e) => setProvider(e.target.value)}
                        />
                        Gemini (Google)
                    </label>
                </div>
            </div>

            <div className="config-section">
                <h3>API 키</h3>
                <div className="api-key-input">
                    <input
                        type={showApiKey ? "text" : "password"}
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="API 키를 입력하세요"
                        className="input-field"
                    />
                    <button
                        onClick={toggleApiKeyVisibility}
                        className="toggle-visibility-btn"
                        type="button"
                    >
                        {showApiKey ? "숨기기" : "보기"}
                    </button>
                </div>
                <small className="help-text">
                    {provider === "chatgpt" && "OpenAI 대시보드에서 API 키를 발급받으세요."}
                    {provider === "claude" && "Anthropic Console에서 API 키를 발급받으세요."}
                    {provider === "gemini" && "Google AI Studio에서 API 키를 발급받으세요."}
                </small>
            </div>

            <div className="config-section">
                <h3>타겟 시청자 설정</h3>

                <div className="form-group">
                    <label htmlFor="age-range">연령대</label>
                    <select
                        id="age-range"
                        value={ageRange}
                        onChange={(e) => setAgeRange(e.target.value)}
                        className="select-field"
                    >
                        <option value="10-20">10-20대</option>
                        <option value="20-30">20-30대</option>
                        <option value="30-40">30-40대</option>
                        <option value="40+">40대 이상</option>
                        <option value="all">전체</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="gender">성별</label>
                    <select
                        id="gender"
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="select-field"
                    >
                        <option value="all">전체</option>
                        <option value="male">남성</option>
                        <option value="female">여성</option>
                    </select>
                </div>

                <div className="form-group">
                    <label htmlFor="interests">관심사 (쉼표로 구분)</label>
                    <input
                        id="interests"
                        type="text"
                        value={interests}
                        onChange={(e) => setInterests(e.target.value)}
                        placeholder="게임, 음악, 요리, 운동..."
                        className="input-field"
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="content-type">컨텐츠 유형</label>
                    <select
                        id="content-type"
                        value={contentType}
                        onChange={(e) => setContentType(e.target.value)}
                        className="select-field"
                    >
                        <option value="gaming">게임</option>
                        <option value="music">음악</option>
                        <option value="talk">토크/잡담</option>
                        <option value="education">교육</option>
                        <option value="cooking">요리</option>
                        <option value="sports">스포츠</option>
                        <option value="variety">버라이어티</option>
                    </select>
                </div>
            </div>

            <div className="action-buttons">
                <button
                    onClick={handleConfigureAI}
                    disabled={isConfiguring}
                    className="primary-btn"
                >
                    {isConfiguring ? "설정 중..." : "AI 서비스 설정"}
                </button>
            </div>

            {configStatus && (
                <div className={`status-message ${configStatus.includes("실패") ? "error" : "success"}`}>
                    {configStatus}
                </div>
            )}
        </div>
    );
});

AIConfig.displayName = "AIConfig";

export default AIConfig;
