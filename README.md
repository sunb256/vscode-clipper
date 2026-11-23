# VS Code Clipper

VS Code の選択コードを、相対パスと行番号付きのリッチテキストとして draw.io Desktop へ貼り付ける Windows 向け拡張機能です。

## 必要環境

- Windows
- VS Code
- draw.io Desktop
- AutoHotkey v2


## 使い方

1. VS Code でコードを選択します。
2. `Ctrl+Shift+D`（`Clipper: Stack Selection`）で、選択範囲を新しい Group としてスタックします。
3. 直前の Group に追加する場合は、`Ctrl+Shift+Alt+D`（`Clipper: Stack Selection in Previous Group`）を使います。
4. ステータスバーの `Clipper: N` をクリックするか、`Clipper: Paste All to draw.io` を実行します。

`Clipper: Paste Selection to draw.io` は、スタックを経由せず現在の選択範囲だけを貼り付けます。`Clipper: Clear Stack` は未貼り付けの内容を破棄します。


## 設定

- `vscode-clipper.autoHotkeyPath`: AutoHotkey v2 実行ファイル。空の場合は PATH 上の `AutoHotkey64.exe` を使います。
- `vscode-clipper.drawioExecutable`: draw.io が未起動の場合に実行する `draw.io.exe` のパス。
- `vscode-clipper.includeLineNumbers`: 貼り付けラベルへ行番号を含めます（既定: `true`）。

```json
{
  "vscode-clipper.autoHotkeyPath": "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe",
  "vscode-clipper.drawioExecutable": "C:\\Users\\<USER>\\AppData\\Local\\Programs\\draw.io\\draw.io.exe"
}
```

## 開発

```sh
npm install
npm run compile
npm run lint
npm test

# VSIX 作成
npx @vscode/vsce package
```
