mod chzzk;

use chzzk::ChzzkChat;
use std::sync::Arc;
use tauri::State;
use tokio::sync::Mutex;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

type ChzzkChatState = Arc<Mutex<Option<ChzzkChat>>>;

#[tauri::command]
async fn connect_chzzk_chat(
    channel_id: String,
    app_handle: tauri::AppHandle,
    state: State<'_, ChzzkChatState>,
) -> Result<String, String> {
    let mut chat_state = state.lock().await;

    // 기존 연결이 있다면 끊기
    if let Some(chat) = chat_state.as_mut() {
        chat.disconnect().await;
    }

    // 새로운 채팅 인스턴스 생성
    let mut chat = ChzzkChat::new(channel_id.clone(), app_handle);

    // 연결 시도
    match chat.connect().await {
        Ok(_) => {
            *chat_state = Some(chat);
            Ok(format!("Connected to channel: {}", channel_id))
        }
        Err(e) => Err(format!("Failed to connect: {}", e)),
    }
}

#[tauri::command]
async fn disconnect_chzzk_chat(state: State<'_, ChzzkChatState>) -> Result<String, String> {
    let mut chat_state = state.lock().await;

    if let Some(chat) = chat_state.as_mut() {
        chat.disconnect().await;
        *chat_state = None;
        Ok("Disconnected from chat".to_string())
    } else {
        Err("No active connection".to_string())
    }
}

#[tauri::command]
async fn is_chzzk_connected(state: State<'_, ChzzkChatState>) -> Result<bool, String> {
    let chat_state = state.lock().await;

    if let Some(chat) = chat_state.as_ref() {
        Ok(chat.is_connected().await)
    } else {
        Ok(false)
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(Arc::new(Mutex::new(None::<ChzzkChat>)) as ChzzkChatState)
        .invoke_handler(tauri::generate_handler![
            greet,
            connect_chzzk_chat,
            disconnect_chzzk_chat,
            is_chzzk_connected
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
