use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistItem {
    pub id: String,
    pub video_id: String,
    pub title: String,
    pub channel: String,
    pub duration: Option<String>,
    pub thumbnail: Option<String>,
    pub url: String,
    pub added_by: String,
    pub added_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlaylistState {
    pub items: VecDeque<PlaylistItem>,
    pub current_index: Option<usize>,
    pub is_playing: bool,
    pub autoplay: bool,
}

impl PlaylistState {
    pub fn new() -> Self {
        Self {
            items: VecDeque::new(),
            current_index: None,
            is_playing: false,
            autoplay: true,
        }
    }

    pub fn add_item(&mut self, item: PlaylistItem) {
        self.items.push_back(item);

        // If this is the first item and nothing is playing, set it as current
        if self.current_index.is_none() && self.items.len() == 1 {
            self.current_index = Some(0);
        }
    }

    pub fn remove_item(&mut self, index: usize) -> Option<PlaylistItem> {
        if index >= self.items.len() {
            return None;
        }

        let removed = self.items.remove(index);

        // Adjust current_index if necessary
        if let Some(current) = self.current_index {
            if index < current {
                self.current_index = Some(current - 1);
            } else if index == current {
                // If we removed the current item
                if self.items.is_empty() {
                    self.current_index = None;
                    self.is_playing = false;
                } else if current >= self.items.len() {
                    self.current_index = Some(self.items.len() - 1);
                }
            }
        }

        removed
    }

    pub fn move_item(&mut self, from: usize, to: usize) -> Result<(), String> {
        let len = self.items.len();
        if from >= len || to >= len {
            return Err("Index out of bounds".to_string());
        }

        if from == to {
            return Ok(());
        }

        // Remove item from original position
        if let Some(item) = self.items.remove(from) {
            // Insert at new position
            self.items.insert(to, item);

            // Update current_index if affected
            if let Some(current) = self.current_index {
                self.current_index = Some(if current == from {
                    to
                } else if from < current && to >= current {
                    current - 1
                } else if from > current && to <= current {
                    current + 1
                } else {
                    current
                });
            }
        }

        Ok(())
    }

    pub fn next(&mut self) -> Option<&PlaylistItem> {
        if self.items.is_empty() {
            return None;
        }

        match self.current_index {
            Some(current) => {
                if current + 1 < self.items.len() {
                    self.current_index = Some(current + 1);
                    self.items.get(current + 1)
                } else if self.autoplay {
                    // Loop back to beginning
                    self.current_index = Some(0);
                    self.items.get(0)
                } else {
                    None
                }
            }
            None => {
                if !self.items.is_empty() {
                    self.current_index = Some(0);
                    self.items.get(0)
                } else {
                    None
                }
            }
        }
    }

    pub fn previous(&mut self) -> Option<&PlaylistItem> {
        if self.items.is_empty() {
            return None;
        }

        match self.current_index {
            Some(current) => {
                if current > 0 {
                    self.current_index = Some(current - 1);
                    self.items.get(current - 1)
                } else if self.autoplay {
                    // Loop to end
                    let last_index = self.items.len() - 1;
                    self.current_index = Some(last_index);
                    self.items.get(last_index)
                } else {
                    None
                }
            }
            None => None,
        }
    }

    pub fn play_at(&mut self, index: usize) -> Option<&PlaylistItem> {
        if index < self.items.len() {
            self.current_index = Some(index);
            self.is_playing = true;
            self.items.get(index)
        } else {
            None
        }
    }

    pub fn get_current(&self) -> Option<&PlaylistItem> {
        self.current_index.and_then(|idx| self.items.get(idx))
    }

    pub fn clear(&mut self) {
        self.items.clear();
        self.current_index = None;
        self.is_playing = false;
    }

    pub fn set_autoplay(&mut self, enabled: bool) {
        self.autoplay = enabled;
    }
}

// YouTube URL detection and extraction
pub fn is_youtube_url(text: &str) -> bool {
    text.contains("youtube.com/watch?v=")
        || text.contains("youtu.be/")
        || text.contains("youtube.com/shorts/")
        || text.contains("music.youtube.com/watch?v=")
}

pub fn extract_youtube_id(url: &str) -> Option<String> {
    // Handle youtube.com/watch?v=VIDEO_ID format
    if let Some(start) = url.find("watch?v=") {
        let id_start = start + 8;
        let id_end = url[id_start..]
            .find(|c: char| !c.is_alphanumeric() && c != '-' && c != '_')
            .map(|i| id_start + i)
            .unwrap_or(url.len());
        return Some(url[id_start..id_end].to_string());
    }

    // Handle youtu.be/VIDEO_ID format
    if let Some(start) = url.find("youtu.be/") {
        let id_start = start + 9;
        let id_end = url[id_start..]
            .find(|c: char| !c.is_alphanumeric() && c != '-' && c != '_')
            .map(|i| id_start + i)
            .unwrap_or(url.len());
        return Some(url[id_start..id_end].to_string());
    }

    // Handle youtube.com/shorts/VIDEO_ID format
    if let Some(start) = url.find("shorts/") {
        let id_start = start + 7;
        let id_end = url[id_start..]
            .find(|c: char| !c.is_alphanumeric() && c != '-' && c != '_')
            .map(|i| id_start + i)
            .unwrap_or(url.len());
        return Some(url[id_start..id_end].to_string());
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_youtube_url_detection() {
        assert!(is_youtube_url(
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        ));
        assert!(is_youtube_url("https://youtu.be/dQw4w9WgXcQ"));
        assert!(is_youtube_url("https://youtube.com/shorts/abcdefg"));
        assert!(is_youtube_url("https://music.youtube.com/watch?v=xyz123"));
        assert!(!is_youtube_url("https://google.com"));
    }

    #[test]
    fn test_youtube_id_extraction() {
        assert_eq!(
            extract_youtube_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ"),
            Some("dQw4w9WgXcQ".to_string())
        );
        assert_eq!(
            extract_youtube_id("https://youtu.be/dQw4w9WgXcQ"),
            Some("dQw4w9WgXcQ".to_string())
        );
        assert_eq!(
            extract_youtube_id("https://youtube.com/shorts/abcdefg"),
            Some("abcdefg".to_string())
        );
        assert_eq!(
            extract_youtube_id("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=123s"),
            Some("dQw4w9WgXcQ".to_string())
        );
    }
}
