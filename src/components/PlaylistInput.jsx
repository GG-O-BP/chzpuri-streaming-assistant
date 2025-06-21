import { memo, useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import AddToPlaylist from "./AddToPlaylist";
import "./PlaylistInput.css";

const PlaylistInput = memo(() => {
    const [commandConfig, setCommandConfig] = useState({
        prefix: "!",
        commands: {},
        playlist_limits: { user_limit: null },
    });
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState("");
    const [editingAlias, setEditingAlias] = useState(false);
    const [newAlias, setNewAlias] = useState("");
    const [userLimit, setUserLimit] = useState("");

    // Load command configuration
    useEffect(() => {
        loadConfig();
    }, []);

    const loadConfig = async () => {
        try {
            setLoading(true);
            const config = await invoke("get_command_config");
            setCommandConfig(config);
            setUserLimit(config.playlist_limits?.user_limit?.toString() || "");
        } catch (error) {
            console.error("Failed to load command config:", error);
            setMessage("설정을 불러오는데 실패했습니다.");
        } finally {
            setLoading(false);
        }
    };

    const saveConfig = async (newConfig) => {
        try {
            await invoke("update_command_config", { config: newConfig });
            setMessage("설정이 저장되었습니다.");
            setTimeout(() => setMessage(""), 2000);
        } catch (error) {
            console.error("Failed to save command config:", error);
            setMessage("설정 저장에 실패했습니다.");
            setTimeout(() => setMessage(""), 3000);
        }
    };

    const togglePlaylistCommand = useCallback(() => {
        const playlistCmd = commandConfig.commands.playlist;
        if (playlistCmd) {
            const newConfig = {
                ...commandConfig,
                commands: {
                    ...commandConfig.commands,
                    playlist: {
                        ...playlistCmd,
                        enabled: !playlistCmd.enabled,
                    },
                },
            };
            setCommandConfig(newConfig);
            saveConfig(newConfig);
        }
    }, [commandConfig]);

    const addAlias = useCallback(() => {
        if (!newAlias.trim()) return;

        const playlistCmd = commandConfig.commands.playlist;
        if (playlistCmd) {
            const newConfig = {
                ...commandConfig,
                commands: {
                    ...commandConfig.commands,
                    playlist: {
                        ...playlistCmd,
                        aliases: [...playlistCmd.aliases, newAlias.trim()],
                    },
                },
            };
            setCommandConfig(newConfig);
            saveConfig(newConfig);
            setNewAlias("");
            setEditingAlias(false);
        }
    }, [commandConfig, newAlias]);

    const removeAlias = useCallback(
        (aliasToRemove) => {
            const playlistCmd = commandConfig.commands.playlist;
            if (playlistCmd) {
                const newConfig = {
                    ...commandConfig,
                    commands: {
                        ...commandConfig.commands,
                        playlist: {
                            ...playlistCmd,
                            aliases: playlistCmd.aliases.filter(
                                (alias) => alias !== aliasToRemove,
                            ),
                        },
                    },
                };
                setCommandConfig(newConfig);
                saveConfig(newConfig);
            }
        },
        [commandConfig],
    );

    const handleUserLimitChange = useCallback((e) => {
        const value = e.target.value;
        if (value === "" || /^\d+$/.test(value)) {
            setUserLimit(value);
        }
    }, []);

    const saveUserLimit = useCallback(() => {
        const newConfig = {
            ...commandConfig,
            playlist_limits: {
                user_limit: userLimit === "" ? null : parseInt(userLimit, 10),
            },
        };
        setCommandConfig(newConfig);
        saveConfig(newConfig);
    }, [commandConfig, userLimit]);

    const playlistCmd = commandConfig.commands.playlist || {};

    return (
        <div className="playlist-input">
            <div className="playlist-input-header">
                <h3>플레이리스트에 추가</h3>
            </div>

            {message && (
                <div
                    className={`config-message ${message.includes("실패") ? "error" : "success"}`}
                >
                    {message}
                </div>
            )}

            <div className="playlist-input-content">
                <div className="playlist-command-config">
                    <div className="command-toggle">
                        <label className="toggle-label">
                            <input
                                type="checkbox"
                                checked={playlistCmd.enabled || false}
                                onChange={togglePlaylistCommand}
                                disabled={loading}
                            />
                            <span className="toggle-slider"></span>
                        </label>
                        <span className="command-label">
                            채팅 명령어 활성화 ({commandConfig.prefix}playlist)
                        </span>
                    </div>

                    {playlistCmd.enabled && (
                        <>
                            <div className="command-aliases">
                                <span className="aliases-label">별칭:</span>
                                <div className="aliases-list">
                                    {(playlistCmd.aliases || []).map(
                                        (alias, index) => (
                                            <span
                                                key={index}
                                                className="alias-tag"
                                            >
                                                {commandConfig.prefix}
                                                {alias}
                                                <button
                                                    className="remove-alias"
                                                    onClick={() =>
                                                        removeAlias(alias)
                                                    }
                                                    title="별칭 제거"
                                                >
                                                    ×
                                                </button>
                                            </span>
                                        ),
                                    )}
                                    {editingAlias ? (
                                        <div className="add-alias-form inline">
                                            <input
                                                type="text"
                                                value={newAlias}
                                                onChange={(e) =>
                                                    setNewAlias(e.target.value)
                                                }
                                                placeholder="새 별칭"
                                                onKeyPress={(e) => {
                                                    if (e.key === "Enter") {
                                                        addAlias();
                                                    }
                                                }}
                                                autoFocus
                                            />
                                            <button
                                                className="confirm-alias"
                                                onClick={addAlias}
                                            >
                                                ✓
                                            </button>
                                            <button
                                                className="cancel-alias"
                                                onClick={() => {
                                                    setEditingAlias(false);
                                                    setNewAlias("");
                                                }}
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="add-alias"
                                            onClick={() =>
                                                setEditingAlias(true)
                                            }
                                        >
                                            + 별칭 추가
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="user-limit-config">
                                <label className="limit-label">
                                    유저 당 신청곡 수 제한
                                    <span className="limit-hint">
                                        (비워두면 제한 없음)
                                    </span>
                                </label>
                                <div className="limit-input-group">
                                    <input
                                        type="text"
                                        value={userLimit}
                                        onChange={handleUserLimitChange}
                                        placeholder="예: 3"
                                        className="limit-input"
                                        onBlur={saveUserLimit}
                                        onKeyPress={(e) => {
                                            if (e.key === "Enter") {
                                                saveUserLimit();
                                            }
                                        }}
                                    />
                                    <span className="limit-suffix">곡</span>
                                </div>
                                <p className="limit-description">
                                    현재 재생 중인 곡 이후의 곡들에만
                                    적용됩니다.
                                </p>
                            </div>
                        </>
                    )}
                </div>

                <div className="tab-content-wrapper">
                    <AddToPlaylist />
                </div>
            </div>
        </div>
    );
});

PlaylistInput.displayName = "PlaylistInput";

export default PlaylistInput;
