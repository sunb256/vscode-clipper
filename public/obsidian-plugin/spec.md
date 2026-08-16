# Remember Canvas View — Obsidian Plugin 仕様書

## 1. 概要

### 1.1 プラグイン名

**Remember Canvas View**

`remember-canvas-view`

### 1.2 目的

Obsidian Canvasで別のCanvasファイルへ移動した後、以前のCanvasへ戻った際に、

* 表示位置
* ズーム倍率

を、最後にそのCanvasを見ていた状態へ自動的に復元する。

### 1.3 解決する問題

現在のCanvas利用時、次の操作をすると表示位置やズーム状態が期待どおり保持されない場合がある。

1. `Canvas A.canvas` を開く
2. 任意の場所へ移動する
3. 任意の倍率へズームする
4. `Canvas B.canvas` を開く
5. `Canvas A.canvas` に戻る
6. 表示位置・倍率が変わっている

本プラグイン導入後は、

1. `Canvas A.canvas`
2. 位置・倍率を変更
3. `Canvas B.canvas`
4. `Canvas A.canvas`
5. **最後に見ていた位置・倍率へ自動復元**

となることを目標とする。

---

## 2. 基本方針

### 2.1 Canvasファイル自体は変更しない

viewport情報は `.canvas` ファイルには書き込まない。

JSON Canvasの標準仕様はCanvas上のノードとエッジを中心としたデータ形式であり、表示中のviewportを標準フィールドとして規定していない。

そのため、表示状態はプラグイン固有データとして保存する。

保存先:

```text
<vault>/.obsidian/plugins/remember-canvas-view/data.json
```

Obsidian Plugin APIには `loadData()` / `saveData()` があり、プラグインの `data.json` を使って永続データを保存できる。

### 2.2 ユーザー操作を不要にする

基本動作は完全自動とする。

ユーザーが、

* 保存ボタンを押す
* ブックマークを作る
* コマンドを実行する

必要はない。

通常どおりCanvasを移動・ズームするだけでよい。

### 2.3 Canvasごとに状態を保持する

ファイルパスをキーとしてviewportを保存する。

例:

```json
{
  "views": {
    "Projects/Project A.canvas": {
      "tx": -1240.5,
      "ty": 830.2,
      "tZoom": -1.25,
      "updatedAt": 1786885200000
    },
    "Projects/Project B.canvas": {
      "tx": 420.0,
      "ty": -100.0,
      "tZoom": 0.5,
      "updatedAt": 1786885300000
    }
  }
}
```

---

# 3. MVP機能要件

## FR-01 Canvas viewportの取得

Canvas表示中に以下の値を取得できること。

```text
tx
ty
tZoom
```

ここで、

* `tx`: 水平方向viewport位置
* `ty`: 垂直方向viewport位置
* `tZoom`: Canvasのズーム状態

として扱う。

Obsidianの公開Plugin APIにはCanvas viewport操作が正式には公開されていないため、この部分のみCanvas内部APIを利用する。

既存のAdvanced Canvasプロジェクトで使われているCanvas型定義では、内部Canvasオブジェクトに、

```ts
tx: number
ty: number
tZoom: number

setViewport(
  tx: number,
  ty: number,
  tZoom: number
): void
```

が存在する形で扱われている。

同じ型定義ではCanvas Viewから、

```ts
view.file
view.canvas
```

へアクセスする構造が使われている。

これらは**Obsidian公式公開APIではなく内部実装依存**として扱うこと。

---

## FR-02 viewport状態の保存

Canvasのviewportが変更された場合、そのCanvasに対応する状態をメモリ上へ保存する。

最低限以下を保持する。

```ts
interface CanvasViewState {
  tx: number;
  ty: number;
  tZoom: number;
  updatedAt: number;
}
```

ファイル単位で保持する。

```ts
interface StoredData {
  version: number;
  views: Record<string, CanvasViewState>;
}
```

MVP:

```ts
version = 1
```

---

## FR-03 viewport状態の永続化

状態はObsidian再起動後も維持する。

プラグインロード時:

```ts
await this.loadData()
```

プラグイン実行中:

```ts
await this.saveData(...)
```

を使用する。

ただし、マウス移動やホイール操作のたびにディスク書き込みを行ってはいけない。

### 保存タイミング

以下を推奨する。

* Canvasから別ファイルへ移動したとき
* Canvasのviewport変更停止から一定時間経過したとき
* Obsidianウィンドウのフォーカスを失ったとき
* プラグイン終了処理時

viewport操作中はメモリのみ更新する。

### debounce

推奨値:

```text
500 ms
```

最後のviewport変化から500ms経過後に `saveData()` を行う。

---

# 4. viewport復元

## FR-04 Canvasを開いた際の自動復元

Canvasを開いたとき、

```ts
views[file.path]
```

が存在すればviewportを復元する。

概念:

```ts
const state = views[file.path];

canvas.setViewport(
  state.tx,
  state.ty,
  state.tZoom
);
```

内部Canvas型では `setViewport(tx, ty, tZoom)` がviewport操作用メソッドとして扱われている。

---

## FR-05 初回表示では何もしない

保存データが存在しないCanvasの場合、

```ts
views[file.path] === undefined
```

ならプラグインはviewportを変更しない。

Obsidian本来のCanvas初期表示処理に任せる。

---

# 5. Canvas初期化タイミング

Canvasファイルを開いたイベント発生直後には、内部Canvasオブジェクトの初期化が完了していない可能性を考慮する。

そのため、イベント発生直後に一度だけ復元を試みる設計にしない。

### 復元条件

以下がすべて成立してから復元する。

```text
view が存在する
view.file が対象ファイルである
view.canvas が存在する
view.canvas.setViewport が function である
```

### 推奨復元処理

`requestAnimationFrame()` を使い数回リトライする。

概念:

```ts
function scheduleRestore(
  view,
  state,
  attempt = 0
) {
  if (attempt > MAX_ATTEMPTS) return;

  requestAnimationFrame(() => {
    const canvas = view?.canvas;

    if (!canvas || typeof canvas.setViewport !== "function") {
      scheduleRestore(view, state, attempt + 1);
      return;
    }

    canvas.setViewport(
      state.tx,
      state.ty,
      state.tZoom
    );
  });
}
```

推奨:

```text
MAX_ATTEMPTS = 10〜30
```

固定ミリ秒の `setTimeout(500)` のみに依存するより、Canvas準備完了を確認してから復元する。

---

# 6. ファイル切り替え検知

Obsidian Workspace APIには、

```text
active-leaf-change
file-open
```

などのイベントが存在する。`active-leaf-change` はアクティブleaf変更時、`file-open` はアクティブファイル変更時に利用できる。

MVPでは両方を利用する。

理由:

### ケースA

```text
Canvas A
↓
別タブのCanvas B
```

→ `active-leaf-change`

### ケースB

同じleafで、

```text
Canvas A
↓
Canvas B
```

→ `file-open`

両イベントを同一ハンドラへ流す。

```ts
handleWorkspaceChange()
```

---

# 7. 現在のCanvas Context管理

プラグイン内部に現在追跡しているCanvasを保持する。

```ts
interface ActiveCanvasContext {
  path: string;
  view: InternalCanvasView;
  canvas: InternalCanvas;
}
```

例:

```ts
private activeCanvas:
  ActiveCanvasContext | null = null;
```

新しいCanvasへ切り替わる前後で、以前のcontextからviewportを取得する。

---

# 8. viewport変更検知

重要要件として、

**ファイルを離れる瞬間だけにviewportを取得する設計には依存しすぎないこと。**

同一leafでCanvasが差し替えられる場合、旧Canvasオブジェクトへアクセスできなくなる可能性があるためである。

そのためMVPでは、Canvas表示中にもviewport状態を定期的にメモリへ同期する。

## 推奨方式

250〜500ms程度の軽量pollingを使用する。

例:

```ts
window.setInterval(() => {
  captureActiveCanvasState();
}, 300);
```

ただし値が前回と同じ場合は何もしない。

```ts
if (
  previous.tx === canvas.tx &&
  previous.ty === canvas.ty &&
  previous.tZoom === canvas.tZoom
) {
  return;
}
```

変更がある場合のみ、

```ts
views[path] = {
  tx,
  ty,
  tZoom,
  updatedAt: Date.now()
};
```

とする。

### pollingを採用する理由

MVPではCanvas内部メソッドをmonkey patchしてviewportイベントを横取りする方式よりも、

```text
内部値を読む
```

だけに留める。

これにより内部APIへの侵襲度を下げる。

---

# 9. 保存アルゴリズム

処理フロー:

```text
Canvas表示
   ↓
300msごとにviewport確認
   ↓
変更あり？
 ┌─ No ─→ 何もしない
 │
 Yes
 │
 ↓
メモリ上のstate更新
 │
 ↓
500ms debounce
 │
 ↓
data.json保存
```

---

# 10. 復元アルゴリズム

```text
Canvasファイルがアクティブになる
        ↓
.canvas ファイルか？
   ┌──── No ───→終了
   │
  Yes
   │
   ↓
保存stateが存在？
   ┌──── No ───→何もしない
   │
  Yes
   │
   ↓
Canvas View取得
   │
   ↓
Canvas初期化待ち
   │
   ↓
setViewport(tx, ty, tZoom)
   │
   ↓
復元完了
```

---

# 11. Canvas判定

対象ファイルは、

```ts
file.extension === "canvas"
```

または、

```ts
file.path.endsWith(".canvas")
```

で判定する。

可能なら `TFile.extension` を使用する。

Canvas以外のファイルは完全に無視する。

---

# 12. ファイル名変更

Canvasファイル名またはパスが変更された場合、保存キーも移動する。

例:

変更前:

```text
Projects/A.canvas
```

変更後:

```text
Archive/A.canvas
```

保存データ:

```ts
views["Projects/A.canvas"]
```

を、

```ts
views["Archive/A.canvas"]
```

へ移動する。

Obsidian Vault APIではファイルのrename/deleteに対応するイベントが提供されているため、それを利用する。

処理:

```ts
onRename(file, oldPath) {
  if (!oldPath.endsWith(".canvas")) return;

  const state = views[oldPath];

  if (!state) return;

  views[file.path] = state;
  delete views[oldPath];

  scheduleSave();
}
```

---

# 13. Canvas削除

Canvasが削除された場合、その保存状態も削除する。

```ts
delete views[file.path];
```

Vaultにはdeleteイベントが存在する。

これにより `data.json` に不要なviewport情報が残り続けることを防ぐ。

---

# 14. 複数タブ・複数leaf

## MVP仕様

viewportは、

```text
Canvasファイル単位
```

で保存する。

つまり、

同じ `A.canvas` を2つのタブで開いていた場合でも、

```text
A.canvas → 1つのviewport状態
```

とする。

leafごとの状態にはしない。

### 理由

プラグインの目的は、

> 「このCanvasを最後にどこまで見ていたか」

を記憶することであり、

> 「このタブではどこを見ていたか」

ではないため。

将来必要になれば、

```text
file path + leaf ID
```

方式を追加できる。

MVPには含めない。

---

# 15. 設定画面

## MVP

基本的には設定不要とする。

ただし以下の1項目のみ用意してよい。

### Remember Canvas View

```text
Remember Canvas views
```

型:

```text
toggle
```

default:

```text
ON
```

OFFの場合:

* 新規状態保存を停止
* viewport復元を停止
* 既存データは削除しない

---

## 任意設定

余裕があれば以下を追加する。

### Reset stored views

ボタン:

```text
Clear saved Canvas views
```

押すと、

```ts
views = {};
```

とし、保存済みviewport情報をすべて削除する。

確認ダイアログ推奨。

---

# 16. コマンド

MVPではコマンドは必須ではない。

追加するなら以下のみ。

### Forget current Canvas view

Command ID:

```text
remember-canvas-view:forget-current
```

動作:

現在のCanvasについて、

```ts
delete views[currentPath];
```

を実行する。

次回そのCanvasを開いた場合はObsidian標準の初期表示となる。

---

# 17. データ構造

推奨最終形:

```ts
interface CanvasViewState {
  tx: number;
  ty: number;
  tZoom: number;
  updatedAt: number;
}

interface PluginSettings {
  enabled: boolean;
}

interface PluginData {
  version: 1;
  settings: PluginSettings;
  views: Record<string, CanvasViewState>;
}
```

初期値:

```ts
const DEFAULT_DATA: PluginData = {
  version: 1,
  settings: {
    enabled: true
  },
  views: {}
};
```

---

# 18. 内部Canvas型

Obsidian公式型にCanvas viewport操作が存在しないため、必要部分だけローカルで定義する。

```ts
interface InternalCanvas {
  tx: number;
  ty: number;
  tZoom: number;

  setViewport(
    tx: number,
    ty: number,
    tZoom: number
  ): void;
}

interface InternalCanvasView {
  file?: TFile;
  canvas?: InternalCanvas;
}
```

`any` をコード全体に広げない。

内部APIとの境界だけに閉じ込める。

例:

```ts
function getInternalCanvasView(
  leaf: WorkspaceLeaf
): InternalCanvasView | null
```

を用意し、他のコードはこの関数経由でアクセスする。

---

# 19. 内部API変更への耐性

Canvas viewport APIは公式公開Plugin APIではない。

そのため、

```ts
canvas.setViewport
canvas.tx
canvas.ty
canvas.tZoom
```

の存在を毎回確認する。

既存のAdvanced CanvasもCanvas内部型としてこれらを定義して利用しているが、Obsidian公式APIの保証対象ではない。

### ガード

```ts
function isValidCanvas(
  canvas: unknown
): canvas is InternalCanvas
```

を実装する。

条件:

```text
canvas != null
tx が number
ty が number
tZoom が number
setViewport が function
```

条件を満たさない場合は、

```text
何もしない
```

とする。

Obsidian全体を壊す例外を発生させてはいけない。

---

# 20. エラー処理

原則:

```text
viewport復元失敗
=
Canvasを普通に表示する
```

とする。

プラグインの失敗によって、

* Canvasが開けない
* ノートが開けない
* Obsidian操作不能

となってはいけない。

例:

```ts
try {
  restoreViewport();
} catch (error) {
  console.error(
    "[Remember Canvas View] Failed to restore viewport",
    error
  );
}
```

通常ユーザーにはNoticeを出さない。

連続エラー時に大量の通知が出ないようにする。

---

# 21. パフォーマンス要件

プラグイン無効時:

```text
実質オーバーヘッドなし
```

プラグイン有効時でも、

Canvasを開いていない場合はpollingを停止する。

Canvas表示中のみviewport監視を行う。

polling:

```text
250〜500ms
```

程度。

ディスク書き込み:

```text
debounce 500ms以上
```

とする。

毎フレーム保存しない。

---

# 22. セキュリティ・プライバシー

外部通信を行わない。

以下のみ保存する。

```text
Canvasファイルパス
viewport X
viewport Y
zoom
更新日時
```

Canvas本文、

* ノード内容
* テキスト
* 添付ファイル
* リンク内容

などは保存しない。

---

# 23. 非機能要件

### NFR-01

Canvasファイル自体を書き換えない。

### NFR-02

外部通信を行わない。

### NFR-03

依存ライブラリは可能な限り追加しない。

### NFR-04

プラグイン無効化後もCanvasファイルには影響を残さない。

### NFR-05

内部Canvas APIが変更されてもObsidianをクラッシュさせない。

### NFR-06

大量のCanvasファイルが存在しても通常操作を阻害しない。

---

# 24. MVP対象環境

初期バージョンは、

```text
Obsidian Desktop
```

を優先して開発・テストする。

Windows / macOS / Linuxで同一ロジックを使用する。

Mobile対応は第二段階とする。

manifestの初期方針は、Mobileで未検証の間はDesktop限定としてもよい。

---

# 25. MVP対象外

以下は初期バージョンでは実装しない。

* 複数のviewportブックマーク
* Canvasごとの開始位置指定
* ノード単位のカメラ保存
* ズーム履歴
* 戻る・進む履歴
* Canvas viewport同期
* デバイス間viewport同期専用機能
* Canvas JSONへのviewport埋め込み
* viewportアニメーション
* Excalidraw対応
* PDF対応
* Markdownスクロール位置保存

**Canvasの最後の表示位置を覚えることだけに集中する。**

---

# 26. 受け入れテスト

## Test 1: 基本復元

1. A.canvasを開く
2. 任意の位置まで移動
3. 40%程度までズームアウト
4. B.canvasを開く
5. A.canvasへ戻る

期待:

```text
A.canvasが手順2・3と同じ位置・倍率で表示される
```

---

## Test 2: Canvas別保存

1. A.canvas → 左上・50%
2. B.canvas → 右下・100%
3. A.canvasを開く
4. B.canvasを開く

期待:

```text
A → 左上・50%
B → 右下・100%
```

それぞれ独立して復元される。

---

## Test 3: Obsidian再起動

1. A.canvasを任意位置へ移動
2. Obsidian終了
3. Obsidian起動
4. A.canvasを開く

期待:

```text
終了前のviewportへ復元される
```

---

## Test 4: 初回Canvas

1. 一度も保存されていないC.canvasを開く

期待:

```text
プラグインはviewportを変更しない
```

---

## Test 5: Rename

1. A.canvasでviewport保存
2. A.canvas → B.canvasへ名前変更
3. B.canvasを開く

期待:

```text
旧A.canvasのviewportがB.canvasへ引き継がれる
```

---

## Test 6: Delete

1. A.canvasのviewport保存
2. A.canvas削除

期待:

```text
data.jsonからA.canvasのstateが削除される
```

---

## Test 7: Markdown切り替え

```text
A.canvas
↓
note.md
↓
A.canvas
```

期待:

```text
A.canvasのviewportが復元される
```

---

## Test 8: 高速切り替え

```text
A
→ B
→ C
→ A
```

を素早く実行する。

期待:

```text
誤ったCanvasのviewportが適用されない
```

特に、

```text
BのviewportがAへ適用される
```

などのrace conditionが発生しないこと。

---

# 27. Race Condition対策

viewport復元処理を開始した時点で対象ファイルパスを保存する。

例:

```ts
const expectedPath = file.path;
```

実際に `setViewport()` を呼ぶ直前に、

```ts
currentView.file?.path === expectedPath
```

を再確認する。

異なる場合は復元を中止する。

これにより、

```text
Aを開く
↓
Aの復元待機中
↓
すぐBを開く
↓
遅れてAのviewportがBへ適用
```

という事故を防ぐ。

---

# 28. 推奨クラス構成

```text
main.ts
 ├─ RememberCanvasViewPlugin
 │
 ├─ ViewStateStore
 │   ├─ get(path)
 │   ├─ set(path, state)
 │   ├─ rename(oldPath, newPath)
 │   ├─ delete(path)
 │   └─ flush()
 │
 ├─ CanvasTracker
 │   ├─ attach()
 │   ├─ detach()
 │   ├─ capture()
 │   └─ poll()
 │
 └─ CanvasViewportAdapter
     ├─ getCanvasView()
     ├─ getViewport()
     ├─ setViewport()
     └─ isSupported()
```

特に、

```text
CanvasViewportAdapter
```

へ内部API依存部分を集中させる。

Obsidian側のCanvas内部実装が変更された場合、このクラスだけ直せる構造にする。

---

# 29. 推奨ディレクトリ

```text
remember-canvas-view/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── src/
│   ├── main.ts
│   ├── canvas-adapter.ts
│   ├── canvas-tracker.ts
│   ├── store.ts
│   ├── settings.ts
│   └── types.ts
└── README.md
```

Obsidian公式のsample pluginはTypeScriptベースのプラグイン雛形として提供されているため、プロジェクト初期構成はこれをベースにする。

---

# 30. 完成条件 Definition of Done

Version `0.1.0` は以下をすべて満たした時点で完成とする。

* [ ] Canvasごとにviewportを保存できる
* [ ] X位置を復元できる
* [ ] Y位置を復元できる
* [ ] ズーム倍率を復元できる
* [ ] Canvas A → Canvas B → Canvas Aで復元できる
* [ ] Canvas → Markdown → Canvasでも復元できる
* [ ] Obsidian再起動後も復元できる
* [ ] 初回Canvasでは標準表示を邪魔しない
* [ ] Canvas rename時にstateを引き継ぐ
* [ ] Canvas delete時にstateを削除する
* [ ] 高速なCanvas切り替えで別Canvasのviewportを誤適用しない
* [ ] `.canvas` ファイル本体を書き換えない
* [ ] 外部通信を行わない
* [ ] 内部Canvas API取得失敗時に安全にno-opになる

---

# 31. 最重要設計原則

本プラグインは多機能化しない。

ユーザー体験はただ一つ、

> Canvasを離れて、あとで戻ったら、さっき見ていた場所がそのまま出てくる。

これを確実に実現する。

UIや操作を増やすのではなく、Obsidian Canvasに最初から備わっているように感じる「透明な機能」として実装する。
