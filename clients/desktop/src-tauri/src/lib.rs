use serde::{Deserialize, Serialize};

pub mod apps;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityReport {
    pub notifications: bool,
    pub files: bool,
    pub active_window: bool,
    pub microphone: bool,
    pub app_discovery: bool,
    pub app_launch: bool,
}

pub fn capability_report() -> CapabilityReport {
    CapabilityReport {
        notifications: true,
        files: true,
        active_window: false,
        microphone: false,
        app_discovery: true,
        app_launch: true,
    }
}

pub fn may_execute_privileged_action_locally() -> bool {
    false
}
