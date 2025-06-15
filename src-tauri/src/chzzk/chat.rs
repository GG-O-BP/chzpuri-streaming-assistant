use crate::chzzk::types::*;
use futures_util::{SinkExt, StreamExt};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, Mutex};
use tokio::task::JoinHandle;
use tokio_tungstenite::{connect_async, tungstenite::Message};
use url::Url;

pub struct ChzzkChat {
    channel_id: String,
    chat_channel_id: Option<String>,
    access_token: Option<String>,
    app_handle: AppHandle,
    is_connected: Arc<Mutex<bool>>,
    ws_task: Arc<Mutex<Option<JoinHandle<()>>>>,
    ping_task: Arc<Mutex<Option<JoinHandle<()>>>>,
    close_tx: Arc<Mutex<Option<mpsc::Sender<()>>>>,
}

impl ChzzkChat {
    pub fn new(channel_id: String, app_handle: AppHandle) -> Self {
        Self {
            channel_id,
            chat_channel_id: None,
            access_token: None,
            app_handle,
            is_connected: Arc::new(Mutex::new(false)),
            ws_task: Arc::new(Mutex::new(None)),
            ping_task: Arc::new(Mutex::new(None)),
            close_tx: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn connect(&mut self) -> Result<(), Box<dyn std::error::Error>> {
        println!("Connecting to channel: {}", self.channel_id);

        // 먼저 방송 상태를 확인하여 chat_channel_id를 가져옵니다
        let live_status = self.get_live_status().await?;

        println!("Live status: {:?}", live_status.status);

        if live_status.status != "OPEN" {
            return Err("Channel is not live".into());
        }

        self.chat_channel_id = live_status.chat_channel_id;

        if let Some(chat_channel_id) = &self.chat_channel_id {
            // 채팅 접속 토큰을 가져옵니다
            let token_response = self.get_chat_access_token(chat_channel_id).await?;
            self.access_token = Some(token_response.access_token);

            // WebSocket 연결을 시작합니다
            self.connect_websocket().await?;
        } else {
            return Err("No chat channel ID available".into());
        }

        Ok(())
    }

    async fn get_live_status(&self) -> Result<LiveStatus, Box<dyn std::error::Error>> {
        // v1과 v2 둘 다 시도해봅니다
        let urls = vec![
            format!(
                "https://api.chzzk.naver.com/polling/v2/channels/{}/live-status",
                self.channel_id
            ),
            format!(
                "https://api.chzzk.naver.com/polling/v1/channels/{}/live-status",
                self.channel_id
            ),
            format!(
                "https://api.chzzk.naver.com/service/v2/channels/{}/live-detail",
                self.channel_id
            ),
        ];

        let client = reqwest::Client::new();

        for url in urls {
            println!("Fetching live status from: {}", url);

            let response = client
                .get(&url)
                .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                .header("Accept", "application/json")
                .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
                .header("Referer", "https://chzzk.naver.com/")
                .header("Origin", "https://chzzk.naver.com")
                .send()
                .await?;

            let status = response.status();
            println!("Response status: {}", status);

            if status.is_success() {
                let data: serde_json::Value = response.json().await?;
                println!("Response data: {}", serde_json::to_string_pretty(&data)?);

                if let Some(content) = data.get("content") {
                    return Ok(serde_json::from_value(content.clone())?);
                } else {
                    // content가 없으면 전체 데이터를 파싱 시도
                    return Ok(serde_json::from_value(data)?);
                }
            } else {
                let error_text = response.text().await?;
                println!("Error response from {}: {}", url, error_text);
            }
        }

        Err("Failed to get live status from all endpoints".into())
    }

    pub async fn get_chat_access_token(
        &self,
        chat_channel_id: &str,
    ) -> Result<ChatAccessToken, Box<dyn std::error::Error>> {
        let url = format!(
            "https://comm-api.game.naver.com/nng_main/v1/chats/access-token?channelId={}&chatType=STREAMING",
            chat_channel_id
        );

        println!("Fetching chat access token from: {}", url);

        let client = reqwest::Client::new();
        let response = client
            .get(&url)
            .header("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
            .header("Accept", "application/json")
            .header("Accept-Language", "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7")
            .header("Referer", "https://chzzk.naver.com/")
            .header("Origin", "https://chzzk.naver.com")
            .send()
            .await?;

        let status = response.status();
        println!("Response status: {}", status);

        if !status.is_success() {
            let error_text = response.text().await?;
            println!("Error response: {}", error_text);
            return Err(format!("HTTP {}: {}", status, error_text).into());
        }

        let data: serde_json::Value = response.json().await?;
        println!("Response data: {}", serde_json::to_string_pretty(&data)?);

        let content = data["content"].clone();

        Ok(serde_json::from_value(content)?)
    }

    async fn connect_websocket(&self) -> Result<(), Box<dyn std::error::Error>> {
        let chat_channel_id = self.chat_channel_id.as_ref().unwrap();
        let access_token = self.access_token.as_ref().unwrap();

        // 치지직 채팅은 특별한 WebSocket URL 형식을 사용합니다
        // 서버 번호를 1-10 중에서 선택
        let server_id = (chat_channel_id.chars().next().unwrap_or('1') as u8 % 10 + 1) as u8;

        // 작동하는 WebSocket URL 형식 사용 (쿼리 파라미터 형식)
        let ws_url = format!(
            "wss://kr-ss{}.chat.naver.com/chat?cid={}&at={}",
            server_id,
            chat_channel_id,
            urlencoding::encode(access_token)
        );

        println!("Chat channel ID: {}", chat_channel_id);
        println!(
            "Access token (first 20 chars): {}...",
            &access_token[..20.min(access_token.len())]
        );

        println!("Connecting to WebSocket URL: {}", ws_url);

        match Url::parse(&ws_url) {
            Ok(url) => match connect_async(url).await {
                Ok((ws_stream, _)) => {
                    println!("Successfully connected to WebSocket!");

                    let (mut write, mut read) = ws_stream.split();

                    // 연결 성공 이벤트 발생
                    self.app_handle
                        .emit("chzzk-chat-event", ChatEvent::Connected)?;
                    *self.is_connected.lock().await = true;

                    // 초기 연결 메시지 전송
                    let connect_msg = serde_json::json!({
                        "ver": "2",
                        "cmd": 100,
                        "svcid": "game",
                        "cid": chat_channel_id,
                        "bdy": {
                            "uid": null,
                            "devType": 2001,
                            "accTkn": access_token,
                            "auth": "READ"
                        },
                        "tid": 1
                    });

                    println!("Sending connect message: {}", connect_msg);
                    write.send(Message::Text(connect_msg.to_string())).await?;

                    // 핑 메시지 전송을 위한 채널
                    let (ping_tx, mut ping_rx) = mpsc::channel::<String>(10);
                    // 종료 메시지 전송을 위한 채널
                    let (close_tx, mut close_rx) = mpsc::channel::<()>(1);

                    // 핑 메시지 전송을 위한 태스크
                    let is_connected = self.is_connected.clone();
                    let ping_handle = tokio::spawn(async move {
                        let mut interval =
                            tokio::time::interval(tokio::time::Duration::from_secs(20));
                        loop {
                            interval.tick().await;
                            if !*is_connected.lock().await {
                                break;
                            }
                            // PING 메시지 전송
                            let ping_msg = serde_json::json!({
                                "ver": "2",
                                "cmd": 0,
                                "tid": 2
                            });
                            if let Err(e) = ping_tx.send(ping_msg.to_string()).await {
                                println!("Failed to queue ping: {}", e);
                                break;
                            }
                            println!("Queued PING");
                        }
                    });

                    // 태스크 핸들 먼저 저장
                    *self.ping_task.lock().await = Some(ping_handle);

                    // 종료 채널을 disconnect에서 사용할 수 있도록 저장
                    *self.close_tx.lock().await = Some(close_tx);

                    // 메시지 수신 루프
                    let app_handle = self.app_handle.clone();
                    let is_connected_clone = self.is_connected.clone();

                    let ws_handle = tokio::spawn(async move {
                        loop {
                            tokio::select! {
                                // WebSocket 메시지 수신
                                Some(msg) = read.next() => {
                                    match msg {
                                        Ok(Message::Text(text)) => {
                                    println!("Received message: {}", text);
                                    if let Ok(json_msg) =
                                        serde_json::from_str::<serde_json::Value>(&text)
                                    {
                                        // 메시지 타입에 따라 처리
                                        let cmd = json_msg["cmd"].as_i64().unwrap_or(0);
                                        match cmd {
                                            0 => {
                                                // PONG 응답
                                                println!("Received PONG");
                                            }
                                            93101 => {
                                                // 채팅 메시지
                                                println!("Processing chat message");
                                                let body = if json_msg.get("bdy").is_some() {
                                                    json_msg["bdy"].clone()
                                                } else {
                                                    continue;
                                                };

                                                if let Ok(messages) = serde_json::from_value::<
                                                    Vec<serde_json::Value>,
                                                >(body) {
                                                    for msg in messages {
                                                        // Parse profile JSON string
                                                        if let (Some(profile_str), Some(msg_text), Some(msg_time)) = (
                                                            msg.get("profile").and_then(|p| p.as_str()),
                                                            msg.get("msg").and_then(|m| m.as_str()),
                                                            msg.get("msgTime").and_then(|t| t.as_i64()),
                                                        ) {
                                                            if let Ok(profile) = serde_json::from_str::<crate::chzzk::types::ChatProfile>(profile_str) {
                                                                // Create simplified chat message for frontend
                                                                let chat_event = ChatMessage {
                                                                    uid: msg.get("uid").and_then(|u| u.as_str()).unwrap_or("").to_string(),
                                                                    msg_time,
                                                                    profile: profile_str.to_string(),
                                                                    msg: msg_text.to_string(),
                                                                    msg_type_code: msg.get("msgTypeCode").and_then(|t| t.as_i64()).unwrap_or(0) as i32,
                                                                    msg_status_type: msg.get("msgStatusType").and_then(|s| s.as_str()).unwrap_or("").to_string(),
                                                                    extras: msg.get("extras").and_then(|e| e.as_str()).unwrap_or("{}").to_string(),
                                                                    ctime: msg.get("ctime").and_then(|c| c.as_i64()).unwrap_or(0),
                                                                    utime: msg.get("utime").and_then(|u| u.as_i64()).unwrap_or(0),
                                                                    msg_tid: msg.get("msgTid").and_then(|t| t.as_str()).map(|s| s.to_string()),
                                                                    svcid: msg.get("svcid").and_then(|s| s.as_str()).unwrap_or("").to_string(),
                                                                    cid: msg.get("cid").and_then(|c| c.as_str()).unwrap_or("").to_string(),
                                                                    mbr_cnt: msg.get("mbrCnt").and_then(|m| m.as_i64()).unwrap_or(0) as i32,
                                                                };

                                                                // Emit with parsed profile for easier frontend use
                                                                let _ = app_handle.emit(
                                                                    "chzzk-chat-event",
                                                                    serde_json::json!({
                                                                        "type": "chat",
                                                                        "uid": chat_event.uid,
                                                                        "nickname": profile.nickname,
                                                                        "msg": chat_event.msg,
                                                                        "msgTime": chat_event.msg_time,
                                                                        "profile": profile,
                                                                    }),
                                                                );
                                                                println!("Emitted chat from {}: {}", profile.nickname, msg_text);
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                            93102 => {
                                                // 도네이션 메시지
                                                let body = if json_msg.get("bdy").is_some() {
                                                    json_msg["bdy"].clone()
                                                } else if json_msg.get("body").is_some() {
                                                    json_msg["body"].clone()
                                                } else {
                                                    continue;
                                                };

                                                if let Ok(messages) = serde_json::from_value::<
                                                    Vec<serde_json::Value>,
                                                >(
                                                    body.clone()
                                                ) {
                                                    for msg in messages {
                                                        if let Ok(donation_msg) =
                                                            serde_json::from_value::<DonationMessage>(
                                                                msg,
                                                            )
                                                        {
                                                            let _ = app_handle.emit(
                                                                "chzzk-chat-event",
                                                                ChatEvent::Donation(donation_msg),
                                                            );
                                                        }
                                                    }
                                                } else if let Ok(donation_msg) =
                                                    serde_json::from_value::<DonationMessage>(body)
                                                {
                                                    let _ = app_handle.emit(
                                                        "chzzk-chat-event",
                                                        ChatEvent::Donation(donation_msg),
                                                    );
                                                }
                                            }
                                            94101 | 94102 | 94103 => {
                                                // 시스템 메시지
                                                if let Ok(system_msg) =
                                                    serde_json::from_value::<SystemMessage>(
                                                        json_msg["bdy"][0].clone(),
                                                    )
                                                {
                                                    let _ = app_handle.emit(
                                                        "chzzk-chat-event",
                                                        ChatEvent::SystemMessage(system_msg),
                                                    );
                                                }
                                            }
                                            10000 => {
                                                // PONG 응답 (서버에서 보내는 핑 응답)
                                                println!("Received PONG from server");
                                            }
                                            10100 => {
                                                // 연결 성공 응답
                                                println!("Connection confirmed by server (10100)");
                                                if let Some(bdy) = json_msg.get("bdy") {
                                                    println!("Connection response: {}", bdy);
                                                }
                                            }
                                            _ => {
                                                println!(
                                                    "Unknown command: {} - Full message: {}",
                                                    cmd, text
                                                );
                                            }
                                        }
                                    }
                                }
                                        Ok(Message::Close(_)) => {
                                            *is_connected_clone.lock().await = false;
                                            let _ = app_handle
                                                .emit("chzzk-chat-event", ChatEvent::Disconnected);
                                            break;
                                        }
                                        Err(e) => {
                                            let _ = app_handle.emit(
                                                "chzzk-chat-event",
                                                ChatEvent::Error {
                                                    message: format!("WebSocket error: {}", e),
                                                },
                                            );
                                            *is_connected_clone.lock().await = false;
                                            break;
                                        }
                                        _ => {}
                                    }
                                }
                                // 핑 메시지 전송
                                Some(ping_msg) = ping_rx.recv() => {
                                    if let Err(e) = write.send(Message::Text(ping_msg)).await {
                                        println!("Failed to send ping: {}", e);
                                        *is_connected_clone.lock().await = false;
                                        break;
                                    }
                                    println!("Sent PING");
                                }
                                // 종료 신호 수신
                                Some(_) = close_rx.recv() => {
                                    println!("Received close signal");
                                    if let Err(e) = write.send(Message::Close(None)).await {
                                        println!("Failed to send close frame: {}", e);
                                    }
                                    *is_connected_clone.lock().await = false;
                                    break;
                                }
                            }
                        }
                    });

                    // 태스크 핸들 저장
                    *self.ws_task.lock().await = Some(ws_handle);

                    return Ok(());
                }
                Err(e) => {
                    println!("Failed to connect: {}", e);
                    return Err(format!("Failed to connect to WebSocket: {}", e).into());
                }
            },
            Err(e) => {
                println!("Invalid URL: {}", e);
                return Err(format!("Invalid WebSocket URL: {}", e).into());
            }
        }
    }

    pub async fn disconnect(&mut self) {
        println!("Disconnecting from WebSocket...");

        // 연결 상태를 false로 설정
        *self.is_connected.lock().await = false;

        // WebSocket에 종료 신호 전송
        if let Some(close_tx) = self.close_tx.lock().await.take() {
            let _ = close_tx.send(()).await;
            println!("Sent close signal to WebSocket");
        }

        // WebSocket 태스크 종료
        if let Some(task) = self.ws_task.lock().await.take() {
            task.abort();
            println!("WebSocket task aborted");
        }

        // 핑 태스크 종료
        if let Some(task) = self.ping_task.lock().await.take() {
            task.abort();
            println!("Ping task aborted");
        }

        // 연결 해제 이벤트 발생
        let _ = self
            .app_handle
            .emit("chzzk-chat-event", ChatEvent::Disconnected);

        println!("Disconnected from chat");
    }

    pub async fn is_connected(&self) -> bool {
        *self.is_connected.lock().await
    }
}
