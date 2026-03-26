use std::path::{Path, PathBuf};

#[tauri::command]
pub async fn save_file_to_path(
    directory: String,
    file_name: String,
    bytes: Vec<u8>,
) -> Result<String, String> {
    let dir = directory.trim();
    if dir.is_empty() {
        return Err("Download directory is empty".to_string());
    }

    if file_name.trim().is_empty() {
        return Err("File name is empty".to_string());
    }

    let dir_path = Path::new(dir);
    if !dir_path.exists() {
        tokio::fs::create_dir_all(dir_path)
            .await
            .map_err(|e| format!("Failed to create directory: {}", e))?;
    }

    let full_path: PathBuf = dir_path.join(file_name);
    tokio::fs::write(&full_path, bytes)
        .await
        .map_err(|e| format!("Failed to save file: {}", e))?;

    Ok(full_path.to_string_lossy().to_string())
}
