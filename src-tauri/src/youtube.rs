use regex::Regex;
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YouTubeVideo {
    pub video_id: String,
    pub title: String,
    pub channel: String,
    pub duration: Option<String>,
    pub thumbnail: Option<String>,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YouTubeSearchResult {
    pub videos: Vec<YouTubeVideo>,
}

pub struct YouTubeService {
    client: reqwest::Client,
}

impl YouTubeService {
    pub fn new() -> Self {
        Self {
            client: reqwest::Client::builder()
                .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
                .build()
                .unwrap_or_default(),
        }
    }

    // Search YouTube using the search page
    pub async fn search(&self, query: &str, limit: usize) -> Result<YouTubeSearchResult, String> {
        let encoded_query = urlencoding::encode(query);
        let search_url = format!(
            "https://www.youtube.com/results?search_query={}",
            encoded_query
        );

        let response = self
            .client
            .get(&search_url)
            .send()
            .await
            .map_err(|e| format!("Failed to search YouTube: {}", e))?;

        let html = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        let videos = self.parse_search_results(&html, limit)?;

        Ok(YouTubeSearchResult { videos })
    }

    // Get video metadata from video ID
    pub async fn get_video_info(&self, video_id: &str) -> Result<YouTubeVideo, String> {
        let video_url = format!("https://www.youtube.com/watch?v={}", video_id);

        let response = self
            .client
            .get(&video_url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch video info: {}", e))?;

        let html = response
            .text()
            .await
            .map_err(|e| format!("Failed to read response: {}", e))?;

        self.parse_video_info(&html, video_id)
    }

    // Parse search results from YouTube search page HTML
    fn parse_search_results(&self, html: &str, limit: usize) -> Result<Vec<YouTubeVideo>, String> {
        let mut videos = Vec::new();

        // Find initial data JSON in the HTML
        if let Some(start) = html.find("var ytInitialData = ") {
            let json_start = start + 20;
            if let Some(end) = html[json_start..].find(";</script>") {
                let json_str = &html[json_start..json_start + end];

                // Use regex to find video renderers
                let video_id_regex = Regex::new(r#""videoId":"([^"]+)""#).unwrap();
                let title_regex = Regex::new(r#""title":\{"runs":\[\{"text":"([^"]+)""#).unwrap();
                let channel_regex =
                    Regex::new(r#""longBylineText":\{"runs":\[\{"text":"([^"]+)""#).unwrap();
                let duration_regex =
                    Regex::new(r#""lengthText":\{"simpleText":"([^"]+)""#).unwrap();
                let thumbnail_regex =
                    Regex::new(r#""thumbnail":\{"thumbnails":\[\{"url":"([^"]+)""#).unwrap();

                // Find all video IDs
                for cap in video_id_regex.captures_iter(json_str).take(limit) {
                    if let Some(video_id) = cap.get(1) {
                        let video_id_str = video_id.as_str().to_string();

                        // Try to find corresponding title, channel, etc.
                        let title = title_regex
                            .captures(json_str)
                            .and_then(|c| c.get(1))
                            .map(|m| self.decode_unicode_escapes(m.as_str()))
                            .unwrap_or_else(|| "Unknown Title".to_string());

                        let channel = channel_regex
                            .captures(json_str)
                            .and_then(|c| c.get(1))
                            .map(|m| self.decode_unicode_escapes(m.as_str()))
                            .unwrap_or_else(|| "Unknown Channel".to_string());

                        let duration = duration_regex
                            .captures(json_str)
                            .and_then(|c| c.get(1))
                            .map(|m| m.as_str().to_string());

                        let thumbnail = thumbnail_regex
                            .captures(json_str)
                            .and_then(|c| c.get(1))
                            .map(|m| m.as_str().to_string());

                        videos.push(YouTubeVideo {
                            video_id: video_id_str.clone(),
                            title,
                            channel,
                            duration,
                            thumbnail,
                            url: format!("https://www.youtube.com/watch?v={}", video_id_str),
                        });
                    }
                }
            }
        }

        if videos.is_empty() {
            // Fallback: try to parse using simple regex patterns
            let video_pattern = Regex::new(r#"/watch\?v=([a-zA-Z0-9_-]{11})"#).unwrap();

            for cap in video_pattern.captures_iter(html).take(limit) {
                if let Some(video_id) = cap.get(1) {
                    let video_id_str = video_id.as_str().to_string();
                    videos.push(YouTubeVideo {
                        video_id: video_id_str.clone(),
                        title: format!("Video {}", video_id_str),
                        channel: "Unknown".to_string(),
                        duration: None,
                        thumbnail: Some(format!(
                            "https://img.youtube.com/vi/{}/mqdefault.jpg",
                            video_id_str
                        )),
                        url: format!("https://www.youtube.com/watch?v={}", video_id_str),
                    });
                }
            }
        }

        if videos.is_empty() {
            Err("No videos found".to_string())
        } else {
            Ok(videos)
        }
    }

    // Parse video info from video page HTML
    fn parse_video_info(&self, html: &str, video_id: &str) -> Result<YouTubeVideo, String> {
        // Try to extract title
        let title = if let Some(start) = html.find(r#"<title>"#) {
            let title_start = start + 7;
            if let Some(end) = html[title_start..].find("</title>") {
                html[title_start..title_start + end]
                    .replace(" - YouTube", "")
                    .trim()
                    .to_string()
            } else {
                "Unknown Title".to_string()
            }
        } else {
            "Unknown Title".to_string()
        };

        // Try to extract channel name
        let channel_regex = Regex::new(r#""author":"([^"]+)""#).unwrap();
        let channel = channel_regex
            .captures(html)
            .and_then(|c| c.get(1))
            .map(|m| self.decode_unicode_escapes(m.as_str()))
            .unwrap_or_else(|| "Unknown Channel".to_string());

        // Try to extract duration
        let duration_regex = Regex::new(r#""lengthSeconds":"(\d+)""#).unwrap();
        let duration = duration_regex
            .captures(html)
            .and_then(|c| c.get(1))
            .and_then(|m| m.as_str().parse::<u64>().ok())
            .map(|seconds| {
                let minutes = seconds / 60;
                let secs = seconds % 60;
                format!("{}:{:02}", minutes, secs)
            });

        let thumbnail = Some(format!(
            "https://img.youtube.com/vi/{}/maxresdefault.jpg",
            video_id
        ));

        Ok(YouTubeVideo {
            video_id: video_id.to_string(),
            title,
            channel,
            duration,
            thumbnail,
            url: format!("https://www.youtube.com/watch?v={}", video_id),
        })
    }

    // Decode unicode escapes in strings
    fn decode_unicode_escapes(&self, s: &str) -> String {
        let unicode_regex = Regex::new(r"\\u([0-9a-fA-F]{4})").unwrap();
        let mut result = s.to_string();

        for cap in unicode_regex.captures_iter(s) {
            if let Some(hex_match) = cap.get(1) {
                if let Ok(code_point) = u32::from_str_radix(hex_match.as_str(), 16) {
                    if let Some(ch) = char::from_u32(code_point) {
                        result = result.replace(&cap[0], &ch.to_string());
                    }
                }
            }
        }

        result
    }

    // Alternative method using oembed API (more reliable but limited info)
    pub async fn get_video_info_oembed(&self, video_id: &str) -> Result<YouTubeVideo, String> {
        let oembed_url = format!(
            "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={}&format=json",
            video_id
        );

        let response = self
            .client
            .get(&oembed_url)
            .send()
            .await
            .map_err(|e| format!("Failed to fetch oembed data: {}", e))?;

        let oembed_data: serde_json::Value = response
            .json()
            .await
            .map_err(|e| format!("Failed to parse oembed data: {}", e))?;

        let title = oembed_data["title"]
            .as_str()
            .unwrap_or("Unknown Title")
            .to_string();

        let channel = oembed_data["author_name"]
            .as_str()
            .unwrap_or("Unknown Channel")
            .to_string();

        let thumbnail = oembed_data["thumbnail_url"].as_str().map(|s| s.to_string());

        Ok(YouTubeVideo {
            video_id: video_id.to_string(),
            title,
            channel,
            duration: None, // oembed doesn't provide duration
            thumbnail,
            url: format!("https://www.youtube.com/watch?v={}", video_id),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_youtube_service() {
        let service = YouTubeService::new();

        // Test search
        let result = service.search("rust programming", 5).await;
        assert!(result.is_ok());

        if let Ok(search_result) = result {
            assert!(!search_result.videos.is_empty());
            println!("Found {} videos", search_result.videos.len());

            for video in &search_result.videos {
                println!("{}: {} by {}", video.video_id, video.title, video.channel);
            }
        }
    }

    #[test]
    fn test_unicode_decode() {
        let service = YouTubeService::new();
        let encoded = r"Test \u0048\u0065\u006c\u006c\u006f";
        let decoded = service.decode_unicode_escapes(encoded);
        assert_eq!(decoded, "Test Hello");
    }
}
