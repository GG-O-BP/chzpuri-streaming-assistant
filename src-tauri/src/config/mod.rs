use crate::commands::CommandConfig;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppConfig {
    pub command_config: CommandConfig,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            command_config: CommandConfig::default(),
        }
    }
}

pub struct ConfigManager {
    config_path: PathBuf,
}

impl ConfigManager {
    pub fn new(app_handle: &AppHandle) -> Result<Self, String> {
        let app_data_dir = app_handle
            .path()
            .app_data_dir()
            .map_err(|e| format!("Failed to get app data directory: {}", e))?;

        // 디렉토리가 없으면 생성
        if !app_data_dir.exists() {
            fs::create_dir_all(&app_data_dir)
                .map_err(|e| format!("Failed to create app data directory: {}", e))?;
        }

        let config_path = app_data_dir.join("config.json");

        Ok(Self { config_path })
    }

    pub fn load(&self) -> Result<AppConfig, String> {
        if !self.config_path.exists() {
            // 설정 파일이 없으면 기본 설정을 생성하고 저장
            let default_config = AppConfig::default();
            self.save(&default_config)?;
            return Ok(default_config);
        }

        let content = fs::read_to_string(&self.config_path)
            .map_err(|e| format!("Failed to read config file: {}", e))?;

        let config: AppConfig = serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse config file: {}", e))?;

        Ok(config)
    }

    pub fn save(&self, config: &AppConfig) -> Result<(), String> {
        let content = serde_json::to_string_pretty(config)
            .map_err(|e| format!("Failed to serialize config: {}", e))?;

        fs::write(&self.config_path, content)
            .map_err(|e| format!("Failed to write config file: {}", e))?;

        Ok(())
    }

    pub fn update_command_config(&self, command_config: CommandConfig) -> Result<(), String> {
        let mut config = self.load()?;
        config.command_config = command_config;
        self.save(&config)?;
        Ok(())
    }

    pub fn get_command_config(&self) -> Result<CommandConfig, String> {
        let config = self.load()?;
        Ok(config.command_config)
    }
}
