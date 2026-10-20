// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
use tauri::LogicalSize;
use tauri::Manager;
use tauri::Size;

#[cfg(target_os = "macos")]
mod app_menu;
mod commands;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_log::Builder::new().level(log::LevelFilter::Info).build())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(target_os = "macos")]
    let builder = builder
        .menu(|handle| app_menu::build(&handle))
        .on_menu_event(|app, event| {
            app_menu::handle_event(app, &event);
        });

    builder
        .setup(|app| {
            let window = app.get_webview_window("main").unwrap();

            // macOS overlay + traffic lights come from tauri.macos.conf.json.
            // Do not reset titleBarStyle here, or trafficLightPosition is lost.
            #[cfg(not(target_os = "macos"))]
            {
                let _ = window.set_decorations(false);
            }

            let _ = window.set_size(Size::Logical(LogicalSize {
                width: 1270.0,
                height: 750.0,
            }));
            let _ = window.center();
            let _ = window.show();
            let _ = window.set_focus();

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            greet,
            commands::file::save_file_to_path,
            commands::ssh::test_ssh_connection,
            commands::ssh::upload_file_via_ssh,
            commands::ssh::execute_ssh_command,
            commands::ssh::upload_file_via_scp
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
