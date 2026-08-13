# Code Mental Model

実際のコードを追跡し、機能の全体像を次の形式で整理するCodex Skillです。

- 抽象化したMermaid動作フロー
- 実際のクラス名などを参加者名に使ったMermaidシーケンス図
- 機能単位の1行説明
- 関連するコードパスとシンボル名の箇条書き
- 単独で利用できるMarkdownファイル
- 全内容をテキストノードに内包する自己完結型Obsidian Canvasファイル


## 使用例

```bash
# 例
$code-mental-model Obsidian Canvas機能の実装を説明して
$code-mental-model スタック機能の動作フローを整理して
$code-mental-model Canvasへの追記処理について、Mermaidと実装箇所をまとめて
```

出力内容は以下の構成です。

```
概要
↓
抽象化したMermaidフロー
↓
参加者間のMermaidシーケンス図
↓
機能ごとの1行説明
  └ コードパス＋シンボル名
```

コードパスはVS Code Clipperの専用URIリンクとして出力されます。Obsidianから
クリックすると、対象プロジェクトのVS Codeウィンドウでファイルの開始行を開きます。
別プロジェクトのウィンドウが受信した場合は、Windows上のVS Codeウィンドウタイトルを
大文字・小文字を区別せず検索し、最初に一致したウィンドウへ切り替えます。


カテゴリ未指定の場合は候補を提示し、選択後に次の2ファイルを生成します。

```text
docs/mental-models/<機能名>.md
docs/mental-models/<機能名>.canvas
```

MarkdownとCanvasは同じ内容を持ちますが、CanvasはMarkdownを参照しません。Canvasのテキストノードに全文を直接格納するため、`.md`と`.canvas`のどちらも単独でコピーして利用できます。


機能を指定せず、候補を出させることもできます。

例
```bash
$code-mental-model このリポジトリから説明対象の機能候補を挙げて
```
