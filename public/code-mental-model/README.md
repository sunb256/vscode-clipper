# Code Mental Model

実際のコードを追跡し、機能の全体像を次の形式で整理するCodex Skillです。

- 抽象化したMermaid動作フロー
- 機能単位の1行説明
- 関連するコードパスとシンボル名の箇条書き


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
機能ごとの1行説明
  └ コードパス＋シンボル名
```

コードパスはVS Code Clipperの専用URIリンクとして出力されます。Obsidianから
クリックすると、対象プロジェクトのVS Codeウィンドウでファイルの開始行を開きます。
別プロジェクトのウィンドウが受信した場合は、Windows上のVS Codeウィンドウタイトルを
大文字・小文字を区別せず検索し、最初に一致したウィンドウへ切り替えます。


カテゴリ未指定の場合は候補を提示し、選択後に`docs/mental-models/<機能名>.md`を生成します。  


機能を指定せず、候補を出させることもできます。

例
```bash
$code-mental-model このリポジトリから説明対象の機能候補を挙げて
```




