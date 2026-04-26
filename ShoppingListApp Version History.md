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

## v1.3.0 フリーメモ機能リリース

### Completed
- フリーメモ機能を追加
- 対象選択モードで直接編集できる行を実装
- 買い物モードでは閲覧専用表示に対応
- バックアップ機能との互換性を確保
- 商品一覧と統一感のあるUIへ調整
## v1.3.2 UI Stability & PWA Refresh
Date: 2026-04-19
### Completed
- 買い物モードのモード切替ボタンをオレンジ背景＋白文字へ調整
- チェックボックスデザインを全画面で白黒反転型へ統一
- ON/OFF状態の視認性を改善
- 商品管理 / カテゴリ管理 / 対象選択 / 買い物モード間でUIルール統一
- service-worker.js のキャッシュバージョン更新
- スマホPWAで最新CSS/JSが反映されにくい問題を改善

### Meaning
日常利用時の操作視認性とデザイン統一感を向上。  
PWA更新反映の安定性も強化し、実運用品質を高めた版。

### Known Limitations
- 端末やブラウザによってPWA更新反映タイミングに差がある
- 長期利用時の大量データ性能は未検証
- iPhone系ブラウザ挙動は継続確認

# 1.3.2までのChatGPTのおさらい
メモ：新しい板での引継ぎプロンプト
	ShoppingListApp 開発の継続です。
	このチャットでは、過去の開発板で積み上げた文脈・ルール・設計思想を引き継いだ前提で対応してください。
	単発回答ではなく、既存プロジェクトの継続開発担当として振る舞ってください。
	
	【プロジェクト概要】
	個人利用のスマホ向け買い物リストPWAアプリ。
	GitHub Pages 公開済み。
	スマホホーム画面から起動して使う前提。
	オフライン利用・ローカル保存対応。
	
	【現状バージョン】
	v1.3.2 完了
	
	【ここまでの主な実装済み機能】
	・商品管理（追加 / 編集 / 削除）
	・カテゴリ管理（追加 / 編集 / 削除）
	・商品一括追加
	・カテゴリ一括追加
	・内部 sortOrder 管理
	・ドラッグハンドルによる並び替え
	・買い物対象選択モード
	・買い物モード
	・購入チェック
	・フリーメモ機能
	・JSON export / import バックアップ
	・PWAインストール対応
	・Service Worker キャッシュ更新運用
	
	【UI仕様】
	・ダークテーマ基調
	・対象選択モード = 青系
	・買い物モード = オレンジ系アクティブタブ
	・モード切替で視覚的に判別できること
	・スマホ表示最優先（PC表示は副次）
	
	【重要な既存仕様】
	・商品一覧 / カテゴリ一覧の並び順は内部 sortOrder で管理
	・ユーザーに sort番号は見せない
	・並び替えはドラッグハンドル操作のみ
	・行本体長押しでドラッグ開始は禁止
	・対象選択モードと買い物モードでは並び替え不可
	
	【フリーメモ仕様】
	・対象選択モード上段に表示
	・1件ずつ追加
	・即時編集反映
	・チェックONで買い物モード上段表示
	・買い物モードでは閲覧専用
	・削除可能
	・localStorage保存対象
	
	【データ保存】
	localStorage 使用
	
	【ファイル構成】
	index.html
	style.css
	script.js
	service-worker.js
	manifest.webmanifest
	
	【開発運用ルール】
	・変更は小さく安全に行う
	・既存機能を壊さないこと最優先
	・差分影響範囲を説明すること
	・実装前に仕様整理すること
	・push前提でローカル確認を重視
	・PWA更新時は service-worker.js の cache version 更新を考慮
	
	【回答ルール（重要）】
	・頭の悪い初学者向け回答は禁止
	・既存コードベースを理解した中級以上の開発者として回答
	・毎回ゼロベース説明しない
	・既存仕様との整合性を見て提案する
	・簡単な修正なら style.css / script.js のどこを触るか明示
	・Git運用まで含めて現実的に回答
	
	【あなたに期待する役割】
	ShoppingListApp 専属のテックリード兼実装アシスタント
	
	【まず理解して返答してほしいこと】
	1. 現在のアプリ状態の要約
	2. 今後の改善余地 TOP10
	3. このプロジェクトで回答するときの方針
	
	以後、この前提を維持して会話してください。

## v1.3.3 UX改善リリース

### 完了内容

- カテゴリ未設定商品の「カテゴリなし」表示を各一覧から非表示化
- 買い物モードのフリーメモ行を全体タップでチェック切替可能に改善
- 対象選択モードのフリーメモ編集・削除操作は従来維持
- 一覧UIのノイズ削減と操作性向上

### 対象画面

- 買い物リスト（対象選択モード）
- 買い物リスト（買い物モード）
- 商品管理（商品一覧）

### 互換性

- localStorage互換維持
- JSONバックアップ互換維持
- データ構造変更なし

### v1.3.4 アイコン刷新リリース

#### Completed

- アプリアイコンを刷新
- ホーム画面での見栄えを改善
- `icon-192.png` を新デザインへ更新
- `icon-512.png` を新デザインへ更新
- インストール済みPWAで新アイコンが反映されるよう、必要に応じて Service Worker のキャッシュ更新を実施

#### Affected

- ホーム画面アイコン
- PWAインストール時のアイコン
- manifest 参照アイコン資産
- Service Worker キャッシュ

#### Notes

- 機能仕様の変更なし
- localStorage 保存構造の変更なし
- 既存データ互換性維持
- 今回の更新は見た目品質とアプリ印象の改善が主目的

### v1.3.5 一括削除UX改善リリース

#### Completed

- 商品管理の一括削除モードに「すべてチェック」「すべて解除」を追加
- カテゴリ管理の一括削除モードに「すべてチェック」「すべて解除」を追加
- カテゴリ管理に商品管理と同様の一括削除モードを追加
- カテゴリ管理ヘッダーに「一括削除」ボタンを追加
- カテゴリ管理では通常時に一括操作エリアを非表示化
- カテゴリ管理の一括削除モード中のみ、一括操作エリアを表示するよう改善
- カテゴリ管理で「キャンセル」押下時に一括削除モード終了・選択解除されるよう対応
- 通常時はドラッグハンドル表示、一括削除モード時はチェックボックス表示に切り替えるよう統一

#### Affected

- 商品管理画面
- カテゴリ管理画面
- 一括削除操作導線
- 選択UIの表示切替

#### Notes

- 使用中カテゴリの削除不可ルールは維持
- 並び替え仕様は変更なし
- localStorage 保存構造の変更なし
- 既存データ互換性維持
- 今回の更新は一括削除操作の効率化とUI統一が主目的

### v1.3.6 買い物モードUX改善リリース

#### Completed

- 買い物モードで未購入商品を上、購入済み商品を下に表示するよう改善
- 買い物モードで未購入フリーメモを上、購入済みフリーメモを下に表示するよう改善
- 各グループ内では既存の相対順を維持する表示順に調整
- 購入チェック操作後に、画面下部へ「元に戻す」付きの一時Undo UIを追加
- Undoは直前1件のみ対象とし、約4秒で期限切れになるよう対応
- 新しい購入チェック操作が発生した場合、Undo対象を最新操作で上書きする仕様を追加

#### Affected

- 買い物リスト（買い物モード）
- 商品表示順
- フリーメモ表示順
- 購入チェック後の操作導線

#### Notes

- 対象選択モードの表示順・挙動は変更なし
- 商品管理 / カテゴリ管理への影響なし
- sortOrder の変更なし
- localStorage 保存構造の変更なし
- 既存データ互換性維持
- 今回の更新は買い物中の視認性向上と誤操作リカバリ性の改善が主目的

## v1.3.7 Mission Complete Popup Release

### Completed
- 買い物モードで全対象購入済み時に Mission Complete ポップアップ表示を追加
- 商品・フリーメモ両方を完了判定対象に対応
- mission-complete.webp を使用した中央演出表示を追加
- フェードイン＋軽いスケールアップ演出を追加
- 約3秒後に自動で非表示になる仕様を追加
- 同じ完了状態で連続表示されない制御を追加
- 未購入化または対象変更時に再表示可能状態へリセット

### Affected
- 買い物モード
- 完了判定ロジック
- UI演出
- service-worker キャッシュ

### Notes
- localStorage構造変更なし
- sortOrder変更なし
- Undo機能との互換維持
- PWAオフライン利用対応のため mission-complete.webp をキャッシュ追加

## v1.3.8 Selection Memory Release

### Completed
- 対象選択モードにメモリ機能 1 / 2 / 3 を追加
- 短押しで登録済み選択状態を呼び出し
- 長押しで現在の選択状態を保存
- 商品 + フリーメモの選択状態保存に対応
- メモリ機能用ヘルプツールチップ追加
- バックアップ export / import に selectionMemories を追加
- service-worker cache version を v9 に更新

## v1.3.9 Memory UX Polish Release

### Completed
- メモリ登録確認 / 登録完了 / 未登録通知をアプリ内モーダルへ統一
- localhost / github.io の不要タイトル表示を解消
- メモリボタンサイズと余白を改善
- 長押し時のテキスト選択を防止
- service-worker cache version を v10 に更新

## v1.4.0 Memory Naming Release

### Completed
- メモリ登録モーダルに名前入力欄を追加
- メモリごとに任意の名前を保存可能
- メモリ名をボタンへ反映
- 長押し時に現在の正式名を入力欄へ自動表示
- バックアップ export / import にメモリ名対応
- service-worker cache version を v11 に更新

## v1.4.1 Reward Popup UX Update

### Completed
- Reward popup に Normal / Rare / Super Rare 演出を追加
- complete_n.webp / complete_r.webp / complete_sr.webp に対応
- Rare / Super Rare の前振り時間を調整
- 閉じるボタンを追加
- Reward popup のタイマー後始末を改善
- service-worker cache version を v13 に更新

## v1.4.2 Reward Cooldown Update

### Completed
- Rare / Super Rare 演出に5分クールダウンを追加
- クールダウン中は Normal 演出のみ表示
- localStorage に抽選時刻を保存
- ON/OFF連打によるレア演出連続抽選を防止
- service-worker cache version を v14 に更新

## v1.4.3 Mobile UX Improvement Release

### Completed
- 商品管理 / カテゴリ管理の操作ボタン配置をスマホ向けに最適化
- 一括追加 / 一括削除を横並び化
- 一括削除モードの操作ボタン配置を整理
- 買い物モード購入チェック後に500ms入力ロック追加
- checkbox表示と取り消し線状態の不整合を修正
- service-worker cache version を v18 に更新

## v1.4.4 Category Label Setting Release

### Completed
- 対象選択モード / 買い物モードの商品カテゴリ名表示設定を追加
- デフォルトでカテゴリ名を非表示化
- ハンバーガーメニュー内に設定説明ツールチップ追加
- ハンバーガーメニューを「画面」「表示設定」「データ管理」に整理
- service-worker cache version を v21 に更新

## v1.4.5 Quokka Icon Update

### Completed
- PWAホーム画面アイコンをクアッカワラビーデザインに刷新
- icon-192.png / icon-512.png を更新
- service-worker cache version を v22 に更新

## v1.4.6 Splash Color Update

### Completed
- PWA起動時 / スプラッシュ背景色を #002D71 に変更
- manifest.webmanifest の background_color / theme_color を更新
- index.html の theme-color を更新
- service-worker cache version を v23 に更新

## v1.4.7 Icon Refresh Release

### Completed
- PWAホーム画面アイコンを再刷新
- icon-192.png / icon-512.png を更新
- service-worker cache version を v24 に更新

## v1.4.8 Reward Image Refresh

### Completed
- Reward popup 通常 / Rare / Super Rare 画像を更新
- complete_n.webp / complete_r.webp / complete_sr.webp を更新
- service-worker cache version を v25 に更新

## v1.4.9 Purchase Move Setting Update

### Completed
- ハンバーガーメニューの表示設定に「購入済みを下へ移動」を追加
- デフォルトON
- OFF時は買い物モードで購入済みにしても行順を維持
- ON時は従来通り購入済み商品を下へ移動
- service-worker cache version を v26 に更新

## v1.4.10 Bulk Select Update

### Completed
- 対象選択モードに 全選択 を追加
- 全選択で商品とフリーメモを一括選択可能
- 対象選択モードの操作行に 全選択 / 全解除 を配置
- 商品管理 一括削除モードの表記を 全選択 / 全解除 に統一
- カテゴリ管理 一括削除モードの表記を 全選択 / 全解除 に統一
- UI文言を全体的に統一
- service-worker cache version を v27 に更新

## v1.4.11 Compact UI & Version Display Update

### Completed
- メモリボタンの表示を保存名の先頭1文字に変更
- メモリボタンサイズをスマホ幅向けに調整
- 対象選択モードの操作行レイアウトを改善
- Undo snackbar の文言を「チェック状態を変更」に短縮
- Undo snackbar を1行表示・コンパクト化
- Snackbar表示中のみ下部余白を追加し、最下段項目を押しやすく改善
- ハンバーガーメニュー最下部にアプリVersionを表示
- APP_VERSION 定数でVersion表示を一元管理
- service-worker cache version を v31 に更新

## v1.4.12 Target Selection Help Consolidation

### Completed
- Removed the separate memory help button from the target selection controls.
- Integrated memory button explanations into the main help tooltip.
- Added explanations for 全選択 and 全解除.
- Improved compact mobile layout so memory buttons and bulk selection controls fit better in one row.

## v1.4.14 Tooltip Visual Noise Reduction

### Completed
- ツールチップ内のメモリボタン説明に「※対象選択モード時のみ」を追加
- ツールチップ内の全選択説明に「※対象選択モード時のみ」を追加
- ツールチップ内の全解除説明に「※対象選択モード時のみ」を追加
- ツールチップ内の「※対象選択モード時のみ」を補助テキスト表示へ変更
- 補助テキストを小さめ・グレー・通常ウェイトに調整
- ツールチップ見出しの主文言を見やすく維持
- 対象選択モードのフリーメモ入力欄を操作パネル内へ統合
- 操作エリアとフリーメモ追加エリアをまとめ、スマホ表示時の縦方向の余白を削減
- 対象選択モードの操作パネルにダークブルー系背景を適用
- 買い物モードの操作パネルにダークオレンジ系背景を適用
- 買い物モードのチェック操作に軽量タップアニメーションを追加
- APP_VERSION を 1.4.14 に更新
- service-worker cache version を更新
