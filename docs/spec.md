# VS Code Clipper 実装仕様

## 目的

VS Codeで選択したコードを、相対パスと行番号付きでdraw.io Desktopへワンキーで貼り付ける。

コードの選択、重要性の判断、draw.io上の配置や矢印作成は利用者が行う。コード解析、要約、図の自動生成は行わない。

## 対象環境

- Windows
- VS Code（ローカルおよびRemote SSH）
- draw.io Desktop
- AutoHotkey v2

拡張機能は`UI Extension`としてWindows側で動作する。Remote SSH利用時も、Windows側のClipboard、AutoHotkey、draw.ioを使用する。

## 操作

コードを選択して`Ctrl+Shift+D`を実行する。

```text
コードを選択
→ VS Code標準のコピーを実行
→ 相対パスと行番号をClipboard HTMLへ追加
→ draw.ioへ貼り付け
→ VS Codeへ戻る
```

コマンドID:

```text
vscode-clipper.clipAndPaste
```

コマンドパレット表示:

```text
Clipper: Paste Selection to draw.io
```

## 貼り付け形式

パスとコードは1つのdraw.ioオブジェクトとして貼り付ける。

```text
src/services/user.ts : [20-45]  ← 灰色

async function getUser() {
    ...
}
```

コード部分にはVS Code標準コピーが生成したHTMLを使用し、シンタックスハイライトやフォントを維持する。パス情報だけを灰色のHTML要素として先頭へ追加する。

## パスと行番号

- ワークスペースからの相対パスを使用する
- Windowsの区切り文字も`/`へ統一する
- 行番号は1-basedで表示する
- 1行の場合は`src/file.ts : [10]`
- 複数行の場合は`src/file.ts : [10-25]`
- 行頭で選択終了した次行は範囲に含めない
- Remote SSHのホスト名や絶対パスは表示しない

## 設定

```json
{
  "vscode-clipper.autoHotkeyPath": "",
  "vscode-clipper.drawioExecutable": "",
  "vscode-clipper.includeLineNumbers": true,
  "vscode-clipper.includeWorkspaceFolder": true
}
```

## エラー処理

- アクティブエディターがない場合は終了して通知する
- 選択範囲が空の場合は終了して通知する
- Windows以外ではAutoHotkey連携が利用できないことを通知する
- AutoHotkeyまたはClipboard HTML処理に失敗した場合はdraw.ioへ貼り付けない
- draw.ioが未起動で実行ファイルが設定済みなら起動する

## スコープ外

- Stack、Undo、Paste Next、Paste All
- コード解析、AST、AI、LLM
- 自動要約、フローチャート生成、矢印生成
- draw.io XML生成
- 自動レイアウト
- データベースや永続ストレージ

## 完成条件

1. `Ctrl+Shift+D`の1回でパスとコードがdraw.ioへ貼られる
2. パスとコードが1つのオブジェクトになる
3. コードの表示品質がVS Codeから手動コピーした場合と実質同じである
4. 相対パスと正しい行番号がコード上部へ灰色で表示される
5. 貼り付け完了後に元のVS Codeウィンドウへ戻る
6. Remote SSHでも処理はWindows側で実行される
