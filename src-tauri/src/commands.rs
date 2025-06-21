use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandConfig {
    pub prefix: String,
    pub commands: HashMap<String, CommandDefinition>,
    #[serde(default)]
    pub playlist_limits: PlaylistLimits,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct PlaylistLimits {
    pub user_limit: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandDefinition {
    pub name: String,
    pub aliases: Vec<String>,
    pub description: String,
    pub enabled: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ParsedCommand {
    Playlist { query: String },
    Skip,
    Previous,
    Pause,
    Play,
    Clear,
    Unknown { command: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommandContext {
    pub username: String,
    pub message: String,
    pub timestamp: i64,
}

impl Default for CommandConfig {
    fn default() -> Self {
        let mut commands = HashMap::new();

        commands.insert(
            "playlist".to_string(),
            CommandDefinition {
                name: "playlist".to_string(),
                aliases: vec!["sr".to_string(), "신청곡".to_string()],
                description: "Add a song to the playlist".to_string(),
                enabled: true,
            },
        );

        commands.insert(
            "skip".to_string(),
            CommandDefinition {
                name: "skip".to_string(),
                aliases: vec!["next".to_string(), "다음".to_string()],
                description: "Skip to the next song".to_string(),
                enabled: true,
            },
        );

        commands.insert(
            "previous".to_string(),
            CommandDefinition {
                name: "previous".to_string(),
                aliases: vec!["prev".to_string(), "이전".to_string()],
                description: "Go to the previous song".to_string(),
                enabled: true,
            },
        );

        commands.insert(
            "pause".to_string(),
            CommandDefinition {
                name: "pause".to_string(),
                aliases: vec!["정지".to_string()],
                description: "Pause the current song".to_string(),
                enabled: true,
            },
        );

        commands.insert(
            "clear".to_string(),
            CommandDefinition {
                name: "clear".to_string(),
                aliases: vec!["clearplaylist".to_string(), "초기화".to_string()],
                description: "Clear the playlist".to_string(),
                enabled: true,
            },
        );

        Self {
            prefix: "!".to_string(),
            commands,
            playlist_limits: PlaylistLimits { user_limit: None },
        }
    }
}

pub struct CommandParser {
    config: CommandConfig,
}

impl CommandParser {
    pub fn new(config: CommandConfig) -> Self {
        Self { config }
    }

    pub fn config(&self) -> &CommandConfig {
        &self.config
    }

    pub fn parse(&self, message: &str) -> Option<ParsedCommand> {
        // Check if message starts with command prefix
        if !message.starts_with(&self.config.prefix) {
            return None;
        }

        // Remove prefix and trim
        let without_prefix = message[self.config.prefix.len()..].trim();

        // Split into command and arguments
        let parts: Vec<&str> = without_prefix.splitn(2, ' ').collect();
        if parts.is_empty() {
            return None;
        }

        let command_name = parts[0].to_lowercase();
        let args = parts.get(1).map(|s| s.trim().to_string());

        // Find matching command
        for (_, cmd_def) in &self.config.commands {
            if !cmd_def.enabled {
                continue;
            }

            // Check command name and aliases
            if cmd_def.name == command_name || cmd_def.aliases.contains(&command_name) {
                return match cmd_def.name.as_str() {
                    "playlist" => {
                        if let Some(query) = args {
                            Some(ParsedCommand::Playlist { query })
                        } else {
                            None
                        }
                    }
                    "skip" => Some(ParsedCommand::Skip),
                    "previous" => Some(ParsedCommand::Previous),
                    "pause" => Some(ParsedCommand::Pause),
                    "play" => {
                        if let Some(query) = args {
                            Some(ParsedCommand::Playlist { query })
                        } else {
                            Some(ParsedCommand::Play)
                        }
                    }
                    "clear" => Some(ParsedCommand::Clear),
                    _ => Some(ParsedCommand::Unknown {
                        command: command_name.clone(),
                    }),
                };
            }
        }

        // No matching command found
        Some(ParsedCommand::Unknown {
            command: command_name,
        })
    }

    pub fn is_command(&self, message: &str) -> bool {
        message.starts_with(&self.config.prefix)
    }

    pub fn update_config(&mut self, config: CommandConfig) {
        self.config = config;
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_command_parsing() {
        let parser = CommandParser::new(CommandConfig::default());

        // Test playlist command
        match parser.parse("!playlist https://youtube.com/watch?v=xyz") {
            Some(ParsedCommand::Playlist { query }) => {
                assert_eq!(query, "https://youtube.com/watch?v=xyz");
            }
            _ => panic!("Expected Playlist command"),
        }

        // Test alias
        match parser.parse("!pl search term") {
            Some(ParsedCommand::Playlist { query }) => {
                assert_eq!(query, "search term");
            }
            _ => panic!("Expected Playlist command with alias"),
        }

        // Test skip command
        match parser.parse("!skip") {
            Some(ParsedCommand::Skip) => {}
            _ => panic!("Expected Skip command"),
        }

        // Test unknown command
        match parser.parse("!unknown") {
            Some(ParsedCommand::Unknown { command }) => {
                assert_eq!(command, "unknown");
            }
            _ => panic!("Expected Unknown command"),
        }

        // Test non-command
        assert!(parser.parse("regular message").is_none());
    }
}
