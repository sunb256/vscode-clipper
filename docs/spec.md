# VS Code Clipper 実装仕様

## 目的

VS Code で選択したコードを、相対パスと行番号付きのリッチテキストとして draw.io Desktop に貼り付ける。コードの選択、draw.io 上での配置、矢印の作成は利用者が行う。

## 対象環境

- Windows
- VS Code（ローカルおよび Remote SSH）
- draw.io Desktop
- AutoHotkey v2

拡張機能は UI Extension として Windows 側で実行する。HTML と Unicode テキストのクリップボード操作、および draw.io の前面化と貼り付けは AutoHotkey v2 が担当する。

## コマンドと操作

| コマンド | 操作 |
| --- | --- |
| `Clipper: Stack Selection` | 選択範囲を新しい Group としてスタックする。ショートカットは `Ctrl+Shift+D`。 |
| `Clipper: Stack Selection in Previous Group` | 選択範囲を直前の Group に追加する。ショートカットは `Ctrl+Shift+Alt+D`。 |
| `Clipper: Paste Selection to draw.io` | 現在の選択範囲のみを draw.io へ貼り付ける。 |
| `Clipper: Paste All to draw.io` | スタック済み Group を FIFO 順に貼り付ける。ステータスバーのクリック先もこのコマンド。 |
| `Clipper: Clear Stack` | 未貼り付けのスタックを破棄する。 |

## 貼り付け動作

1. VS Code 標準のコピーで選択範囲の HTML とプレーンテキストを取得する。
2. ワークスペース相対パスと、必要に応じて 1-based の行番号をラベルとして先頭に追加する。
3. Group 内の項目は HTML とテキストを結合し、1 つの draw.io オブジェクトとして貼り付ける。
4. AutoHotkey が draw.io を起動または前面化し、各 Group を順に貼り付ける。
5. 全件成功した場合だけスタックをクリアする。失敗時はスタックを保持する。

パスは `/` 区切りで表示し、ワークスペースフォルダ名、Remote SSH のホスト名、絶対パスは含めない。

## 設定

```json
{
  "vscode-clipper.autoHotkeyPath": "",
  "vscode-clipper.drawioExecutable": "",
  "vscode-clipper.includeLineNumbers": true
}
```

## エラー処理と非対応範囲

- アクティブエディターがない、または選択範囲が空の場合は通知して終了する。
- Windows 以外では AutoHotkey 連携を利用しない。
- draw.io が未起動で実行ファイルも未設定の場合、貼り付けは失敗しスタックを保持する。
- Undo、スタックの永続化、draw.io XML 生成、コード解析、AI による要約や自動レイアウトは対象外とする。
