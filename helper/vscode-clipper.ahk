#Requires AutoHotkey v2.0
#SingleInstance Off

if A_Args.Length < 1 {
    ExitApp 2
}

if A_Args[1] = "paste-files" && A_Args.Length >= 4 {
    PasteFiles(A_Args[2], Integer(A_Args[3]), A_Args[4])
    ExitApp
}

if A_Args[1] = "read-clipboard" && A_Args.Length >= 3 {
    ReadClipboard(A_Args[2], A_Args[3])
    ExitApp
}

if A_Args[1] = "active-canvas" {
    CopyActiveCanvasPath()
    ExitApp
}

if A_Args[1] = "focus-vscode" && A_Args.Length >= 3 {
    FocusVscode(A_Args[2], A_Args[3])
    ExitApp
}

ExitApp 2

FocusVscode(project, uri) {
    target := FindVscodeWindow(project)
    if !target {
        throw Error("VS Code project window not found: " project)
    }
    WinActivate("ahk_id " target)
    WinWaitActive("ahk_id " target, , 5)
    Sleep(150)
    Run(uri)
}

FindVscodeWindow(project) {
    needle := StrLower(project)
    for window in WinGetList("ahk_exe Code.exe") {
        if InStr(StrLower(WinGetTitle("ahk_id " window)), needle) {
            return window
        }
    }
    return 0
}

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
    html := FileRead(htmlPath, "UTF-8")
    text := FileRead(textPath, "UTF-8")
    htmlFormat := DllCall("RegisterClipboardFormat", "Str", "HTML Format", "UInt")
    OpenClipboard()
    try {
        if !DllCall("EmptyClipboard") {
            throw Error("Failed to empty the clipboard")
        }
        SetClipboardValue(13, text, "UTF-16")
        SetClipboardValue(htmlFormat, html, "UTF-8")
    } finally {
        DllCall("CloseClipboard")
    }
    Sleep(100)
}

ReadClipboard(htmlPath, textPath) {
    htmlFormat := DllCall("RegisterClipboardFormat", "Str", "HTML Format", "UInt")
    html := ReadClipboardValue(htmlFormat, "UTF-8")
    text := A_Clipboard
    FileAppend(html, htmlPath, "UTF-8-RAW")
    FileAppend(text, textPath, "UTF-8-RAW")
}

ReadClipboardValue(format, encoding) {
    OpenClipboard()
    try {
        if !DllCall("IsClipboardFormatAvailable", "UInt", format) {
            throw Error("VS Code did not provide HTML clipboard data")
        }
        handle := DllCall("GetClipboardData", "UInt", format, "Ptr")
        pointer := handle ? DllCall("GlobalLock", "Ptr", handle, "Ptr") : 0
        if !pointer {
            throw Error("Failed to read clipboard data")
        }
        try {
            return StrGet(pointer, DllCall("GlobalSize", "Ptr", handle, "UPtr"), encoding)
        } finally {
            DllCall("GlobalUnlock", "Ptr", handle)
        }
    } finally {
        DllCall("CloseClipboard")
    }
}

SetClipboardValue(format, value, encoding) {
    unitSize := encoding = "UTF-16" ? 2 : 1
    length := StrPut(value, encoding)
    handle := DllCall("GlobalAlloc", "UInt", 0x42, "UPtr", length * unitSize, "Ptr")
    pointer := handle ? DllCall("GlobalLock", "Ptr", handle, "Ptr") : 0
    if !pointer {
        if handle {
            DllCall("GlobalFree", "Ptr", handle)
        }
        throw Error("Failed to allocate clipboard data")
    }
    try {
        StrPut(value, pointer, length, encoding)
    } finally {
        DllCall("GlobalUnlock", "Ptr", handle)
    }
    if !DllCall("SetClipboardData", "UInt", format, "Ptr", handle, "Ptr") {
        DllCall("GlobalFree", "Ptr", handle)
        throw Error("Failed to set clipboard data")
    }
}

OpenClipboard() {
    Loop 20 {
        if DllCall("OpenClipboard", "Ptr", 0) {
            return
        }
        Sleep(25)
    }
    throw Error("Clipboard is busy")
}
