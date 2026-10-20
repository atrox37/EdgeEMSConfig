use tauri::menu::{AboutMetadata, Menu, MenuItem, PredefinedMenuItem, Submenu, WINDOW_SUBMENU_ID};
use tauri::{AppHandle, Emitter, Manager, Runtime};

pub const MENU_SETTINGS: &str = "settings";
pub const MENU_CHECK_UPDATE: &str = "check-update";

pub fn build<R: Runtime>(app: &AppHandle<R>) -> tauri::Result<Menu<R>> {
    let pkg = app.package_info();
    let app_name = pkg.name.clone();
    let about_metadata = AboutMetadata {
        name: Some(app_name.clone()),
        version: Some(pkg.version.to_string()),
        copyright: app.config().bundle.copyright.clone(),
        authors: app.config().bundle.publisher.clone().map(|p| vec![p]),
        ..Default::default()
    };

    let settings = MenuItem::with_id(app, MENU_SETTINGS, "Settings...", true, Some("Cmd+,"))?;
    let check_update = MenuItem::with_id(app, MENU_CHECK_UPDATE, "Check for Updates...", true, None::<&str>)?;

    let app_menu = Submenu::with_items(
        app,
        &app_name,
        true,
        &[
            &PredefinedMenuItem::about(app, None, Some(about_metadata))?,
            &PredefinedMenuItem::separator(app)?,
            &settings,
            &check_update,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::services(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::hide(app, None)?,
            &PredefinedMenuItem::hide_others(app, None)?,
            &PredefinedMenuItem::show_all(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::quit(app, None)?,
        ],
    )?;

    let edit_menu = Submenu::with_items(
        app,
        "Edit",
        true,
        &[
            &PredefinedMenuItem::undo(app, None)?,
            &PredefinedMenuItem::redo(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::cut(app, None)?,
            &PredefinedMenuItem::copy(app, None)?,
            &PredefinedMenuItem::paste(app, None)?,
            &PredefinedMenuItem::select_all(app, None)?,
        ],
    )?;

    let window_menu = Submenu::with_id_and_items(
        app,
        WINDOW_SUBMENU_ID,
        "Window",
        true,
        &[
            &PredefinedMenuItem::minimize(app, None)?,
            &PredefinedMenuItem::maximize(app, None)?,
            &PredefinedMenuItem::separator(app)?,
            &PredefinedMenuItem::close_window(app, None)?,
        ],
    )?;

    Menu::with_items(app, &[&app_menu, &edit_menu, &window_menu])
}

pub fn handle_event<R: Runtime>(app: &AppHandle<R>, event: &tauri::menu::MenuEvent) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    match event.id().as_ref() {
        MENU_SETTINGS => {
            let _ = window.emit("app-menu:settings", ());
        }
        MENU_CHECK_UPDATE => {
            let _ = window.emit("app-menu:check-update", ());
        }
        _ => {}
    }
}
