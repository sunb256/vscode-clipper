# Code Mental Model

実際のコードを追跡し、機能の全体像を次の形式で整理するCodex Skillです。

- 抽象化したMermaid動作フロー
- 実際のクラス名などを参加者名に使ったMermaidシーケンス図
- 機能単位の1行説明
- 関連するコードパスとシンボル名の箇条書き
- 単独で利用できるMarkdownファイル
- 全内容をテキストノードに内包する自己完結型Obsidian Canvasファイル
- カテゴリ抽出から全カテゴリの仕様生成までを止めずに行う一括モード


## 使用例

```bash
# 例
$code-mental-model Obsidian Canvas機能の実装を説明して
$code-mental-model スタック機能の動作フローを整理して
$code-mental-model Canvasへの追記処理について、Mermaidと実装箇所をまとめて
$code-mental-model このリポジトリのカテゴリを抽出して、全カテゴリの仕様を一括生成して
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

カテゴリ抽出と全件生成を一度に依頼した場合は、候補の選択待ちで停止せず、抽出した全カテゴリについて連番付きのファイルを生成します。

```text
docs/mental-models/<project-name>/01_<category-name>.md
docs/mental-models/<project-name>/01_<category-name>.canvas
docs/mental-models/<project-name>/02_<category-name>.md
docs/mental-models/<project-name>/02_<category-name>.canvas
```

番号は主要なユーザーフローから順に割り当てられ、MarkdownとCanvasで共通です。各`.canvas`は自己完結しているため、そのままObsidian Vaultへコピーできます。依頼時にVault内の保存先を指定すれば、既存ファイルを上書きしない形で生成後のCanvasをコピーします。


機能を指定せず、候補を出させることもできます。

例
```bash
$code-mental-model このリポジトリから説明対象の機能候補を挙げて
```
