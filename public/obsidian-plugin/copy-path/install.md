手動インストールできます。ビルド済みなので、再ビルドは不要です。

  1. Obsidianの保管庫（Vault）フォルダを開きます。
  2. 次のフォルダを作成します。

  <Vault>/.obsidian/plugins/copy-path/

  Windowsの例:

  C:\Users\ユーザー名\Documents\MyVault\.obsidian\plugins\copy-path\

  3. 以下の3ファイルを作成したフォルダへコピーします。

  - public/obsidian-plugin/copy-path/manifest.json
  - public/obsidian-plugin/copy-path/main.js
  - public/obsidian-plugin/copy-path/versions.json

  配置後はこうなります。

  MyVault/
  └── .obsidian/
      └── plugins/
          └── copy-path/
              ├── manifest.json
              ├── main.js
              └── versions.json

  4. Obsidianを再起動するか、コマンドパレットから「Reload app without saving」を実行します。
  5. 「設定 → Community plugins」を開きます。
  6. 必要ならCommunity pluginsを有効化します。
  7. 「Canvas Zoom Sensitivity」をONにします。
  8. プラグイン設定の「Zoom sensitivity」で感度を調整します。

