mod chzzk;

use chzzk::ChzzkChat;
use std::sync::Arc;
use tauri::{AppHandle, State};
use tokio::sync::RwLock;

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

// 초기 상태 생성
fn create_initial_state() -> SharedAppState {
    Arc::new(RwLock::new(AppState {
        connection_state: ChzzkState::Disconnected,
        chat_instance: None,
    }))
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
            get_chzzk_state
        ])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    build_app()
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
