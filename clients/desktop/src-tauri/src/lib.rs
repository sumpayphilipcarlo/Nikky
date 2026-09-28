use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapabilityReport {
    pub notifications: bool,
    pub files: bool,
    pub active_window: bool,
    pub microphone: bool,
}

pub fn capability_report() -> CapabilityReport {
    CapabilityReport {
        notifications: true,
        files: true,
        active_window: false,
        microphone: false,
    }
}

pub fn may_execute_privileged_action_locally() -> bool {
    // Privileged actions are always delegated to Nikky Core.
    false
}
