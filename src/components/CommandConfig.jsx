import React, { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import "./CommandConfig.css";

const CommandConfig = React.memo(() => {
    const [config, setConfig] = useState({
        prefix: "!",
        commands: {}
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [editingCommand, setEditingCommand] = useState(null);
    const [newAlias, setNewAlias] = useState("");

    // Load command configuration
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const commandConfig = await invoke("get_command_config");
            setConfig(commandConfig);
        } catch (error) {
            console.error("Failed to load command config:", error);
            setMessage("설정을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async () => {
        try {
            setSaving(true);
            await invoke("update_command_config", { config });
            setMessage("설정이 저장되었습니다.");
            setTimeout(() => setMessage(""), 3000);
        } catch (error) {
            console.error("Failed to save command config:", error);
            setMessage("설정 저장에 실패했습니다.");
        } finally {
            setSaving(false);
        }
    };

    const handlePrefixChange = useCallback((e) => {
        const newPrefix = e.target.value;
        if (newPrefix.length <= 3) {
            setConfig(prev => ({ ...prev, prefix: newPrefix }));
        }
    }, []);

    const toggleCommand = useCallback((commandName) => {
        setConfig(prev => ({
            ...prev,
            commands: {
                ...prev.commands,
                [commandName]: {
                    ...prev.commands[commandName],
                    enabled: !prev.commands[commandName].enabled
                }
            }
        }));
    }, []);

    const addAlias = useCallback((commandName) => {
        if (!newAlias.trim()) return;

        setConfig(prev => ({
            ...prev,
            commands: {
                ...prev.commands,
                [commandName]: {
                    ...prev.commands[commandName],
                    aliases: [...prev.commands[commandName].aliases, newAlias.trim()]
                }
            }
        }));
        setNewAlias("");
        setEditingCommand(null);
    }, [newAlias]);

    const removeAlias = useCallback((commandName, aliasToRemove) => {
        setConfig(prev => ({
            ...prev,
            commands: {
                ...prev.commands,
                [commandName]: {
                    ...prev.commands[commandName],
                    aliases: prev.commands[commandName].aliases.filter(
                        alias => alias !== aliasToRemove
                    )
                }
            }
        }));
    }, []);

    if (loading) {
        return (
            <div className="command-config loading">
                <p>설정을 불러오는 중...</p>
            </div>
        );
    }

    return (
        <div className="command-config">
            <div className="config-header">
                <h2>명령어 설정</h2>
                <button
                    className="save-button"
                    onClick={saveConfig}
                    disabled={saving}
                >
                    {saving ? "저장 중..." : "설정 저장"}
                </button>
            </div>

            {message && (
                <div className={`config-message ${message.includes("실패") ? "error" : "success"}`}>
                    {message}
                </div>
            )}

            <div className="config-section">
                <h3>명령어 접두사</h3>
                <div className="prefix-config">
                    <input
                        type="text"
                        value={config.prefix}
                        onChange={handlePrefixChange}
                        placeholder="예: !, /, @"
                        maxLength={3}
                    />
                    <span className="prefix-hint">
                        모든 명령어는 이 접두사로 시작합니다
                    </span>
                </div>
            </div>

            <div className="config-section">
                <h3>명령어 목록</h3>
                <div className="commands-list">
                    {Object.entries(config.commands).map(([key, command]) => (
                        <div key={key} className="command-item">
                            <div className="command-header">
                                <div className="command-info">
                                    <div className="command-name">
                                        <label className="toggle-label">
                                            <input
                                                type="checkbox"
                                                checked={command.enabled}
                                                onChange={() => toggleCommand(key)}
                                            />
                                            <span className="toggle-slider"></span>
                                        </label>
                                        <span className="command-text">
                                            {config.prefix}{command.name}
                                        </span>
                                    </div>
                                    <p className="command-description">
                                        {command.description}
                                    </p>
                                </div>
                            </div>

                            <div className="command-aliases">
                                <span className="aliases-label">별칭:</span>
                                <div className="aliases-list">
                                    {command.aliases.map((alias, index) => (
                                        <span key={index} className="alias-tag">
                                            {config.prefix}{alias}
                                            <button
                                                className="remove-alias"
                                                onClick={() => removeAlias(key, alias)}
                                                title="별칭 제거"
                                            >
                                                ×
                                            </button>
                                        </span>
                                    ))}
                                    {editingCommand === key ? (
                                        <div className="add-alias-form">
                                            <input
                                                type="text"
                                                value={newAlias}
                                                onChange={(e) => setNewAlias(e.target.value)}
                                                placeholder="새 별칭"
                                                onKeyPress={(e) => {
                                                    if (e.key === "Enter") {
                                                        addAlias(key);
                                                    }
                                                }}
                                            />
                                            <button
                                                className="confirm-alias"
                                                onClick={() => addAlias(key)}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                className="cancel-alias"
                                                onClick={() => {
                                                    setEditingCommand(null);
                                                    setNewAlias("");
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="add-alias"
                                            onClick={() => setEditingCommand(key)}
                                        >
                                            + 별칭 추가
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="config-section">
                <h3>사용 예시</h3>
                <div className="examples">
                    <div className="example-item">
                        <code>{config.prefix}playlist https://youtube.com/watch?v=...</code>
                        <span>YouTube URL로 곡 추가</span>
                    </div>
                    <div className="example-item">
                        <code>{config.prefix}playlist 아이유 좋은날</code>
                        <span>검색어로 곡 추가</span>
                    </div>
                    <div className="example-item">
                        <code>{config.prefix}skip</code>
                        <span>다음 곡으로 넘기기</span>
                    </div>
                    <div className="example-item">
                        <code>{config.prefix}음악 신나는 노래</code>
                        <span>별칭 사용 예시</span>
                    </div>
                </div>
            </div>
        </div>
    );
});

CommandConfig.displayName = "CommandConfig";

export default CommandConfig;
