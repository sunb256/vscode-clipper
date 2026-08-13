# VS Code Clipper

VS Codeで選択したコードをリッチなクリップボード形式のまま、相対パス・行番号と一緒にdraw.io Desktopへ貼り付ける拡張機能です。

## 必要なもの

- Windows
- VS Code
- draw.io Desktop
- AutoHotkey v2
- Obsidian Desktopと同梱の`copy-path`プラグイン

Remote SSHで開いたコードにも対応します。拡張機能はWindows側で実行されるため、VSIXはローカル側へインストールしてください。  
SSH先へのインストールは不要です。

## 使い方

1. VS Codeでコードを選択します。
2. `Ctrl+Shift+D`（`Clipper: Stack Selection`）で選択範囲を新しいGroupとしてFIFOスタックへ追加します。
3. 直前のGroupへ追加する場合は`Ctrl+Shift+Alt+D`（`Clipper: Stack Selection in Previous Group`）を使います。
4. 必要なコードを追加したら、ステータスバーの`Clipper: N`をクリックします。
5. Obsidianで現在開いているCanvasの既存内容の下へStackが追加され、成功後にStackがクリアされます。

`Shift+Alt+D`（`Clipper: Add Selection to Active Obsidian Canvas`）を使うと、Stackへ追加せず、現在の選択範囲をアクティブなObsidian Canvasへ直接追加できます。

draw.ioへ貼り付ける場合は、コマンドパレットから`Clipper: Paste All to draw.io`または`Clipper: Paste Selection to draw.io`を実行できます。スタックを破棄する場合は、`Clipper: Clear Stack`を実行します。

ステータスバーまたは`Clipper: Add All to Active Obsidian Canvas`を実行すると、AutoHotkeyがObsidianを前面化し、`copy-path`プラグインから現在のCanvasパスを取得します。既存のNodeとEdgeを維持したまま、その下へStackを追加します。追加成功後はStackをクリアし、失敗時は保持します。

`Clipper: Export to Obsidian Canvas`を実行すると、Stack GroupをGroup Node、パス・行番号と各コード片をMarkdownコードブロックのText Nodeとして新しい`.canvas`へ保存します。Edgeは生成せず、Export成功後はStackをクリアします。
Text Nodeの幅はコードの最長行から概算し、400〜1200pxの範囲で調整されます。
高さはコードの表示行数から算出し、縦スクロールが発生しないサイズで生成されます。Groupの枠にはラベルを表示しません。
すべてのStack Groupが1項目だけの場合はGroup枠を生成せず、コードNodeを直接配置します。
Canvas名には最初のStack Itemのファイル名を使い、重複時は`-2`、`-3`を付けます。
単一ファイルだけを開いている場合は、その親フォルダ名をVault内の保存先として自動作成します。

スタックは現在のVS Codeウィンドウ内だけで保持されます。Paste Allが全件成功すると自動的にクリアされ、失敗した場合は再実行できるよう保持されます。ステータスバーへマウスを重ねると、FIFO順の内容とGroup境界を確認できます。

## 設定

アクティブCanvasへの追加には、`public/obsidian-plugin/copy-path`をObsidianへインストールして有効にしてください。Obsidianで追加先のCanvasを開いた状態で実行します。

- `vscode-clipper.autoHotkeyPath`: AutoHotkey v2実行ファイル。空の場合はPATH上の `AutoHotkey64.exe` を使います。
- `vscode-clipper.drawioExecutable`: draw.ioが起動していない場合に実行する `draw.io.exe` のパス。
- `vscode-clipper.includeLineNumbers`: パスラベルへ行番号を含めます（既定: true）。
- `vscode-clipper.includeWorkspaceFolder`: パスへワークスペースフォルダ名を含めます（既定: true）。
- `vscode-clipper.obsidian.vaultPath`: Obsidian Vaultの絶対パス。Canvas Export時は必須です。

```json
{
  // ---------------
  //- plugin vscode clipper
  // ---------------
  "vscode-clipper.autoHotkeyPath": "C:\\Program Files\\AutoHotkey\\v2\\AutoHotkey64.exe",
  "vscode-clipper.drawioExecutable": "C:\\Users\\<USER>\\AppData\\Local\\Programs\\draw.io\\draw.io.exe",
  "vscode-clipper.obsidian.vaultPath": "C:\\Users\\<USER>\\Documents\\Obsidian Vault"
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
