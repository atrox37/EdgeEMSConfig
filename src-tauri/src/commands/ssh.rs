use ssh2::Session;
use std::io::prelude::*;
use std::net::TcpStream;
use std::path::Path;
use std::time::Duration;

fn resolve_remote_path(sess: &Session, remote_path: &str, username: &str) -> Result<String, String> {
    if remote_path == "~" || remote_path.starts_with("~/") {
        let mut channel = sess
            .channel_session()
            .map_err(|e| format!("Failed to create SSH channel: {}", e))?;
        channel
            .exec("printf %s \"$HOME\"")
            .map_err(|e| format!("Failed to resolve home directory: {}", e))?;

        let mut home_dir = String::new();
        channel
            .read_to_string(&mut home_dir)
            .map_err(|e| format!("Failed to read home directory: {}", e))?;
        channel
            .wait_close()
            .map_err(|e| format!("Failed to close SSH channel: {}", e))?;

        let home_dir = home_dir.trim();
        let resolved_home = if home_dir.is_empty() {
            format!("/home/{}", username)
        } else {
            home_dir.to_string()
        };

        if remote_path == "~" {
            return Ok(resolved_home);
        }

        let suffix = remote_path
            .strip_prefix("~/")
            .unwrap_or(remote_path);
        return Ok(format!("{}/{}", resolved_home, suffix));
    }

    Ok(remote_path.to_string())
}

/// 通过SCP上传文件（直接使用文件路径）
#[tauri::command]
pub async fn upload_file_via_scp(
    local_path: String,
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    auth_mode: String,
    remote_path: String,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        
        // 2. 建立SSH连接并上传
        let address = format!("{}:{}", host, port);
        use std::net::ToSocketAddrs;
        let addr = address.to_socket_addrs()
            .map_err(|e| format!("Invalid address format: {}", e))?
            .next()
            .ok_or_else(|| format!("Unable to resolve address: {}", address))?;
        
        let tcp = TcpStream::connect_timeout(&addr, Duration::from_secs(10))
            .map_err(|e| format!("Failed to connect to {}: {}", address, e))?;
        
        tcp.set_read_timeout(Some(Duration::from_secs(300)))
            .map_err(|e| format!("Failed to set read timeout: {}", e))?;
        tcp.set_write_timeout(Some(Duration::from_secs(300)))
            .map_err(|e| format!("Failed to set write timeout: {}", e))?;
        
        let mut sess = Session::new()
            .map_err(|e| format!("Failed to create SSH session: {}", e))?;
        
        sess.set_tcp_stream(tcp);
        sess.handshake()
            .map_err(|e| format!("SSH handshake failed: {}", e))?;
        
        // 认证
        if auth_mode == "key" {
            if let Some(key_path) = private_key_path {
                sess.userauth_pubkey_file(&username, None, Path::new(&key_path), None)
                    .map_err(|e| format!("SSH key authentication failed: {}", e))?;
            } else {
                return Err("Private key path is required for key authentication".to_string());
            }
        } else {
            if let Some(pwd) = password {
                sess.userauth_password(&username, &pwd)
                    .map_err(|e| format!("SSH password authentication failed: {}", e))?;
            } else {
                return Err("Password is required for password authentication".to_string());
            }
        }
        
        if !sess.authenticated() {
            return Err("SSH authentication failed".to_string());
        }
        
        let resolved_remote_path =
            resolve_remote_path(&sess, &remote_path, &username).map_err(|e| {
                format!(
                    "Failed to resolve remote path '{}': {}. Note: SCP does not support '~' expansion.",
                    remote_path, e
                )
            })?;

        // 使用SCP上传文件
        let metadata = std::fs::metadata(&local_path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;
        let file_size = metadata.len();
        let file_mode = 0o644;
        
        let mut remote_file = sess.scp_send(
            Path::new(&resolved_remote_path),
            file_mode,
            file_size,
            None,
        )
        .map_err(|e| format!("Failed to create SCP channel: {}", e))?;
        
        let mut local_file = std::fs::File::open(&local_path)
            .map_err(|e| format!("Failed to open local file: {}", e))?;
        
        std::io::copy(&mut local_file, &mut remote_file)
            .map_err(|e| format!("Failed to copy file via SCP: {}", e))?;
        
        remote_file.send_eof()
            .map_err(|e| format!("Failed to send EOF: {}", e))?;
        remote_file.wait_eof()
            .map_err(|e| format!("Failed to wait for EOF: {}", e))?;
        remote_file.close()
            .map_err(|e| format!("Failed to close SCP channel: {}", e))?;
        remote_file.wait_close()
            .map_err(|e| format!("Failed to wait for channel close: {}", e))?;
        
        Ok(format!(
            "File successfully uploaded via SCP to: {}",
            resolved_remote_path
        ))
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

/// 测试SSH连接
#[tauri::command]
pub async fn test_ssh_connection(
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    auth_mode: String,
) -> Result<bool, String> {
    tokio::task::spawn_blocking(move || {
        let address = format!("{}:{}", host, port);
        
        // 建立TCP连接
        let tcp = TcpStream::connect(&address)
            .map_err(|e| format!("Failed to connect to {}: {}", address, e))?;
        
        // 设置超时
        tcp.set_read_timeout(Some(Duration::from_secs(30)))
            .map_err(|e| format!("Failed to set read timeout: {}", e))?;
        tcp.set_write_timeout(Some(Duration::from_secs(30)))
            .map_err(|e| format!("Failed to set write timeout: {}", e))?;
        
        // 创建SSH会话
        let mut sess = Session::new()
            .map_err(|e| format!("Failed to create SSH session: {}", e))?;
        
        sess.set_tcp_stream(tcp);
        sess.handshake()
            .map_err(|e| format!("SSH handshake failed: {}", e))?;
        
        // 根据认证模式进行认证
        if auth_mode == "key" {
            if let Some(key_path) = private_key_path {
                // 使用密钥认证
                sess.userauth_pubkey_file(&username, None, Path::new(&key_path), None)
                    .map_err(|e| format!("SSH key authentication failed: {}", e))?;
            } else {
                return Err("Private key path is required for key authentication".to_string());
            }
        } else {
            // 使用密码认证
            if let Some(pwd) = password {
                // Try password authentication
                sess.userauth_password(&username, &pwd)
                    .map_err(|e| format!("SSH password authentication failed: {}", e))?;
            } else {
                return Err("Password is required for password authentication".to_string());
            }
        }
        
        // 检查是否认证成功
        if sess.authenticated() {
            Ok(true)
        } else {
            Err(format!(
                "SSH authentication failed. Please verify:\n\
                1. Username is correct: '{}'\n\
                2. Password is correct\n\
                3. SSH server allows password authentication for this user\n\
                4. User account is not locked or disabled\n\
                5. Network connectivity is stable",
                username
            ))
        }
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

/// 通过SSH上传文件
#[tauri::command]
pub async fn upload_file_via_ssh(
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    auth_mode: String,
    local_path: String,
    remote_path: String,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let address = format!("{}:{}", host, port);
        
        // 建立TCP连接（增加超时时间）
        use std::net::ToSocketAddrs;
        let addr = address.to_socket_addrs()
            .map_err(|e| format!("Invalid address format: {}", e))?
            .next()
            .ok_or_else(|| format!("Unable to resolve address: {}", address))?;
        
        let tcp = TcpStream::connect_timeout(&addr, Duration::from_secs(10))
            .map_err(|e| format!("Failed to connect to {}: {}. Please check:\n1. IP address is correct\n2. Port is correct\n3. SSH service is running\n4. Firewall allows connections\n5. Network connectivity", address, e))?;
        
        // 设置超时
        tcp.set_read_timeout(Some(Duration::from_secs(60)))
            .map_err(|e| format!("Failed to set read timeout: {}", e))?;
        tcp.set_write_timeout(Some(Duration::from_secs(60)))
            .map_err(|e| format!("Failed to set write timeout: {}", e))?;
        
        // 创建SSH会话
        let mut sess = Session::new()
            .map_err(|e| format!("Failed to create SSH session: {}", e))?;
        
        sess.set_tcp_stream(tcp);
        sess.handshake()
            .map_err(|e| format!("SSH handshake failed: {}", e))?;
        
        // 根据认证模式进行认证
        if auth_mode == "key" {
            if let Some(key_path) = private_key_path {
                sess.userauth_pubkey_file(&username, None, Path::new(&key_path), None)
                    .map_err(|e| format!("SSH key authentication failed: {}", e))?;
            } else {
                return Err("Private key path is required for key authentication".to_string());
            }
        } else {
            if let Some(pwd) = password {
                sess.userauth_password(&username, &pwd)
                    .map_err(|e| format!("SSH password authentication failed: {}", e))?;
            } else {
                return Err("Password is required for password authentication".to_string());
            }
        }
        
        if !sess.authenticated() {
            return Err("SSH authentication failed".to_string());
        }
        
        // 获取文件大小和权限
        let metadata = std::fs::metadata(&local_path)
            .map_err(|e| format!("Failed to get file metadata: {}", e))?;
        let file_size = metadata.len();
        let file_mode = 0o644; // Default file permissions
        
        // 使用SCP上传文件
        let mut remote_file = sess.scp_send(
            Path::new(&remote_path),
            file_mode,
            file_size,
            None,
        )
        .map_err(|e| format!("Failed to create SCP channel: {}", e))?;
        
        // 读取本地文件并写入SCP通道
        let mut local_file = std::fs::File::open(&local_path)
            .map_err(|e| format!("Failed to open local file: {}", e))?;
        
        // 使用copy方法高效传输文件
        std::io::copy(&mut local_file, &mut remote_file)
            .map_err(|e| format!("Failed to copy file via SCP: {}", e))?;
        
        // 发送EOF并等待远程确认
        remote_file.send_eof()
            .map_err(|e| format!("Failed to send EOF: {}", e))?;
        remote_file.wait_eof()
            .map_err(|e| format!("Failed to wait for EOF: {}", e))?;
        remote_file.close()
            .map_err(|e| format!("Failed to close SCP channel: {}", e))?;
        remote_file.wait_close()
            .map_err(|e| format!("Failed to wait for channel close: {}", e))?;
        
        Ok(format!("File successfully uploaded via SCP to: {}", remote_path))
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}

/// 通过SSH执行命令
#[tauri::command]
pub async fn execute_ssh_command(
    host: String,
    port: u16,
    username: String,
    password: Option<String>,
    private_key_path: Option<String>,
    auth_mode: String,
    command: String,
) -> Result<String, String> {
    tokio::task::spawn_blocking(move || {
        let address = format!("{}:{}", host, port);
        
        // 建立TCP连接
        let tcp = TcpStream::connect(&address)
            .map_err(|e| format!("Failed to connect to {}: {}", address, e))?;
        
        // 设置超时
        tcp.set_read_timeout(Some(Duration::from_secs(300))) // 5分钟超时，用于安装命令
            .map_err(|e| format!("Failed to set read timeout: {}", e))?;
        tcp.set_write_timeout(Some(Duration::from_secs(300)))
            .map_err(|e| format!("Failed to set write timeout: {}", e))?;
        
        // 创建SSH会话
        let mut sess = Session::new()
            .map_err(|e| format!("Failed to create SSH session: {}", e))?;
        
        sess.set_tcp_stream(tcp);
        sess.handshake()
            .map_err(|e| format!("SSH handshake failed: {}", e))?;
        
        // 根据认证模式进行认证
        if auth_mode == "key" {
            if let Some(key_path) = private_key_path {
                sess.userauth_pubkey_file(&username, None, Path::new(&key_path), None)
                    .map_err(|e| format!("SSH key authentication failed: {}", e))?;
            } else {
                return Err("Private key path is required for key authentication".to_string());
            }
        } else {
            if let Some(pwd) = password {
                sess.userauth_password(&username, &pwd)
                    .map_err(|e| format!("SSH password authentication failed: {}", e))?;
            } else {
                return Err("Password is required for password authentication".to_string());
            }
        }
        
        if !sess.authenticated() {
            return Err("SSH authentication failed".to_string());
        }
        
        // 创建通道并执行命令
        let mut channel = sess.channel_session()
            .map_err(|e| format!("Failed to create SSH channel: {}", e))?;
        
        channel.exec(&command)
            .map_err(|e| format!("Failed to execute command: {}", e))?;
        
        // 读取命令输出
        let mut output = String::new();
        let mut stderr_output = String::new();
        
        // 读取标准输出
        channel.read_to_string(&mut output)
            .map_err(|e| format!("Failed to read command output: {}", e))?;
        
        // 读取标准错误
        channel.stderr().read_to_string(&mut stderr_output)
            .map_err(|e| format!("Failed to read command error output: {}", e))?;
        
        // 等待命令完成
        channel.wait_close()
            .map_err(|e| format!("Failed to wait for command completion: {}", e))?;
        
        // 获取退出状态
        let exit_status = channel.exit_status()
            .map_err(|e| format!("Failed to get exit status: {}", e))?;
        
        // 组合输出
        let mut result = String::new();
        if !output.is_empty() {
            result.push_str(&output);
        }
        if !stderr_output.is_empty() {
            if !result.is_empty() {
                result.push_str("\n");
            }
            result.push_str(&stderr_output);
        }
        
        if exit_status == 0 {
            Ok(result)
        } else {
            Err(format!("Command execution failed (exit code: {}): {}", exit_status, result))
        }
    })
    .await
    .map_err(|e| format!("Task execution failed: {}", e))?
}
