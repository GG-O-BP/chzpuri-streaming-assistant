use reqwest;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, SystemTime};
use tokio::time::sleep;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum AIProvider {
    ChatGPT,
    Claude,
    Gemini,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TargetAudience {
    pub age_range: String,
    pub gender: String,
    pub interests: Vec<String>,
    pub content_type: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChatMessage {
    pub username: String,
    pub message: String,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ContextAnalysis {
    pub summary: String,
    pub main_topics: Vec<String>,
    pub sentiment: String,
    pub key_questions: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScriptRecommendation {
    pub scripts: Vec<String>,
    pub context_based: bool,
    pub audience_aligned: bool,
}

#[derive(Clone)]
struct CacheEntry {
    response: String,
    timestamp: SystemTime,
}

#[derive(Clone)]
pub struct AIService {
    provider: AIProvider,
    api_key: String,
    client: reqwest::Client,
    cache: HashMap<String, CacheEntry>,
    cache_duration: Duration,
    max_retries: u32,
    retry_delay: Duration,
}

impl AIService {
    pub fn new(provider: AIProvider, api_key: String) -> Self {
        Self {
            provider,
            api_key,
            client: reqwest::Client::new(),
            cache: HashMap::new(),
            cache_duration: Duration::from_secs(300), // 5 minutes cache
            max_retries: 3,
            retry_delay: Duration::from_secs(2),
        }
    }

    fn generate_cache_key(&self, prefix: &str, content: &str) -> String {
        format!("{}:{}", prefix, &content[..content.len().min(100)])
    }

    fn get_cached_response(&self, key: &str) -> Option<String> {
        if let Some(entry) = self.cache.get(key) {
            if let Ok(elapsed) = entry.timestamp.elapsed() {
                if elapsed < self.cache_duration {
                    return Some(entry.response.clone());
                }
            }
        }
        None
    }

    fn cache_response(&mut self, key: String, response: String) {
        self.cache.insert(
            key,
            CacheEntry {
                response,
                timestamp: SystemTime::now(),
            },
        );
    }

    pub async fn analyze_context(
        &mut self,
        messages: Vec<ChatMessage>,
    ) -> Result<ContextAnalysis, String> {
        let prompt = self.build_context_analysis_prompt(&messages);
        let cache_key = self.generate_cache_key("context", &prompt);

        // Check cache first
        if let Some(cached_response) = self.get_cached_response(&cache_key) {
            return self.parse_context_analysis(&cached_response);
        }

        let response = self.send_request(prompt).await?;

        // Cache the response
        self.cache_response(cache_key, response.clone());

        self.parse_context_analysis(&response)
    }

    pub async fn generate_script_recommendations(
        &mut self,
        context: &ContextAnalysis,
        audience: &TargetAudience,
    ) -> Result<ScriptRecommendation, String> {
        let prompt = self.build_script_prompt(context, audience);
        let cache_key = self.generate_cache_key("script", &prompt);

        // Check cache first
        if let Some(cached_response) = self.get_cached_response(&cache_key) {
            return self.parse_script_recommendations(&cached_response);
        }

        let response = self.send_request(prompt).await?;

        // Cache the response
        self.cache_response(cache_key, response.clone());

        self.parse_script_recommendations(&response)
    }

    async fn send_request(&self, prompt: String) -> Result<String, String> {
        let mut last_error = String::new();

        for attempt in 0..self.max_retries {
            if attempt > 0 {
                sleep(self.retry_delay * attempt).await;
            }

            let result = match self.provider {
                AIProvider::ChatGPT => self.send_chatgpt_request(&prompt).await,
                AIProvider::Claude => self.send_claude_request(&prompt).await,
                AIProvider::Gemini => self.send_gemini_request(&prompt).await,
            };

            match result {
                Ok(response) => return Ok(response),
                Err(e) => {
                    last_error = format!("Attempt {} failed: {}", attempt + 1, e);
                    if e.contains("rate limit") || e.contains("429") {
                        // For rate limit errors, wait longer
                        sleep(Duration::from_secs(10)).await;
                    }
                }
            }
        }

        Err(format!(
            "All {} attempts failed. Last error: {}",
            self.max_retries, last_error
        ))
    }

    async fn send_chatgpt_request(&self, prompt: &str) -> Result<String, String> {
        let url = "https://api.openai.com/v1/chat/completions";

        let body = serde_json::json!({
            "model": "gpt-3.5-turbo",
            "messages": [{
                "role": "user",
                "content": prompt
            }],
            "temperature": 0.7,
            "max_tokens": 500
        });

        let response = self
            .client
            .post(url)
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .json(&body)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    "Request timed out after 30 seconds".to_string()
                } else if e.is_connect() {
                    "Failed to connect to OpenAI API".to_string()
                } else {
                    format!("Network error: {}", e)
                }
            })?;

        let status = response.status();
        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(match status.as_u16() {
                401 => "Invalid API key for OpenAI".to_string(),
                429 => "Rate limit exceeded. Please try again later".to_string(),
                500..=599 => format!("OpenAI server error ({}): {}", status, error_body),
                _ => format!("API request failed ({}): {}", status, error_body),
            });
        }

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        result["choices"][0]["message"]["content"]
            .as_str()
            .ok_or("Failed to extract content".to_string())
            .map(|s| s.to_string())
    }

    async fn send_claude_request(&self, prompt: &str) -> Result<String, String> {
        let url = "https://api.anthropic.com/v1/messages";

        let body = serde_json::json!({
            "model": "claude-3-sonnet-20240229",
            "messages": [{
                "role": "user",
                "content": prompt
            }],
            "max_tokens": 500
        });

        let response = self
            .client
            .post(url)
            .header("x-api-key", &self.api_key)
            .header("anthropic-version", "2023-06-01")
            .header("Content-Type", "application/json")
            .json(&body)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    "Request timed out after 30 seconds".to_string()
                } else if e.is_connect() {
                    "Failed to connect to Claude API".to_string()
                } else {
                    format!("Network error: {}", e)
                }
            })?;

        let status = response.status();
        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(match status.as_u16() {
                401 => "Invalid API key for Claude".to_string(),
                429 => "Rate limit exceeded. Please try again later".to_string(),
                500..=599 => format!("Claude server error ({}): {}", status, error_body),
                _ => format!("API request failed ({}): {}", status, error_body),
            });
        }

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        result["content"][0]["text"]
            .as_str()
            .ok_or("Failed to extract content".to_string())
            .map(|s| s.to_string())
    }

    async fn send_gemini_request(&self, prompt: &str) -> Result<String, String> {
        let url = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={}",
            self.api_key
        );

        let body = serde_json::json!({
            "contents": [{
                "parts": [{
                    "text": prompt
                }]
            }],
            "generationConfig": {
                "temperature": 0.7,
                "maxOutputTokens": 500
            }
        });

        let response = self
            .client
            .post(&url)
            .header("Content-Type", "application/json")
            .json(&body)
            .timeout(Duration::from_secs(30))
            .send()
            .await
            .map_err(|e| {
                if e.is_timeout() {
                    "Request timed out after 30 seconds".to_string()
                } else if e.is_connect() {
                    "Failed to connect to Gemini API".to_string()
                } else {
                    format!("Network error: {}", e)
                }
            })?;

        let status = response.status();
        if !status.is_success() {
            let error_body = response
                .text()
                .await
                .unwrap_or_else(|_| "Unknown error".to_string());
            return Err(match status.as_u16() {
                403 => "Invalid API key for Gemini or API not enabled".to_string(),
                429 => "Rate limit exceeded. Please try again later".to_string(),
                500..=599 => format!("Gemini server error ({}): {}", status, error_body),
                _ => format!("API request failed ({}): {}", status, error_body),
            });
        }

        let result: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse response: {}", e))?;

        result["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .ok_or("Failed to extract content".to_string())
            .map(|s| s.to_string())
    }

    fn build_context_analysis_prompt(&self, messages: &[ChatMessage]) -> String {
        let recent_messages: Vec<String> = messages
            .iter()
            .take(20) // 최근 20개 메시지만 분석
            .map(|m| format!("{}: {}", m.username, m.message))
            .collect();

        format!(
            "다음 채팅 메시지들을 분석해주세요:\n\n{}\n\n\
            다음 형식으로 JSON 응답해주세요:\n\
            {{\n\
                \"summary\": \"전체 대화의 간단한 요약\",\n\
                \"main_topics\": [\"주요 주제1\", \"주요 주제2\"],\n\
                \"sentiment\": \"positive/neutral/negative\",\n\
                \"key_questions\": [\"시청자들이 궁금해하는 질문1\", \"질문2\"]\n\
            }}",
            recent_messages.join("\n")
        )
    }

    fn build_script_prompt(&self, context: &ContextAnalysis, audience: &TargetAudience) -> String {
        format!(
            "스트리머를 위한 대화 스크립트를 추천해주세요.\n\n\
            현재 대화 맥락:\n\
            - 요약: {}\n\
            - 주요 주제: {}\n\
            - 분위기: {}\n\
            - 주요 질문: {}\n\n\
            타겟 시청자:\n\
            - 연령대: {}\n\
            - 성별: {}\n\
            - 관심사: {}\n\
            - 컨텐츠 유형: {}\n\n\
            다음 형식으로 JSON 응답해주세요:\n\
            {{\n\
                \"scripts\": [\n\
                    \"추천 대사 1\",\n\
                    \"추천 대사 2\",\n\
                    \"추천 대사 3\"\n\
                ],\n\
                \"context_based\": true,\n\
                \"audience_aligned\": true\n\
            }}",
            context.summary,
            context.main_topics.join(", "),
            context.sentiment,
            context.key_questions.join(", "),
            audience.age_range,
            audience.gender,
            audience.interests.join(", "),
            audience.content_type
        )
    }

    fn parse_context_analysis(&self, response: &str) -> Result<ContextAnalysis, String> {
        // Try to extract JSON from the response (sometimes AI adds extra text)
        let json_start = response.find('{');
        let json_end = response.rfind('}');

        if let (Some(start), Some(end)) = (json_start, json_end) {
            let json_str = &response[start..=end];
            serde_json::from_str(json_str).map_err(|e| {
                format!(
                    "Failed to parse context analysis JSON: {}. Response: {}",
                    e, response
                )
            })
        } else {
            Err(format!("No valid JSON found in response: {}", response))
        }
    }

    fn parse_script_recommendations(&self, response: &str) -> Result<ScriptRecommendation, String> {
        // Try to extract JSON from the response (sometimes AI adds extra text)
        let json_start = response.find('{');
        let json_end = response.rfind('}');

        if let (Some(start), Some(end)) = (json_start, json_end) {
            let json_str = &response[start..=end];
            serde_json::from_str(json_str).map_err(|e| {
                format!(
                    "Failed to parse script recommendations JSON: {}. Response: {}",
                    e, response
                )
            })
        } else {
            Err(format!("No valid JSON found in response: {}", response))
        }
    }
}

// AI 설정 관리
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AIConfig {
    pub provider: AIProvider,
    pub api_key: String,
    pub enabled: bool,
}

impl Default for AIConfig {
    fn default() -> Self {
        Self {
            provider: AIProvider::ChatGPT,
            api_key: String::new(),
            enabled: false,
        }
    }
}
