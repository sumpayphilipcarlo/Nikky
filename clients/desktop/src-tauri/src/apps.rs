use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiscoveredApplication {
    pub id: String,
    pub name: String,
    pub executable: PathBuf,
    pub capabilities: Vec<String>,
}

pub fn launch(app: &DiscoveredApplication, args: &[String]) -> Result<(), String> {
    if !app.executable.is_absolute() {
        return Err("application executable must be an absolute path".to_string());
    }
    Command::new(&app.executable)
        .args(args)
        .spawn()
        .map(|_| ())
        .map_err(|e| e.to_string())
}

pub fn normalize(id: &str, name: &str, executable: PathBuf) -> DiscoveredApplication {
    DiscoveredApplication {
        id: id.to_string(),
        name: name.to_string(),
        executable,
        capabilities: vec!["app.open".to_string()],
    }
}
