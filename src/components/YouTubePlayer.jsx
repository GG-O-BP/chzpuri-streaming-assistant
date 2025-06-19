import { memo, useEffect, useRef, useState, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import "./YouTubePlayer.css";

const YouTubePlayer = memo(() => {
    const playerRef = useRef(null);
    const [player, setPlayer] = useState(null);
    const [currentVideo, setCurrentVideo] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [autoplay, setAutoplay] = useState(true);
    const [isApiReady, setIsApiReady] = useState(false);
    const [initError, setInitError] = useState(null);
    const initAttemptRef = useRef(0);

    // Load playlist state on mount
    useEffect(() => {
        loadPlaylistState();
    }, []);

    const loadPlaylistState = async () => {
        try {
            const playlist = await invoke("get_playlist");
            setAutoplay(playlist.autoplay);
        } catch (error) {
            console.error("Failed to load playlist state:", error);
        }
    };

    // Load YouTube IFrame API
    useEffect(() => {
        console.log("Initializing YouTube IFrame API...");

        // Check if API is already loaded
        if (window.YT && window.YT.Player) {
            console.log("YouTube API already loaded");
            setIsApiReady(true);
            return;
        }

        // Function to handle API ready
        const handleApiReady = () => {
            console.log("YouTube IFrame API ready");
            setIsApiReady(true);
            initAttemptRef.current = 0;
        };

        // Set up global callback
        window.onYouTubeIframeAPIReady = handleApiReady;

        // Check if script already exists
        const existingScript = document.querySelector(
            'script[src*="youtube.com/iframe_api"]',
        );
        if (existingScript) {
            console.log(
                "YouTube API script already exists, waiting for ready state...",
            );
            // Try to detect if API is ready with a timeout
            const checkReady = setInterval(() => {
                if (window.YT && window.YT.Player) {
                    clearInterval(checkReady);
                    handleApiReady();
                }
            }, 100);

            // Clear interval after 5 seconds
            setTimeout(() => clearInterval(checkReady), 5000);
            return;
        }

        // Load the IFrame Player API code asynchronously
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        tag.async = true;
        tag.onerror = () => {
            console.error("Failed to load YouTube IFrame API");
            setInitError("YouTube API 로드 실패");
        };

        const firstScriptTag = document.getElementsByTagName("script")[0];
        if (firstScriptTag && firstScriptTag.parentNode) {
            firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        } else {
            document.head.appendChild(tag);
        }

        return () => {
            window.onYouTubeIframeAPIReady = null;
        };
    }, []);

    const initializePlayer = useCallback(() => {
        if (!playerRef.current || player || !window.YT || !window.YT.Player) {
            console.log("Cannot initialize player:", {
                hasRef: !!playerRef.current,
                hasPlayer: !!player,
                hasYT: !!window.YT,
                hasYTPlayer: !!(window.YT && window.YT.Player),
            });
            return;
        }

        console.log("Creating YouTube player instance...");

        try {
            const newPlayer = new window.YT.Player(playerRef.current, {
                height: "100%",
                width: "100%",
                videoId: "",
                playerVars: {
                    autoplay: 0,
                    controls: 1,
                    disablekb: 0,
                    enablejsapi: 1,
                    modestbranding: 1,
                    origin: window.location.origin || "http://localhost:1420",
                    playsinline: 1,
                    rel: 0,
                    fs: 1,
                    iv_load_policy: 3,
                    showinfo: 0,
                },
                events: {
                    onReady: onPlayerReady,
                    onStateChange: onPlayerStateChange,
                    onError: onPlayerError,
                },
            });

            setPlayer(newPlayer);
            setInitError(null);
        } catch (error) {
            console.error("Failed to create YouTube player:", error);
            setInitError("플레이어 생성 실패");

            // Retry after a delay
            if (initAttemptRef.current < 3) {
                initAttemptRef.current++;
                setTimeout(() => {
                    console.log(
                        `Retrying player initialization (attempt ${initAttemptRef.current})...`,
                    );
                    initializePlayer();
                }, 1000);
            }
        }
    }, [player]);

    // Initialize player when API is ready
    useEffect(() => {
        if (isApiReady && !player) {
            initializePlayer();
        }
    }, [isApiReady, player, initializePlayer]);

    const onPlayerReady = useCallback((event) => {
        console.log("YouTube player ready");
        // Set default volume
        event.target.setVolume(80);
    }, []);

    const onPlayerStateChange = useCallback(
        (event) => {
            const state = event.data;

            switch (state) {
                case window.YT.PlayerState.ENDED:
                    console.log("Video ended, autoplay:", autoplay);
                    handleVideoEnded();
                    break;
                case window.YT.PlayerState.PLAYING:
                    setIsPlaying(true);
                    break;
                case window.YT.PlayerState.PAUSED:
                    setIsPlaying(false);
                    break;
                case window.YT.PlayerState.BUFFERING:
                    console.log("Buffering...");
                    break;
            }
        },
        [autoplay],
    );

    const onPlayerError = useCallback((event) => {
        const errorCode = event.data;
        let errorMessage = "알 수 없는 오류";

        // YouTube error codes
        switch (errorCode) {
            case 2:
                errorMessage = "잘못된 매개변수";
                break;
            case 5:
                errorMessage = "HTML5 플레이어 오류";
                break;
            case 100:
                errorMessage = "요청한 동영상을 찾을 수 없습니다";
                break;
            case 101:
            case 150:
                errorMessage = "동영상 소유자가 재생을 허용하지 않았습니다";
                break;
            default:
                errorMessage = `오류 코드: ${errorCode}`;
        }

        console.error("YouTube player error:", errorCode, errorMessage);

        // Show error message to user
        setInitError(errorMessage);

        // Notify backend about error
        invoke("add_chat_message", {
            username: "System",
            message: `플레이어 오류: ${errorMessage}`,
        }).catch(console.error);
    }, []);

    const handleVideoEnded = useCallback(async () => {
        console.log("Video ended, checking autoplay status...");

        // Get current autoplay state from backend
        try {
            const playlist = await invoke("get_playlist");
            console.log("Current playlist state:", playlist);

            if (playlist.autoplay) {
                console.log("Autoplay is enabled, playing next video...");
                // Request next video from backend
                await invoke("skip_to_next_command");
            } else {
                console.log("Autoplay is disabled");
            }
        } catch (error) {
            console.error("Failed to handle video end:", error);
        }
    }, []);

    // Listen for playlist events
    useEffect(() => {
        const unlistenPlay = listen("playlist:play", (event) => {
            const video = event.payload;
            playVideo(video);
        });

        const unlistenPause = listen("playlist:pause", () => {
            if (player) {
                player.pauseVideo();
            }
        });

        const unlistenResume = listen("playlist:resume", () => {
            if (player) {
                player.playVideo();
            }
        });

        const unlistenUpdated = listen("playlist:updated", (event) => {
            const playlist = event.payload;
            setAutoplay(playlist.autoplay);
        });

        return async () => {
            (await unlistenPlay)();
            (await unlistenPause)();
            (await unlistenResume)();
            (await unlistenUpdated)();
        };
    }, [player]);

    const playVideo = useCallback(
        (video) => {
            if (!player) {
                console.warn("Player not ready, queuing video:", video);
                // Queue the video to play when player is ready
                if (playerRef.current) {
                    playerRef.current.dataset.pendingVideoId = video.video_id;
                    setCurrentVideo(video);
                }
                return;
            }

            console.log("Playing video:", video.video_id, video.title);
            setCurrentVideo(video);
            setInitError(null);

            try {
                player.loadVideoById({
                    videoId: video.video_id,
                    startSeconds: 0,
                    suggestedQuality: "large",
                });
            } catch (error) {
                console.error("Failed to load video:", error);
                setInitError("동영상 로드 실패");
            }
        },
        [player],
    );

    // Play pending video when player becomes ready
    useEffect(() => {
        if (
            player &&
            playerRef.current &&
            playerRef.current.dataset.pendingVideoId
        ) {
            const pendingVideoId = playerRef.current.dataset.pendingVideoId;
            delete playerRef.current.dataset.pendingVideoId;

            if (currentVideo && currentVideo.video_id === pendingVideoId) {
                console.log("Playing pending video:", pendingVideoId);
                playVideo(currentVideo);
            }
        }
    }, [player, currentVideo, playVideo]);

    const handleAutoplayToggle = useCallback(async () => {
        const newAutoplay = !autoplay;
        setAutoplay(newAutoplay);

        try {
            await invoke("set_autoplay", { enabled: newAutoplay });
        } catch (error) {
            console.error("Failed to update autoplay:", error);
        }
    }, [autoplay]);

    return (
        <div className="youtube-player">
            <div className="player-container">
                <div ref={playerRef} className="player-iframe"></div>

                {!currentVideo && !initError && (
                    <div className="player-placeholder">
                        <div className="placeholder-content">
                            <i className="placeholder-icon">▶️</i>
                            <p>플레이리스트가 비어있습니다</p>
                            <p className="placeholder-hint">
                                채팅에서 !playlist [YouTube URL 또는 검색어]를
                                입력해주세요
                            </p>
                        </div>
                    </div>
                )}

                {initError && (
                    <div className="player-error">
                        <div className="error-content">
                            <i className="error-icon">⚠️</i>
                            <p className="error-message">{initError}</p>
                            {!player && (
                                <button
                                    className="retry-button"
                                    onClick={() => {
                                        setInitError(null);
                                        initAttemptRef.current = 0;
                                        initializePlayer();
                                    }}
                                >
                                    다시 시도
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {currentVideo && (
                <div className="player-info">
                    <div className="video-info-content">
                        <div className="video-title">{currentVideo.title}</div>
                        <div className="video-channel">
                            {currentVideo.channel}
                        </div>
                    </div>

                    <button
                        className={`autoplay-button ${autoplay ? "active" : ""}`}
                        onClick={handleAutoplayToggle}
                        title={autoplay ? "자동재생 켜짐" : "자동재생 꺼짐"}
                    >
                        <div className="autoplay-icon">
                            {autoplay ? "🔄" : "⏸️"}
                        </div>
                        <div className="autoplay-text">
                            <div className="autoplay-label">자동재생</div>
                            <div className="autoplay-status">
                                {autoplay ? "켜짐" : "꺼짐"}
                            </div>
                        </div>
                        <div className="autoplay-description">
                            {autoplay
                                ? "재생이 끝나면 다음 곡을 자동으로 재생합니다"
                                : "재생이 끝나면 정지합니다"}
                        </div>
                    </button>
                </div>
            )}
        </div>
    );
});

YouTubePlayer.displayName = "YouTubePlayer";

export default YouTubePlayer;
