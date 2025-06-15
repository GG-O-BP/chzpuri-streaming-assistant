use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub uid: String,
    pub msg_time: i64,
    pub profile: String, // JSON string that needs to be parsed
    pub msg: String,
    pub msg_type_code: i32,
    pub msg_status_type: String,
    pub extras: String, // JSON string
    pub ctime: i64,
    pub utime: i64,
    pub msg_tid: Option<String>,
    pub svcid: String,
    pub cid: String,
    pub mbr_cnt: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatProfile {
    pub user_id_hash: String,
    pub nickname: String,
    pub profile_image_url: Option<String>,
    pub user_role_code: String,
    pub badge: Option<serde_json::Value>,
    pub title: Option<String>,
    pub verified_mark: bool,
    pub activity_badges: Vec<serde_json::Value>,
    pub streaming_property: Option<StreamingProperty>,
    pub viewer_badges: Vec<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UserProfile {
    pub user_id_hash: String,
    pub nickname: String,
    pub profile_image_url: Option<String>,
    pub user_role_code: String,
    pub badge: Option<Badge>,
    pub streaming_property: Option<StreamingProperty>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Badge {
    pub image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StreamingProperty {
    pub following: Option<FollowInfo>,
    pub subscription: Option<SubscriptionInfo>,
    pub nickname_color: Option<NicknameColor>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NicknameColor {
    pub color_code: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FollowInfo {
    pub follow_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionInfo {
    pub accumulative_month: i32,
    pub tier: i32,
    pub badge: Option<SubscriptionBadge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SubscriptionBadge {
    pub image_url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DonationMessage {
    pub uid: String,
    pub msg_time: i64,
    pub user_id_hash: Option<String>,
    pub nickname: Option<String>,
    pub profile: Option<UserProfile>,
    pub msg: Option<String>,
    pub is_anonymous: bool,
    pub extras: DonationExtras,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DonationExtras {
    pub pay_type: String,
    pub pay_amount: i32,
    pub donation_type: String,
    pub donation_image_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemMessage {
    pub uid: String,
    pub msg_time: i64,
    pub msg_type_code: String,
    pub extras: SystemExtras,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemExtras {
    pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LiveStatus {
    pub live_title: Option<String>,
    pub status: String,
    pub concurrent_user_count: i32,
    pub accumulate_count: i32,
    pub open_date: Option<String>,
    pub close_date: Option<String>,
    pub chat_channel_id: Option<String>,
    pub category_type: Option<String>,
    pub live_category: Option<String>,
    pub live_category_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelInfo {
    pub channel_id: String,
    pub channel_name: String,
    pub channel_image_url: Option<String>,
    pub verified_mark: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ChatAccessToken {
    pub access_token: String,
    pub extra_token: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum ChatEvent {
    #[serde(rename = "chat")]
    Chat(ChatMessage),
    #[serde(rename = "donation")]
    Donation(DonationMessage),
    #[serde(rename = "systemMessage")]
    SystemMessage(SystemMessage),
    #[serde(rename = "connected")]
    Connected,
    #[serde(rename = "disconnected")]
    Disconnected,
    #[serde(rename = "error")]
    Error { message: String },
}
