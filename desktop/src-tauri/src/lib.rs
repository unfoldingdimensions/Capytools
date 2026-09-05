use std::path::Path;

/// Put a shortcut to the WORKBOOK on the desktop.
///
/// Requirement 11 asked for a desktop shortcut. The installer already puts the
/// *app* there, so that reading is already satisfied and worth nothing — what
/// the user opens every day is the spreadsheet. This points at that.
#[tauri::command]
fn create_workbook_shortcut(workbook_path: String, label: String) -> Result<String, String> {
    let target = Path::new(&workbook_path);
    if !target.exists() {
        return Err("that workbook is not there any more".into());
    }

    let desktop = dirs_desktop().ok_or("couldn't find your desktop folder")?;

    #[cfg(target_os = "windows")]
    {
        let link = desktop.join(format!("{label}.lnk"));
        // WScript.Shell via PowerShell rather than a COM crate: this is ten
        // lines and one fewer dependency to keep current.
        let script = format!(
            "$s=(New-Object -COM WScript.Shell).CreateShortcut('{}'); $s.TargetPath='{}'; $s.Save()",
            link.display(),
            target.display()
        );
        std::process::Command::new("powershell")
            .args(["-NoProfile", "-NonInteractive", "-Command", &script])
            .status()
            .map_err(|e| format!("couldn't make the shortcut: {e}"))?;
        return Ok(link.display().to_string());
    }

    #[cfg(not(target_os = "windows"))]
    {
        let link = desktop.join(format!("{label}.desktop"));
        let body = format!(
            "[Desktop Entry]
Type=Link
Name={label}
URL=file://{}
Icon=x-office-spreadsheet
",
            target.display()
        );
        std::fs::write(&link, body).map_err(|e| format!("couldn't make the shortcut: {e}"))?;
        return Ok(link.display().to_string());
    }
}

fn dirs_desktop() -> Option<std::path::PathBuf> {
    let home = std::env::var_os("USERPROFILE").or_else(|| std::env::var_os("HOME"))?;
    let candidate = Path::new(&home).join("Desktop");
    if candidate.is_dir() {
        Some(candidate)
    } else {
        None
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        // MUST come after the fs plugin: it restores that plugin's scope.
        .plugin(tauri_plugin_persisted_scope::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![create_workbook_shortcut])
        .run(tauri::generate_context!())
        .expect("error while running CapyExpense");
}
