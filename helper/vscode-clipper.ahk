#Requires AutoHotkey v2.0
#SingleInstance Off

if A_Args.Length < 1 {
    ExitApp 2
}

if A_Args[1] = "paste-files" && A_Args.Length >= 4 {
    PasteFiles(A_Args[2], Integer(A_Args[3]), A_Args[4])
    ExitApp
}

if A_Args[1] = "active-canvas" {
    CopyActiveCanvasPath()
    ExitApp
}

ExitApp 2

CopyActiveCanvasPath() {
    sourceWindow := WinExist("A")
    obsidianWindow := "ahk_exe Obsidian.exe"
    savedClipboard := ClipboardAll()
    try {
        if !WinExist(obsidianWindow) {
            throw Error("Obsidian is not running")
        }
        WinActivate(obsidianWindow)
        WinWaitActive(obsidianWindow, , 5)
        A_Clipboard := ""
        Run("obsidian://copy-path")
        if !ClipWait(5) {
            throw Error("Copy Path did not copy an active Canvas path")
        }
        canvasPath := Trim(A_Clipboard)
        FileAppend(canvasPath, "*", "UTF-8-RAW")
    } finally {
        A_Clipboard := savedClipboard
        WinActivate("ahk_id " sourceWindow)
    }
}

PasteFiles(directory, count, executable) {
    sourceWindow := WinExist("A")
    drawioWindow := "ahk_exe draw.io.exe"
    try {
        EnsureDrawio(drawioWindow, executable)
        WinActivate(drawioWindow)
        WinWaitActive(drawioWindow, , 5)

        Loop count {
            index := A_Index - 1
            SetClipboard(directory "\" index ".html", directory "\" index ".txt")
            Send("^+a")
            Sleep(100)
            Send("^v")
            Sleep(350)
        }
    } finally {
        WinActivate("ahk_id " sourceWindow)
    }
}

EnsureDrawio(window, executable) {
    if WinExist(window) {
        return
    }
    if executable = "" {
        throw Error("draw.io is not running and drawioExecutable is not configured")
    }
    Run(executable)
    WinWait(window, , 10)
}

SetClipboard(htmlPath, textPath) {
    script := A_ScriptDir "\clipboard.ps1"
    command := "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File `"" script
        . "`" -Mode set -HtmlPath `"" htmlPath "`" -TextPath `"" textPath "`""
    exitCode := RunWait(command, , "Hide")
    if exitCode != 0 {
        throw Error("Failed to restore clipboard data")
    }
    Sleep(100)
}
