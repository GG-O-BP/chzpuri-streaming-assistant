mod ai_service;
mod chzzk;
mod commands;
mod playlist;
mod youtube;

use ai_service::{
    AIConfig, AIProvider, AIService, ChatMessage, ContextAnalysis, ScriptRecommendation,
    TargetAudience,
};
use chzzk::ChzzkChat;
use commands::{CommandConfig, CommandParser, ParsedCommand};
use playlist::{PlaylistItem, PlaylistState};
use std::collections::VecDeque;
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};
use tokio::sync::RwLock;
use youtube::YouTubeService;

// 상태 타입
#[derive(Debug, Clone)]
pub enum ChzzkState {
    Disconnected,
    Connecting { channel_id: String },
    Connected { channel_id: String },
    Error { message: String },
}

// 상태 변환을 위한 이벤트
#[derive(Debug, Clone)]
pub enum ChzzkEvent {
    StartConnect { channel_id: String },
    ConnectionSuccess { channel_id: String },
    ConnectionError { message: String },
    StartDisconnect,
    DisconnectSuccess,
    DisconnectError { message: String },
}

// 애플리케이션 상태 컨테이너
struct AppState {
    connection_state: ChzzkState,
    chat_instance: Option<ChzzkChat>,
    ai_config: Option<AIConfig>,
    ai_service: Option<AIService>,
    chat_buffer: VecDeque<ChatMessage>,
    target_audience: Option<TargetAudience>,
    last_context_analysis: Option<ContextAnalysis>,
    playlist: PlaylistState,
    command_parser: CommandParser,
    youtube_service: YouTubeService,
}

type SharedAppState = Arc<RwLock<AppState>>;

// 상태 전환 로직
fn transition_state(current: ChzzkState, event: ChzzkEvent) -> ChzzkState {
    use ChzzkEvent::*;
    use ChzzkState::*;

    let new_state = match (&current, &event) {
        (Disconnected, StartConnect { channel_id }) => Connecting {
            channel_id: channel_id.clone(),
        },
        (Connecting { .. }, ConnectionSuccess { channel_id }) => Connected {
            channel_id: channel_id.clone(),
        },
        (Connecting { .. }, ConnectionError { message }) => Error {
            message: message.clone(),
        },
        (Connected { .. }, StartDisconnect) => Disconnected,
        (Connected { .. }, DisconnectSuccess) => Disconnected,
        (Connected { .. }, DisconnectError { message }) => Error {
            message: message.clone(),
        },
        (Error { .. }, StartConnect { channel_id }) => Connecting {
            channel_id: channel_id.clone(),
        },
        (Error { .. }, StartDisconnect) => Disconnected,
        // 다른 모든 전환은 현재 상태 유지
        _ => current.clone(),
    };

    println!(
        "State transition: {:?} + {:?} -> {:?}",
        current, event, new_state
    );
    new_state
}

// 상태 검증
fn can_connect(state: &ChzzkState) -> Result<(), String> {
    match state {
        ChzzkState::Connected { .. } => Err("Already connected".to_string()),
        ChzzkState::Connecting { .. } => Err("Connection in progress".to_string()),
        _ => Ok(()),
    }
}

fn can_disconnect(state: &ChzzkState) -> Result<(), String> {
    match state {
        ChzzkState::Connected { .. } => Ok(()),
        _ => Err("Not connected".to_string()),
    }
}

// 채널 ID 검증
fn validate_channel_id(channel_id: &str) -> Result<String, String> {
    let trimmed = channel_id.trim();
    if trimmed.is_empty() {
        Err("채널 ID를 입력해주세요.".to_string())
    } else {
        Ok(trimmed.to_string())
    }
}

// IO 작업을 격리한 함수들
async fn create_and_connect_chat(
    channel_id: String,
    app_handle: AppHandle,
) -> Result<ChzzkChat, String> {
    let mut chat = ChzzkChat::new(channel_id.clone(), app_handle);
    chat.connect()
        .await
        .map_err(|e| format!("Failed to connect: {}", e))?;
    Ok(chat)
}

async fn disconnect_chat(chat: &mut ChzzkChat) -> Result<(), String> {
    chat.disconnect().await;
    Ok(())
}

// 커맨드 핸들러들
#[tauri::command]
async fn connect_chzzk_chat(
    channel_id: String,
    app_handle: AppHandle,
    state: State<'_, SharedAppState>,
) -> Result<String, String> {
    // 1. 채널 ID 검증
    let validated_channel_id = validate_channel_id(&channel_id)?;

    // 2. 현재 상태 읽기 및 연결 가능 여부 확인
    {
        let app_state = state.read().await;
        println!(
            "Current state before connect: {:?}",
            app_state.connection_state
        );
        can_connect(&app_state.connection_state)?;
    }

    // 3. 상태를 Connecting으로 전환
    {
        let mut app_state = state.write().await;
        app_state.connection_state = transition_state(
            app_state.connection_state.clone(),
            ChzzkEvent::StartConnect {
                channel_id: validated_channel_id.clone(),
            },
        );
    }

    // 4. 실제 연결 수행 (IO 작업)
    match create_and_connect_chat(validated_channel_id.clone(), app_handle).await {
        Ok(chat) => {
            // 성공: 상태 업데이트 및 인스턴스 저장
            let mut app_state = state.write().await;
            app_state.connection_state = transition_state(
                app_state.connection_state.clone(),
                ChzzkEvent::ConnectionSuccess {
                    channel_id: validated_channel_id.clone(),
                },
            );
            app_state.chat_instance = Some(chat);
            println!(
                "State after successful connection: {:?}",
                app_state.connection_state
            );
            Ok(format!("Connected to channel: {}", validated_channel_id))
        }
        Err(error) => {
            // 실패: 에러 상태로 전환
            let mut app_state = state.write().await;
            app_state.connection_state = transition_state(
                app_state.connection_state.clone(),
                ChzzkEvent::ConnectionError {
                    message: error.clone(),
                },
            );
            Err(error)
        }
    }
}

#[tauri::command]
async fn disconnect_chzzk_chat(state: State<'_, SharedAppState>) -> Result<String, String> {
    // 1. 연결 해제 가능 여부 확인
    {
        let app_state = state.read().await;
        println!(
            "Current state before disconnect: {:?}",
            app_state.connection_state
        );
        can_disconnect(&app_state.connection_state)?;
    }

    // 2. 채팅 인스턴스 가져오기 및 연결 해제
    let disconnect_result = {
        let mut app_state = state.write().await;
        if let Some(chat) = app_state.chat_instance.as_mut() {
            disconnect_chat(chat).await
        } else {
            Err("Chat instance not found".to_string())
        }
    };

    // 3. 결과에 따라 상태 업데이트
    match disconnect_result {
        Ok(_) => {
            let mut app_state = state.write().await;
            app_state.connection_state = transition_state(
                app_state.connection_state.clone(),
                ChzzkEvent::DisconnectSuccess,
            );
            app_state.chat_instance = None;
            println!(
                "State after successful disconnection: {:?}",
                app_state.connection_state
            );
            Ok("Disconnected from chat".to_string())
        }
        Err(error) => {
            let mut app_state = state.write().await;
            app_state.connection_state = transition_state(
                app_state.connection_state.clone(),
                ChzzkEvent::DisconnectError {
                    message: error.clone(),
                },
            );
            Err(error)
        }
    }
}

#[tauri::command]
async fn is_chzzk_connected(state: State<'_, SharedAppState>) -> Result<bool, String> {
    let app_state = state.read().await;
    let is_connected = matches!(app_state.connection_state, ChzzkState::Connected { .. });
    Ok(is_connected)
}

#[tauri::command]
async fn get_chzzk_state(state: State<'_, SharedAppState>) -> Result<String, String> {
    let app_state = state.read().await;
    let state_name = match &app_state.connection_state {
        ChzzkState::Disconnected => "disconnected",
        ChzzkState::Connecting { .. } => "connecting",
        ChzzkState::Connected { .. } => "connected",
        ChzzkState::Error { .. } => "error",
    };
    Ok(state_name.to_string())
}

// AI 설정 관련 커맨드
#[tauri::command]
async fn configure_ai(
    provider: String,
    api_key: String,
    state: State<'_, SharedAppState>,
) -> Result<String, String> {
    let ai_provider = match provider.as_str() {
        "chatgpt" => AIProvider::ChatGPT,
        "claude" => AIProvider::Claude,
        "gemini" => AIProvider::Gemini,
        _ => return Err("Invalid AI provider".to_string()),
    };

    let ai_config = AIConfig {
        provider: ai_provider.clone(),
        api_key: api_key.clone(),
        enabled: true,
    };

    let ai_service = AIService::new(ai_provider, api_key);

    let mut app_state = state.write().await;
    app_state.ai_config = Some(ai_config);
    app_state.ai_service = Some(ai_service);

    Ok("AI service configured successfully".to_string())
}

#[tauri::command]
async fn set_target_audience(
    age_range: String,
    gender: String,
    interests: Vec<String>,
    content_type: String,
    state: State<'_, SharedAppState>,
) -> Result<String, String> {
    let target_audience = TargetAudience {
        age_range,
        gender,
        interests,
        content_type,
    };

    let mut app_state = state.write().await;
    app_state.target_audience = Some(target_audience);

    Ok("Target audience configured".to_string())
}

#[tauri::command]
async fn add_chat_message(
    username: String,
    message: String,
    state: State<'_, SharedAppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Check if message is a command
    let is_command = {
        let app_state = state.read().await;
        app_state.command_parser.is_command(&message)
    };

    if is_command {
        // Process command
        let parsed_command = {
            let app_state = state.read().await;
            app_state.command_parser.parse(&message)
        };

        if let Some(command) = parsed_command {
            match command {
                ParsedCommand::Playlist { query } => {
                    // Handle playlist command
                    process_playlist_command(
                        query,
                        username.clone(),
                        state.inner().clone(),
                        app_handle.clone(),
                    )
                    .await?;
                }
                ParsedCommand::Skip => {
                    skip_to_next(state.inner().clone(), app_handle.clone()).await?;
                }
                ParsedCommand::Previous => {
                    go_to_previous(state.inner().clone(), app_handle.clone()).await?;
                }
                ParsedCommand::Pause => {
                    pause_playback(state.inner().clone(), app_handle.clone()).await?;
                }
                ParsedCommand::Play => {
                    resume_playback(state.inner().clone(), app_handle.clone()).await?;
                }
                ParsedCommand::Clear => {
                    clear_playlist(state.inner().clone(), app_handle.clone()).await?;
                }
                ParsedCommand::Unknown { .. } => {
                    // Ignore unknown commands
                }
            }
        }
    }

    let chat_message = ChatMessage {
        username,
        message,
        timestamp: chrono::Utc::now().timestamp(),
    };

    let mut app_state = state.write().await;

    // 버퍼가 가득 차면 오래된 메시지 제거
    if app_state.chat_buffer.len() >= 100 {
        app_state.chat_buffer.pop_front();
    }

    app_state.chat_buffer.push_back(chat_message);
    Ok(())
}

#[tauri::command]
async fn analyze_chat_context(state: State<'_, SharedAppState>) -> Result<ContextAnalysis, String> {
    // Get messages with read lock
    let messages: Vec<ChatMessage> = {
        let app_state = state.read().await;
        if app_state.ai_service.is_none() {
            return Err("AI service not configured".to_string());
        }
        app_state.chat_buffer.iter().cloned().collect()
    };

    if messages.is_empty() {
        return Err("No chat messages to analyze".to_string());
    }

    // Use write lock to access mutable AI service
    let mut app_state = state.write().await;

    let ai_service = app_state
        .ai_service
        .as_mut()
        .ok_or("AI service not configured".to_string())?;

    let context_analysis = ai_service.analyze_context(messages).await?;

    // Store the analysis result
    app_state.last_context_analysis = Some(context_analysis.clone());

    Ok(context_analysis)
}

#[tauri::command]
async fn get_script_recommendations(
    state: State<'_, SharedAppState>,
) -> Result<ScriptRecommendation, String> {
    // Get context and audience with read lock
    let (context, audience) = {
        let app_state = state.read().await;

        if app_state.ai_service.is_none() {
            return Err("AI service not configured".to_string());
        }

        let context = app_state
            .last_context_analysis
            .as_ref()
            .ok_or("No context analysis available. Please analyze chat first.".to_string())?
            .clone();

        let audience = app_state
            .target_audience
            .as_ref()
            .ok_or("Target audience not configured".to_string())?
            .clone();

        (context, audience)
    };

    // Use write lock to access mutable AI service
    let mut app_state = state.write().await;

    let ai_service = app_state
        .ai_service
        .as_mut()
        .ok_or("AI service not configured".to_string())?;

    let recommendations = ai_service
        .generate_script_recommendations(&context, &audience)
        .await?;

    Ok(recommendations)
}

#[tauri::command]
async fn get_ai_status(state: State<'_, SharedAppState>) -> Result<serde_json::Value, String> {
    let app_state = state.read().await;

    let is_configured = app_state.ai_config.is_some();
    let provider = app_state
        .ai_config
        .as_ref()
        .map(|c| match c.provider {
            AIProvider::ChatGPT => "chatgpt",
            AIProvider::Claude => "claude",
            AIProvider::Gemini => "gemini",
        })
        .unwrap_or("none");

    let has_target_audience = app_state.target_audience.is_some();
    let chat_buffer_size = app_state.chat_buffer.len();

    Ok(serde_json::json!({
        "configured": is_configured,
        "provider": provider,
        "has_target_audience": has_target_audience,
        "chat_buffer_size": chat_buffer_size
    }))
}

// 초기 상태 생성
fn create_initial_state() -> SharedAppState {
    Arc::new(RwLock::new(AppState {
        connection_state: ChzzkState::Disconnected,
        chat_instance: None,
        ai_config: None,
        ai_service: None,
        chat_buffer: VecDeque::with_capacity(100),
        target_audience: None,
        last_context_analysis: None,
        playlist: PlaylistState::new(),
        command_parser: CommandParser::new(CommandConfig::default()),
        youtube_service: YouTubeService::new(),
    }))
}

// Process playlist command
async fn process_playlist_command(
    query: String,
    username: String,
    state: SharedAppState,
    app_handle: AppHandle,
) -> Result<(), String> {
    // Check if query is a YouTube URL
    if playlist::is_youtube_url(&query) {
        // Extract video ID
        if let Some(video_id) = playlist::extract_youtube_id(&query) {
            // Get video info
            let video_info = {
                let app_state = state.read().await;
                app_state
                    .youtube_service
                    .get_video_info_oembed(&video_id)
                    .await
            };

            match video_info {
                Ok(video) => {
                    // Add to playlist
                    let item = PlaylistItem {
                        id: uuid::Uuid::new_v4().to_string(),
                        video_id: video.video_id,
                        title: video.title,
                        channel: video.channel,
                        duration: video.duration,
                        thumbnail: video.thumbnail,
                        url: video.url,
                        added_by: username,
                        added_at: chrono::Utc::now().timestamp(),
                    };

                    let mut app_state = state.write().await;
                    app_state.playlist.add_item(item.clone());

                    // Emit event
                    app_handle
                        .emit("playlist:added", &item)
                        .map_err(|e| e.to_string())?;
                    app_handle
                        .emit("playlist:updated", &app_state.playlist)
                        .map_err(|e| e.to_string())?;

                    Ok(())
                }
                Err(e) => Err(format!("Failed to get video info: {}", e)),
            }
        } else {
            Err("Invalid YouTube URL".to_string())
        }
    } else {
        // Search YouTube
        let search_results = {
            let app_state = state.read().await;
            app_state.youtube_service.search(&query, 1).await
        };

        match search_results {
            Ok(results) => {
                if let Some(video) = results.videos.first() {
                    // Add first result to playlist
                    let item = PlaylistItem {
                        id: uuid::Uuid::new_v4().to_string(),
                        video_id: video.video_id.clone(),
                        title: video.title.clone(),
                        channel: video.channel.clone(),
                        duration: video.duration.clone(),
                        thumbnail: video.thumbnail.clone(),
                        url: video.url.clone(),
                        added_by: username,
                        added_at: chrono::Utc::now().timestamp(),
                    };

                    let mut app_state = state.write().await;
                    app_state.playlist.add_item(item.clone());

                    // Emit event
                    app_handle
                        .emit("playlist:added", &item)
                        .map_err(|e| e.to_string())?;
                    app_handle
                        .emit("playlist:updated", &app_state.playlist)
                        .map_err(|e| e.to_string())?;

                    Ok(())
                } else {
                    Err("No search results found".to_string())
                }
            }
            Err(e) => Err(format!("Search failed: {}", e)),
        }
    }
}

// Playlist control commands
#[tauri::command]
async fn get_playlist(state: State<'_, SharedAppState>) -> Result<PlaylistState, String> {
    let app_state = state.read().await;
    Ok(app_state.playlist.clone())
}

#[tauri::command]
async fn move_playlist_item(
    from: usize,
    to: usize,
    state: State<'_, SharedAppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.write().await;
    app_state.playlist.move_item(from, to)?;
    app_handle
        .emit("playlist:updated", &app_state.playlist)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn remove_playlist_item(
    index: usize,
    state: State<'_, SharedAppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.write().await;
    app_state.playlist.remove_item(index);
    app_handle
        .emit("playlist:updated", &app_state.playlist)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn play_at_index(
    index: usize,
    state: State<'_, SharedAppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.write().await;
    if let Some(item) = app_state.playlist.play_at(index) {
        app_handle
            .emit("playlist:play", item)
            .map_err(|e| e.to_string())?;
        app_handle
            .emit("playlist:updated", &app_state.playlist)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Invalid playlist index".to_string())
    }
}

async fn skip_to_next(state: SharedAppState, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.write().await;
    if let Some(item) = app_state.playlist.next() {
        app_handle
            .emit("playlist:play", item)
            .map_err(|e| e.to_string())?;
        app_handle
            .emit("playlist:updated", &app_state.playlist)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No next item in playlist".to_string())
    }
}

async fn go_to_previous(state: SharedAppState, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.write().await;
    if let Some(item) = app_state.playlist.previous() {
        app_handle
            .emit("playlist:play", item)
            .map_err(|e| e.to_string())?;
        app_handle
            .emit("playlist:updated", &app_state.playlist)
            .map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("No previous item in playlist".to_string())
    }
}

async fn pause_playback(state: SharedAppState, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.write().await;
    app_state.playlist.is_playing = false;
    app_handle
        .emit("playlist:pause", ())
        .map_err(|e| e.to_string())?;
    app_handle
        .emit("playlist:updated", &app_state.playlist)
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn resume_playback(state: SharedAppState, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.write().await;
    app_state.playlist.is_playing = true;
    app_handle
        .emit("playlist:resume", ())
        .map_err(|e| e.to_string())?;
    app_handle
        .emit("playlist:updated", &app_state.playlist)
        .map_err(|e| e.to_string())?;
    Ok(())
}

async fn clear_playlist(state: SharedAppState, app_handle: AppHandle) -> Result<(), String> {
    let mut app_state = state.write().await;
    app_state.playlist.clear();
    app_handle
        .emit("playlist:cleared", ())
        .map_err(|e| e.to_string())?;
    app_handle
        .emit("playlist:updated", &app_state.playlist)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn set_autoplay(
    enabled: bool,
    state: State<'_, SharedAppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    let mut app_state = state.write().await;
    app_state.playlist.set_autoplay(enabled);
    app_handle
        .emit("playlist:updated", &app_state.playlist)
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn get_command_config(state: State<'_, SharedAppState>) -> Result<CommandConfig, String> {
    let _app_state = state.read().await;
    Ok(CommandConfig::default()) // Return default config for now
}

#[tauri::command]
async fn update_command_config(
    config: CommandConfig,
    state: State<'_, SharedAppState>,
) -> Result<(), String> {
    let mut app_state = state.write().await;
    app_state.command_parser.update_config(config);
    Ok(())
}

#[tauri::command]
async fn add_to_playlist_direct(
    query: String,
    state: State<'_, SharedAppState>,
    app_handle: AppHandle,
) -> Result<String, String> {
    // Use "App User" as the username for direct additions
    process_playlist_command(
        query,
        "App User".to_string(),
        state.inner().clone(),
        app_handle,
    )
    .await?;
    Ok("Successfully added to playlist".to_string())
}

#[tauri::command]
async fn search_youtube(
    query: String,
    limit: usize,
    state: State<'_, SharedAppState>,
) -> Result<Vec<youtube::YouTubeVideo>, String> {
    if query.trim().is_empty() {
        return Err("Search query cannot be empty".to_string());
    }

    let app_state = state.read().await;
    let results = app_state.youtube_service.search(&query, limit).await?;

    Ok(results.videos)
}

#[tauri::command]
async fn skip_to_next_command(
    state: State<'_, SharedAppState>,
    app_handle: AppHandle,
) -> Result<(), String> {
    skip_to_next(state.inner().clone(), app_handle).await
}

// 앱 빌더 함수
fn build_app() -> tauri::Builder<tauri::Wry> {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(create_initial_state())
        .invoke_handler(tauri::generate_handler![
            connect_chzzk_chat,
            disconnect_chzzk_chat,
            is_chzzk_connected,
            get_chzzk_state,
            configure_ai,
            set_target_audience,
            add_chat_message,
            analyze_chat_context,
            get_script_recommendations,
            get_ai_status,
            get_playlist,
            move_playlist_item,
            remove_playlist_item,
            play_at_index,
            set_autoplay,
            get_command_config,
            update_command_config,
            add_to_playlist_direct,
            search_youtube,
            skip_to_next_command
        ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    build_app()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
