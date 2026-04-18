---
aliases: 
tags: 
modified: 2026-04-17 07:41
date created: 2026-04-17 07:40
---
# ShoppingListApp Version History

## App Summary
買い物リストをスマホで使う個人用アプリ。  
商品管理・カテゴリ管理・買い物対象選択・購入チェックが可能。  
PWA化によりホーム画面からアプリ起動可能。

---

## v1.0.0 First Stable PWA Release
Date: 2026-04-17

### Completed
- GitHub Pages 公開
- PWAインストール対応
- Androidでアプリ起動可能
- URLバーなし standalone 起動
- valid icon適用
- オフライン起動確認
- データ保持確認
- UI正常動作確認

### Meaning
初の実用版。日常利用可能レベル到達。

### Known Limitations
- 更新通知なし
- iPhone挙動未確認
- 大量データ時の速度未検証

---

## v1.1.0 JSON Backup Release
Date: 2026-04-18

### Completed
- JSONエクスポート機能追加
- JSONインポート機能追加
- 全置換復元対応
- バックアップファイル保存対応
- データ保全性向上

### Meaning
機種変更・端末故障・誤削除への耐性が向上。
継続利用しやすい実用アプリへ進化。

### Known Limitations
- 自動バックアップなし
- Google Drive連携なし
- CSV形式未対応

---

## Next Candidate Versions

### v1.2.0 UX Upgrade
- 商品検索
- よく買う商品
- 並び替え改善

### v1.3.0 Cloud Backup
- Google Drive保存
- 自動バックアップ
- CSV出力

### v1.4.0 PWA Enhancement
- 更新通知
- キャッシュ更新最適化
- 起動速度改善

---

## Development Principles
- 小さく改善
- 安定版を壊さない
- Versionごとに履歴を残す

## v1.2.0 Drag Reorder Upgrade
Date: 2026-04-18

### Completed
- sortOrder入力廃止
- 商品管理ドラッグ並び替え
- カテゴリ管理ドラッグ並び替え
- ハンドル限定ドラッグ対応
- 一括追加フォーマット簡素化

### Meaning
毎日の操作ストレスを削減し、
直感的に管理できるUXへ改善。

---

## v1.3.0 Free Memo Release
Date: 2026-04-18

### Completed
- フリーメモ機能追加
- 買い物リストにメモ入力可能
- メモの選択・購入チェック対応
- バックアップ対応
- 即時編集（対象選択モード）
- 読み取り専用（買い物モード）

### Meaning
買い物時の細かいメモやタスクを
アプリ内で管理可能に。
より柔軟な買い物リストへ進化。

### Known Limitations
- メモの並び替えなし
- 期限設定なし
- 通知機能なし

---

## Next Candidate Versions

### v1.4.0 PWA Enhancement
- 更新通知
- キャッシュ更新最適化
- 起動速度改善

### v1.5.0 Cloud Backup
- Google Drive保存
- 自動バックアップ
- CSV出力

---

## Development Principles
- 小さく改善
- 安定版を壊さない
- Versionごとに履歴を残す

# 次バージョン候補

## v1.3

- よく買う商品
- クラウドバックアップ
- iPhone検証

---

# 一言

> v1.2 は「機能追加」ではなく「使いやすさの格上げ」です。

## v1.3.0 Free Memo Release

### Completed
- Free Memo feature added
- Select mode editable rows
- Shopping mode read-only display
- Backup compatible
- UI polished to match product rows