use std::path::Path;

/// A label becomes a filename, and on Linux it is also written into a config
/// file as a value. Reject anything that could leave the Desktop folder or open
/// a second line: `Path::join` REPLACES the base when handed an absolute path,
/// and a newline in a `.desktop` body starts a new Desktop Entry key.
fn safe_label(label: &str) -> Result<String, String> {
    let trimmed = label.trim();
    if trimmed.is_empty()
        || trimmed.contains(std::path::is_separator)
        || trimmed.contains([':', '\n', '\r'])
    {
        return Err("that shortcut name isn't usable".into());
    }
    Ok(trimmed.to_string())
}

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

    // Both inputs reach a shell or a config file, and both derive from a filename
    // read off disk — which the user may not have chosen. Bound them here, once,
    // rather than at each use below.
    let label = safe_label(&label)?;
    if workbook_path.contains(['\n', '\r']) {
        return Err("that workbook's name isn't usable".into());
    }

    let desktop = dirs_desktop().ok_or("couldn't find your desktop folder")?;

    #[cfg(target_os = "windows")]
    {
        let link = desktop.join(format!("{label}.lnk"));
        // WScript.Shell via PowerShell rather than a COM crate: this is ten
        // lines and one fewer dependency to keep current.
        //
        // The two paths are passed as ENVIRONMENT, never spliced into the script
        // text. A single quote is a legal Windows filename character, and inside
        // a PowerShell single-quoted string the only escape is `''` — so a
        // workbook called `Budget 2026'; <command>; '.xlsx` would otherwise close
        // the literal and run the rest. Keeping the script a constant means no
        // filename can reach the parser at all.
        std::process::Command::new("powershell")
            .args([
                "-NoProfile",
                "-NonInteractive",
                "-Command",
                "$s=(New-Object -COM WScript.Shell).CreateShortcut($env:CAPY_LINK); \
                 $s.TargetPath=$env:CAPY_TARGET; $s.Save()",
            ])
            .env("CAPY_LINK", &link)
            .env("CAPY_TARGET", target)
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
