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
                return state;
            }
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
            const message = createChatMessage(event);
            dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });

            // AI 분석을 위해 백엔드로 메시지 전송
            try {
                await invoke("add_chat_message", {
                    username: event.nickname,
                    message: event.msg,
                });
            } catch (err) {
                console.error("Failed to buffer message for AI:", err);
            }
        },
        [dispatch],
    );

    const handleDonationEvent = useCallback(
        async (event) => {
            const message = createDonationMessage(event);
            dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });

            // 후원 메시지도 AI 분석에 포함
            if (event.msg) {
                try {
                    await invoke("add_chat_message", {
                        username: event.nickname || "익명의 후원자",
                        message: `[후원 ${event.extras.payAmount}원] ${event.msg}`,
                    });
                } catch (err) {
                    console.error(
                        "Failed to buffer donation message for AI:",
                        err,
                    );
                }
            }
        },
        [dispatch],
    );

    const handleSystemMessageEvent = useCallback(
        (event) => {
            const message = createSystemMessage(event);
            dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });
        },
        [dispatch],
    );

    const handleConnectedEvent = useCallback(() => {
        dispatch({ type: ActionTypes.SET_CONNECTED, payload: true });
        dispatch({ type: ActionTypes.CLEAR_ERROR });
        const message = createConnectedMessage();
        dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });
    }, [dispatch]);

    const handleDisconnectedEvent = useCallback(() => {
        dispatch({ type: ActionTypes.SET_CONNECTED, payload: false });
        const message = createDisconnectedMessage();
        dispatch({ type: ActionTypes.ADD_MESSAGE, payload: message });
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

    const eventHandlers = useEventHandlers(dispatch);

    // 부작용: 이벤트 리스너 설정
    useEffect(() => {
        const setupListener = async () => {
            if (unlistenRef.current) {
                unlistenRef.current();
                unlistenRef.current = null;
            }

            unlistenRef.current = await listen("chzzk-chat-event", (event) => {
                const chatEvent = event.payload;

                switch (chatEvent.type) {
                    case "chat":
                        eventHandlers.handleChatEvent(chatEvent);
                        break;
                    case "donation":
                        eventHandlers.handleDonationEvent(chatEvent);
                        break;
                    case "systemMessage":
                        eventHandlers.handleSystemMessageEvent(chatEvent);
                        break;
                    case "connected":
                        eventHandlers.handleConnectedEvent();
                        break;
                    case "disconnected":
                        eventHandlers.handleDisconnectedEvent();
                        break;
                    case "error":
                        eventHandlers.handleErrorEvent(chatEvent.message);
                        break;
                }
            });
        };

        setupListener();

        return () => {
            if (unlistenRef.current) {
                unlistenRef.current();
                unlistenRef.current = null;
            }
        };
    }, [eventHandlers]);

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
            dispatch({ type: ActionTypes.CLEAR_MESSAGES });
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
        </div>
    );
}

export default ChzzkChat;
