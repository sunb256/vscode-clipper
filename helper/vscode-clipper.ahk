#Requires AutoHotkey v2.0
#SingleInstance Off

if A_Args.Length < 3 {
    ExitApp 2
}

action := A_Args[1]
if action = "paste-return" {
    PasteIntoDrawio(A_Args[2], A_Args[3])
    ExitApp
}

ExitApp 2

PasteIntoDrawio(label, executable) {
    sourceWindow := WinExist("A")
    drawioWindow := "ahk_exe draw.io.exe"
    if !WinExist(drawioWindow) {
        if executable = "" {
            throw Error("draw.io is not running and drawioExecutable is not configured")
        }
        Run(executable)
        WinWait(drawioWindow, , 10)
    }

    PrepareClipboard(label)
    WinActivate(drawioWindow)
    WinWaitActive(drawioWindow, , 5)
    Send("^+a")
    Sleep(100)
    Send("^v")
    Sleep(500)
    WinActivate("ahk_id " sourceWindow)
}

PrepareClipboard(label) {
    Sleep(100)

    processId := DllCall("GetCurrentProcessId")
    labelFile := A_Temp "\vscode-clipper-" processId ".label"
    if FileExist(labelFile) {
        FileDelete(labelFile)
    }
    FileAppend(label, labelFile, "UTF-8-RAW")
    script := A_ScriptDir "\prepend-path.ps1"
    command := "powershell.exe -NoProfile -STA -ExecutionPolicy Bypass -File `"" script "`" -LabelFile `"" labelFile "`""
    try {
        exitCode := RunWait(command, , "Hide")
        if exitCode != 0 {
            throw Error("Failed to add the path label to the clipboard")
        }
    } finally {
        if FileExist(labelFile) {
            FileDelete(labelFile)
        }
    }
    Sleep(100)
}
