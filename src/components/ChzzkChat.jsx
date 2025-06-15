import { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./ChzzkChat.css";

function ChzzkChat() {
    const [channelId, setChannelId] = useState("");
    const [isConnected, setIsConnected] = useState(false);
    const [messages, setMessages] = useState([]);
    const [error, setError] = useState("");
    const messagesEndRef = useRef(null);
    const unlistenRef = useRef(null);

    useEffect(() => {
        // 채팅 이벤트 리스너 설정
        const setupListener = async () => {
            // 기존 리스너가 있다면 먼저 제거
            if (unlistenRef.current) {
                unlistenRef.current();
                unlistenRef.current = null;
            }

            unlistenRef.current = await listen("chzzk-chat-event", (event) => {
                const chatEvent = event.payload;

                switch (chatEvent.type) {
                    case "chat":
                        setMessages((prev) => {
                            // 중복 체크
                            if (prev.some((msg) => msg.id === chatEvent.uid)) {
                                return prev;
                            }
                            return [
                                ...prev,
                                {
                                    type: "chat",
                                    id: chatEvent.uid,
                                    nickname: chatEvent.nickname,
                                    message: chatEvent.msg,
                                    time: new Date(chatEvent.msgTime),
                                    profile: chatEvent.profile,
                                },
                            ];
                        });
                        break;

                    case "donation":
                        setMessages((prev) => {
                            // 중복 체크
                            if (prev.some((msg) => msg.id === chatEvent.uid)) {
                                return prev;
                            }
                            return [
                                ...prev,
                                {
                                    type: "donation",
                                    id: chatEvent.uid,
                                    nickname:
                                        chatEvent.nickname || "익명의 후원자",
                                    message: chatEvent.msg || "",
                                    amount: chatEvent.extras.payAmount,
                                    time: new Date(chatEvent.msgTime),
                                    profile: chatEvent.profile,
                                },
                            ];
                        });
                        break;

                    case "systemMessage":
                        setMessages((prev) => {
                            // 중복 체크
                            if (prev.some((msg) => msg.id === chatEvent.uid)) {
                                return prev;
                            }
                            return [
                                ...prev,
                                {
                                    type: "system",
                                    id: chatEvent.uid,
                                    message: chatEvent.extras.description,
                                    time: new Date(chatEvent.msgTime),
                                },
                            ];
                        });
                        break;

                    case "connected":
                        setIsConnected(true);
                        setError("");
                        setMessages((prev) => {
                            const id = `connected-${Date.now()}`;
                            // 최근 1초 이내에 동일한 메시지가 있는지 확인
                            const recentConnected = prev.some(
                                (msg) =>
                                    msg.type === "system" &&
                                    msg.message === "채팅에 연결되었습니다." &&
                                    new Date().getTime() - msg.time.getTime() <
                                        1000,
                            );
                            if (recentConnected) {
                                return prev;
                            }
                            return [
                                ...prev,
                                {
                                    type: "system",
                                    id,
                                    message: "채팅에 연결되었습니다.",
                                    time: new Date(),
                                },
                            ];
                        });
                        break;

                    case "disconnected":
                        console.log("Received disconnected event");
                        setIsConnected(false);
                        setMessages((prev) => {
                            const id = `disconnected-${Date.now()}`;
                            // 최근 1초 이내에 동일한 메시지가 있는지 확인
                            const recentDisconnected = prev.some(
                                (msg) =>
                                    msg.type === "system" &&
                                    msg.message ===
                                        "채팅 연결이 끊어졌습니다." &&
                                    new Date().getTime() - msg.time.getTime() <
                                        1000,
                            );
                            if (recentDisconnected) {
                                return prev;
                            }
                            return [
                                ...prev,
                                {
                                    type: "system",
                                    id,
                                    message: "채팅 연결이 끊어졌습니다.",
                                    time: new Date(),
                                },
                            ];
                        });
                        break;

                    case "error":
                        setError(chatEvent.message);
                        break;
                }
            });
        };

        setupListener();

        // 클린업
        return () => {
            if (unlistenRef.current) {
                unlistenRef.current();
                unlistenRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        // 새 메시지가 추가될 때 스크롤을 맨 아래로
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleConnect = async () => {
        if (!channelId.trim()) {
            setError("채널 ID를 입력해주세요.");
            return;
        }

        try {
            setError("");
            await invoke("connect_chzzk_chat", { channelId: channelId.trim() });
        } catch (err) {
            setError(err.toString());
        }
    };

    const handleDisconnect = async () => {
        console.log("Disconnect button clicked");
        try {
            console.log("Calling disconnect_chzzk_chat...");
            const result = await invoke("disconnect_chzzk_chat");
            console.log("Disconnect result:", result);
            setMessages([]);
            console.log("Messages cleared");
        } catch (err) {
            console.error("Disconnect error:", err);
            setError(err.toString());
        }
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        });
    };

    const renderMessage = (msg, index) => {
        switch (msg.type) {
            case "chat":
                return (
                    <div key={index} className="chat-message">
                        <span className="time">[{formatTime(msg.time)}]</span>
                        {msg.profile?.badge && (
                            <img
                                src={msg.profile.badge.imageUrl}
                                alt="badge"
                                className="user-badge"
                            />
                        )}
                        <span className="nickname">{msg.nickname}</span>
                        <span className="separator">:</span>
                        <span className="message">{msg.message}</span>
                    </div>
                );

            case "donation":
                return (
                    <div key={index} className="donation-message">
                        <span className="time">[{formatTime(msg.time)}]</span>
                        <span className="donation-icon">💰</span>
                        <span className="nickname">{msg.nickname}</span>
                        <span className="amount">
                            님이 {msg.amount.toLocaleString()}원 후원!
                        </span>
                        {msg.message && (
                            <span className="message">{msg.message}</span>
                        )}
                    </div>
                );

            case "system":
                return (
                    <div key={index} className="system-message">
                        <span className="time">[{formatTime(msg.time)}]</span>
                        <span className="message">{msg.message}</span>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="chzzk-chat-container">
            <div className="chat-header">
                <h2>치지직 채팅</h2>
                <div className="connection-status">
                    <span
                        className={`status-indicator ${isConnected ? "connected" : "disconnected"}`}
                    ></span>
                    <span>{isConnected ? "연결됨" : "연결 안 됨"}</span>
                </div>
            </div>

            <div className="chat-controls">
                <input
                    type="text"
                    placeholder="채널 ID 입력"
                    value={channelId}
                    onChange={(e) => setChannelId(e.target.value)}
                    onKeyPress={(e) =>
                        e.key === "Enter" && !isConnected && handleConnect()
                    }
                    disabled={isConnected}
                />
                {!isConnected ? (
                    <button onClick={handleConnect} className="connect-btn">
                        연결
                    </button>
                ) : (
                    <button
                        onClick={handleDisconnect}
                        className="disconnect-btn"
                    >
                        연결 해제
                    </button>
                )}
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="chat-messages">
                {messages.map((msg, index) => renderMessage(msg, index))}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
}

export default ChzzkChat;
