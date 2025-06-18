import { useReducer, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import "./ChzzkChat.css";

// 상태 타입 정의
const ActionTypes = {
    SET_CHANNEL_ID: "SET_CHANNEL_ID",
    SET_CONNECTED: "SET_CONNECTED",
    ADD_MESSAGE: "ADD_MESSAGE",
    CLEAR_MESSAGES: "CLEAR_MESSAGES",
    SET_ERROR: "SET_ERROR",
    CLEAR_ERROR: "CLEAR_ERROR",
    GET_STATE: "GET_STATE",
};

// 초기 상태
const initialState = {
    channelId: "",
    isConnected: false,
    messages: [],
    error: "",
};

// 메시지 생성
const createChatMessage = (event) => ({
    type: "chat",
    id: event.uid,
    nickname: event.nickname,
    message: event.msg,
    time: new Date(event.msgTime),
    profile: event.profile,
});

const createDonationMessage = (event) => ({
    type: "donation",
    id: event.uid,
    nickname: event.nickname || "익명의 후원자",
    message: event.msg || "",
    amount: event.extras.payAmount,
    time: new Date(event.msgTime),
    profile: event.profile,
});

const createSystemMessage = (event) => ({
    type: "system",
    id: event.uid,
    message: event.extras.description,
    time: new Date(event.msgTime),
});

const createConnectedMessage = () => ({
    type: "system",
    id: `connected-${Date.now()}`,
    message: "채팅에 연결되었습니다.",
    time: new Date(),
});

const createDisconnectedMessage = () => ({
    type: "system",
    id: `disconnected-${Date.now()}`,
    message: "채팅 연결이 끊어졌습니다.",
    time: new Date(),
});

// 메시지 중복 체크
const isDuplicateMessage = (messages, messageId) =>
    messages.some((msg) => msg.id === messageId);

// 리듀서
const chatReducer = (state, action) => {
    switch (action.type) {
        case ActionTypes.SET_CHANNEL_ID:
            return { ...state, channelId: action.payload };

        case ActionTypes.SET_CONNECTED:
            return { ...state, isConnected: action.payload };

        case ActionTypes.ADD_MESSAGE:
            if (isDuplicateMessage(state.messages, action.payload.id)) {
                console.log(
                    "[ChzzkChat] Duplicate message blocked:",
                    action.payload.id,
                );
                return state;
            }
            console.log("[ChzzkChat] Adding message to state:", {
                id: action.payload.id,
                type: action.payload.type,
                message: action.payload.message,
            });
            return {
                ...state,
                messages: [...state.messages, action.payload],
            };

        case ActionTypes.CLEAR_MESSAGES:
            return { ...state, messages: [] };

        case ActionTypes.SET_ERROR:
            return { ...state, error: action.payload };

        case ActionTypes.CLEAR_ERROR:
            return { ...state, error: "" };

        case ActionTypes.GET_STATE:
            return state;

        default:
            return state;
    }
};

// 시간 포맷팅
const formatTime = (date) =>
    date.toLocaleTimeString("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    });

// 메시지 렌더링 데이터 생성
const createMessageRenderData = (msg) => {
    switch (msg.type) {
        case "chat":
            return {
                className: "chat-message",
                elements: [
                    { type: "time", content: formatTime(msg.time) },
                    msg.profile?.badge && {
                        type: "badge",
                        src: msg.profile.badge.imageUrl,
                    },
                    { type: "nickname", content: msg.nickname },
                    { type: "separator", content: ":" },
                    { type: "message", content: msg.message },
                ].filter(Boolean),
            };

        case "donation":
            return {
                className: "donation-message",
                elements: [
                    { type: "time", content: formatTime(msg.time) },
                    { type: "icon", content: "💰" },
                    { type: "nickname", content: msg.nickname },
                    {
                        type: "amount",
                        content: `님이 ${msg.amount.toLocaleString()}원 후원!`,
                    },
                    msg.message && { type: "message", content: msg.message },
                ].filter(Boolean),
            };

        case "system":
            return {
                className: "system-message",
                elements: [
                    { type: "time", content: formatTime(msg.time) },
                    { type: "message", content: msg.message },
                ],
            };

        default:
            return null;
    }
};

// 메시지 렌더링
const MessageComponent = ({ message, index }) => {
    const renderData = createMessageRenderData(message);
    if (!renderData) return null;

    return (
        <div key={index} className={renderData.className}>
            {renderData.elements.map((element, idx) => {
                switch (element.type) {
                    case "time":
                        return (
                            <span key={idx} className="time">
                                [{element.content}]
                            </span>
                        );
                    case "badge":
                        return (
                            <img
                                key={idx}
                                src={element.src}
                                alt="badge"
                                className="user-badge"
                            />
                        );
                    case "nickname":
                        return (
                            <span key={idx} className="nickname">
                                {element.content}
                            </span>
                        );
                    case "separator":
                        return (
                            <span key={idx} className="separator">
                                {element.content}
                            </span>
                        );
                    case "message":
                        return (
                            <span key={idx} className="message">
                                {element.content}
                            </span>
                        );
                    case "icon":
                        return (
                            <span key={idx} className="donation-icon">
                                {element.content}
                            </span>
                        );
                    case "amount":
                        return (
                            <span key={idx} className="amount">
                                {element.content}
                            </span>
                        );
                    default:
                        return null;
                }
            })}
        </div>
    );
};

// 커스텀 훅: 이벤트 핸들러 생성
const useEventHandlers = (dispatch) => {
    const handleChatEvent = useCallback(
        async (event) => {
            console.log("[ChzzkChat] Received chat event:", {
                uid: event.uid,
                nickname: event.nickname,
                message: event.msg,
                time: new Date().toISOString(),
            });

            const message = createChatMessage(event);
            dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });

            // Store display message in backend
            try {
                await invoke("store_display_message", {
                    message: {
                        id: message.id,
                        message_type: "chat",
                        username: message.nickname,
                        message: message.message,
                        timestamp: message.time.getTime(),
                        profile_image: event.profile?.userImageUrl || null,
                        badge_url: event.profile?.badge?.imageUrl || null,
                        donation_amount: null,
                    },
                });
            } catch (err) {
                console.error(
                    "[ChzzkChat] Failed to store display message:",
                    err,
                );
            }

            // AI 분석 및 명령어 처리를 위해 백엔드로 메시지 전송
            try {
                console.log("[ChzzkChat] Sending to backend:", {
                    username: event.nickname,
                    message: event.msg,
                    isCommand: event.msg.startsWith("!"),
                });

                await invoke("add_chat_message", {
                    username: event.nickname,
                    message: event.msg,
                });
            } catch (err) {
                console.error("Failed to send message to backend:", err);
                // 명령어 처리 실패 시 시스템 메시지로 알림
                if (event.msg.startsWith("!")) {
                    const errorMessage = {
                        type: "system",
                        id: `error-${Date.now()}`,
                        message: `명령어 처리 중 오류가 발생했습니다: ${err}`,
                        time: new Date(),
                    };
                    dispatch({
                        type: ActionTypes.ADD_MESSAGE,
                        payload: errorMessage,
                    });
                }
            }
        },
        [dispatch],
    );

    const handleDonationEvent = useCallback(
        async (event) => {
            const message = createDonationMessage(event);
            dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });

            // Store donation message in backend
            try {
                await invoke("store_display_message", {
                    message: {
                        id: message.id,
                        message_type: "donation",
                        username: message.nickname,
                        message: message.message,
                        timestamp: message.time.getTime(),
                        profile_image: event.profile?.userImageUrl || null,
                        badge_url: event.profile?.badge?.imageUrl || null,
                        donation_amount: message.amount,
                    },
                });
            } catch (err) {
                console.error(
                    "[ChzzkChat] Failed to store donation message:",
                    err,
                );
            }

            // 후원 메시지도 AI 분석에 포함 (명령어는 제외)
            if (event.msg && !event.msg.startsWith("!")) {
                try {
                    await invoke("add_chat_message", {
                        username: event.nickname || "익명의 후원자",
                        message: `[후원 ${event.extras.payAmount}원] ${event.msg}`,
                    });
                } catch (err) {
                    console.error(
                        "Failed to send donation message to backend:",
                        err,
                    );
                }
            }
        },
        [dispatch],
    );

    const handleSystemMessageEvent = useCallback(
        async (event) => {
            const message = createSystemMessage(event);
            dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });

            // Store system message in backend
            try {
                await invoke("store_display_message", {
                    message: {
                        id: message.id,
                        message_type: "system",
                        username: null,
                        message: message.message,
                        timestamp: message.time.getTime(),
                        profile_image: null,
                        badge_url: null,
                        donation_amount: null,
                    },
                });
            } catch (err) {
                console.error(
                    "[ChzzkChat] Failed to store system message:",
                    err,
                );
            }
        },
        [dispatch],
    );

    const handleConnectedEvent = useCallback(async () => {
        // Prevent duplicate connected events
        const currentState = dispatch({ type: ActionTypes.GET_STATE });
        if (currentState && currentState.isConnected) {
            console.log(
                "[ChzzkChat] Already connected, ignoring duplicate event",
            );
            return;
        }

        dispatch({ type: ActionTypes.SET_CONNECTED, payload: true });
        dispatch({ type: ActionTypes.CLEAR_ERROR });
        const message = createConnectedMessage();
        dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });

        // Store connected message in backend
        try {
            await invoke("store_display_message", {
                message: {
                    id: message.id,
                    message_type: "system",
                    username: null,
                    message: message.message,
                    timestamp: message.time.getTime(),
                    profile_image: null,
                    badge_url: null,
                    donation_amount: null,
                },
            });
        } catch (err) {
            console.error(
                "[ChzzkChat] Failed to store connected message:",
                err,
            );
        }
    }, [dispatch]);

    const handleDisconnectedEvent = useCallback(async () => {
        dispatch({ type: ActionTypes.SET_CONNECTED, payload: false });
        const message = createDisconnectedMessage();
        dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });

        // Store disconnected message in backend
        try {
            await invoke("store_display_message", {
                message: {
                    id: message.id,
                    message_type: "system",
                    username: null,
                    message: message.message,
                    timestamp: message.time.getTime(),
                    profile_image: null,
                    badge_url: null,
                    donation_amount: null,
                },
            });
        } catch (err) {
            console.error(
                "[ChzzkChat] Failed to store disconnected message:",
                err,
            );
        }
    }, [dispatch]);

    const handleErrorEvent = useCallback(
        (message) => {
            dispatch({ type: ActionTypes.SET_ERROR, payload: message });
        },
        [dispatch],
    );

    return {
        handleChatEvent,
        handleDonationEvent,
        handleSystemMessageEvent,
        handleConnectedEvent,
        handleDisconnectedEvent,
        handleErrorEvent,
    };
};

// 메인 컴포넌트
function ChzzkChat() {
    const [state, dispatch] = useReducer(chatReducer, initialState);
    const messagesEndRef = useRef(null);
    const unlistenRef = useRef(null);
    const mountedRef = useRef(true);

    const eventHandlers = useEventHandlers(dispatch);

    // Sync with backend connection state on mount
    useEffect(() => {
        const syncConnectionState = async () => {
            try {
                const isConnected = await invoke("is_chzzk_connected");
                const connectionState = await invoke("get_chzzk_state");

                console.log("[ChzzkChat] Syncing connection state:", {
                    isConnected,
                    connectionState,
                });

                if (isConnected) {
                    dispatch({
                        type: ActionTypes.SET_CONNECTED,
                        payload: true,
                    });
                }

                // Restore messages from backend
                try {
                    const storedMessages = await invoke("get_chat_messages");
                    console.log(
                        "[ChzzkChat] Restoring messages:",
                        storedMessages.length,
                    );

                    storedMessages.forEach((msg) => {
                        const restoredMessage = {
                            id: msg.id,
                            type: msg.message_type,
                            nickname: msg.username,
                            message: msg.message,
                            time: new Date(msg.timestamp),
                            profile: msg.profile_image
                                ? {
                                      userImageUrl: msg.profile_image,
                                      badge: msg.badge_url
                                          ? { imageUrl: msg.badge_url }
                                          : null,
                                  }
                                : null,
                            amount: msg.donation_amount,
                        };
                        dispatch({
                            type: ActionTypes.ADD_MESSAGE,
                            payload: restoredMessage,
                        });
                    });
                } catch (error) {
                    console.error(
                        "[ChzzkChat] Failed to restore messages:",
                        error,
                    );
                }
            } catch (error) {
                console.error(
                    "[ChzzkChat] Failed to sync connection state:",
                    error,
                );
            }
        };

        syncConnectionState();
    }, []);

    // 부작용: 이벤트 리스너 설정
    useEffect(() => {
        let isSubscribed = true;
        let setupInProgress = false;

        const setupListener = async () => {
            // Prevent duplicate setup
            if (setupInProgress) {
                console.log("[ChzzkChat] Setup already in progress, skipping");
                return;
            }

            setupInProgress = true;

            // Clean up existing listener
            if (unlistenRef.current) {
                console.log("[ChzzkChat] Removing existing listener");
                await unlistenRef.current();
                unlistenRef.current = null;
            }

            // Only setup new listener if component is still mounted
            if (!isSubscribed) {
                console.log(
                    "[ChzzkChat] Component unmounted, skipping listener setup",
                );
                setupInProgress = false;
                return;
            }

            try {
                console.log("[ChzzkChat] Setting up new event listener");
                unlistenRef.current = await listen(
                    "chzzk-chat-event",
                    (event) => {
                        // Check if component is still mounted before processing
                        if (!isSubscribed) {
                            console.log(
                                "[ChzzkChat] Component unmounted, ignoring event",
                            );
                            return;
                        }

                        const chatEvent = event.payload;
                        console.log("[ChzzkChat] Event listener triggered:", {
                            type: chatEvent.type,
                            uid: chatEvent.uid,
                            timestamp: new Date().toISOString(),
                        });

                        switch (chatEvent.type) {
                            case "chat":
                                eventHandlers.handleChatEvent(chatEvent);
                                break;
                            case "donation":
                                eventHandlers.handleDonationEvent(chatEvent);
                                break;
                            case "systemMessage":
                                eventHandlers.handleSystemMessageEvent(
                                    chatEvent,
                                );
                                break;
                            case "connected":
                                eventHandlers.handleConnectedEvent();
                                break;
                            case "disconnected":
                                eventHandlers.handleDisconnectedEvent();
                                break;
                            case "error":
                                eventHandlers.handleErrorEvent(
                                    chatEvent.message,
                                );
                                break;
                        }
                    },
                );
                console.log("[ChzzkChat] Event listener setup complete");
            } catch (error) {
                console.error("[ChzzkChat] Failed to setup listener:", error);
            } finally {
                setupInProgress = false;
            }
        };

        setupListener();

        return () => {
            isSubscribed = false;
            if (unlistenRef.current) {
                console.log("[ChzzkChat] Cleaning up listener on unmount");
                unlistenRef.current();
                unlistenRef.current = null;
            }
        };
    }, [eventHandlers]);

    // Don't clear messages when component unmounts, preserve them
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            // Intentionally not clearing messages here to preserve them across tab switches
            console.log(
                "[ChzzkChat] Component unmounting, preserving messages",
            );
        };
    }, []);

    // 자동 스크롤
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [state.messages]);

    // 이벤트 핸들러
    const handleChannelIdChange = useCallback(
        (e) => {
            dispatch({
                type: ActionTypes.SET_CHANNEL_ID,
                payload: e.target.value,
            });
        },
        [dispatch],
    );

    const handleConnect = useCallback(async () => {
        const trimmedChannelId = state.channelId.trim();

        if (!trimmedChannelId) {
            dispatch({
                type: ActionTypes.SET_ERROR,
                payload: "채널 ID를 입력해주세요.",
            });
            return;
        }

        dispatch({ type: ActionTypes.CLEAR_ERROR });

        try {
            await invoke("connect_chzzk_chat", { channelId: trimmedChannelId });
        } catch (err) {
            dispatch({
                type: ActionTypes.SET_ERROR,
                payload: err.toString(),
            });
        }
    }, [state.channelId]);

    const handleDisconnect = useCallback(async () => {
        try {
            await invoke("disconnect_chzzk_chat");
            // Don't automatically clear messages on disconnect
            // User can still see chat history
        } catch (err) {
            dispatch({
                type: ActionTypes.SET_ERROR,
                payload: err.toString(),
            });
        }
    }, []);

    // 연결 상태 텍스트
    const connectionStatusText = state.isConnected ? "연결됨" : "연결 안 됨";
    const connectionStatusClass = state.isConnected
        ? "connected"
        : "disconnected";

    return (
        <div className="chzzk-chat-container">
            <div className="chat-header">
                <h2>치지직 채팅</h2>
                <div className="connection-status">
                    <span
                        className={`status-indicator ${connectionStatusClass}`}
                    ></span>
                    <span>{connectionStatusText}</span>
                </div>
            </div>

            <div className="chat-controls">
                <input
                    type="text"
                    placeholder="채널 ID 입력"
                    value={state.channelId}
                    onChange={handleChannelIdChange}
                    disabled={state.isConnected}
                />
                {!state.isConnected ? (
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

            {state.error && <div className="error-message">{state.error}</div>}

            <div className="chat-messages">
                {state.messages.map((msg, index) => (
                    <MessageComponent
                        key={msg.id}
                        message={msg}
                        index={index}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>

            {state.messages.length > 0 && (
                <button
                    className="clear-messages-btn"
                    onClick={async () => {
                        dispatch({ type: ActionTypes.CLEAR_MESSAGES });
                        try {
                            await invoke("clear_display_messages");
                        } catch (err) {
                            console.error(
                                "[ChzzkChat] Failed to clear messages:",
                                err,
                            );
                        }
                    }}
                    title="메시지 기록 지우기"
                >
                    🗑️
                </button>
            )}
        </div>
    );
}

export default ChzzkChat;
