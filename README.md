# VS Code Clipper

VS Codeで選択したコードをリッチなクリップボード形式のまま、相対パス・行番号と一緒にdraw.io Desktopへ貼り付ける拡張機能です。

## 必要なもの

- Windows
- VS Code
- draw.io Desktop
- AutoHotkey v2

Remote SSHで開いたコードにも対応します。拡張機能はWindows側で実行されるため、VSIXはローカル側へインストールしてください。  
SSH先へのインストールは不要です。

## 使い方

1. VS Codeでコードを選択します。
2. `Ctrl+Shift+D`（`Clipper: Paste Selection to draw.io`）を実行します。
3. 灰色の`relative/path.ts : [line-range]`とコードが1つのオブジェクトとしてdraw.ioへ貼り付けられ、自動的にVS Codeへ戻ります。

## 設定

- `vscode-clipper.autoHotkeyPath`: AutoHotkey v2実行ファイル。空の場合はPATH上の `AutoHotkey64.exe` を使います。
- `vscode-clipper.drawioExecutable`: draw.ioが起動していない場合に実行する `draw.io.exe` のパス。
- `vscode-clipper.includeLineNumbers`: パスラベルへ行番号を含めます（既定: true）。
- `vscode-clipper.includeWorkspaceFolder`: パスへワークスペースフォルダ名を含めます（既定: true）。

```json
{
  // ---------------
  //- plugin vscode clipper
  // ---------------
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

# vsix 作成
npx @vscode/vsce package
```

Remote SSH利用時は、コマンドパレットの`Developer: Show Running Extensions`で`vscode-clipper`がLocal側に表示されることを確認できます。
