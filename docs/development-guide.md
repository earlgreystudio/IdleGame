# 異世界Idleゲーム - 開発ガイド

## 👨‍💻 このドキュメントの目的

**このドキュメントは何のためにあるのか：**
- 開発者が守るべきルールとベストプラクティスを定義する
- コード品質の一貫性を保つためのガイドラインを提供する
- 新しい開発者がプロジェクトに参加しやすくする
- コードレビューの基準を明確にする

**誰が使うのか：**
- 新規参加の開発者（開発環境構築・コーディング規約の理解）
- 既存開発者（実装時の確認・リファクタリング時の参考）
- コードレビュアー（レビュー基準として）
- プロジェクトリーダー（品質管理の指標として）

**どんな時に参照するのか：**
- 開発環境を構築する時
- 新しいシステム・機能を実装する時
- コードレビューを行う時
- 既存コードをリファクタリングする時
- エラーやバグを修正する時

---

## 📋 目次

1. [開発環境セットアップ](#開発環境セットアップ)
2. [コーディング規約](#コーディング規約)
3. [システム実装ガイド](#システム実装ガイド)
4. [コンポーネント独立性ルール](#コンポーネント独立性ルール)
5. [UI開発ガイド](#ui開発ガイド)
6. [テスト・デバッグ](#テスト・デバッグ)
7. [パフォーマンス最適化](#パフォーマンス最適化)

---

## 🛠️ 開発環境セットアップ

### 必要な環境
```bash
# Node.js（推奨: v18以上）
node --version

# npm または yarn
npm --version

# Git
git --version
```

### プロジェクトセットアップ
```bash
# リポジトリクローン
git clone https://github.com/yourname/IdleGame.git
cd IdleGame

# 依存関係インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド確認
npm run build
```

### 推奨エディタ設定
```json
// .vscode/settings.json
{
  "typescript.preferences.importModuleSpecifier": "relative",
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "always"
  }
}
```

### 必須拡張機能
- **TypeScript Importer** - 自動import
- **ESLint** - コード規約チェック
- **Prettier** - コードフォーマット
- **Auto Rename Tag** - HTMLタグ編集

---

## 📝 コーディング規約

### TypeScript設定
```typescript
// tsconfig.json（重要な設定）
{
  "compilerOptions": {
    "strict": true,              // 厳格モード必須
    "noUnusedLocals": true,      // 未使用変数エラー
    "noUnusedParameters": true,  // 未使用パラメータエラー
    "exactOptionalPropertyTypes": true
  }
}
```

### 命名規約
```typescript
// ✅ 良い例
class TeamWorkSystem extends BaseSystem {}          // PascalCase: クラス
interface TaskDefinition {}                        // PascalCase: インターフェース
const MAX_TEAM_SIZE = 6                            // UPPER_SNAKE_CASE: 定数
let currentTaskId: string                          // camelCase: 変数
function calculateTeamEfficiency(): number {}      // camelCase: 関数

// ❌ 悪い例
class teamwork_system {}                           // snake_case NG
interface task_definition {}                       // snake_case NG
const maxTeamSize = 6                             // camelCase NG（定数）
let CurrentTaskId: string                         // PascalCase NG（変数）
```

### ファイル命名規約
```
✅ 良い例:
TeamWorkSystem.ts          // PascalCase: クラス
game-specification.md      // kebab-case: ドキュメント
team-management.scss       // kebab-case: スタイル
buildings.json            // kebab-case: データ

❌ 悪い例:
teamWorkSystem.ts          // camelCase NG
TeamWorkSystem.scss        // PascalCase NG（スタイル）
Buildings.json            // PascalCase NG（データ）
```

### インポート規約
```typescript
// ✅ 良い例: パス別にグループ化
// 1. 外部ライブラリ
import React from 'react'

// 2. 内部モジュール（@エイリアス）
import { GameManager } from '@core/GameManager'
import { BaseSystem } from '@core/BaseSystem'
import { Character } from '@entities/Character'

// 3. 相対パス
import { TeamData } from './types'
import './TeamManagement.scss'

// ❌ 悪い例: ランダム順序
import './TeamManagement.scss'
import { Character } from '@entities/Character'
import React from 'react'
import { TeamData } from './types'
```

---

## 🏗️ システム実装ガイド

### 新システム作成テンプレート
```typescript
// src/systems/NewSystem.ts
import { BaseSystem } from '@core/BaseSystem'
import { EventBus, GameEvents } from '@core/EventBus'

/**
 * 新機能システム
 * 責任範囲: [具体的な責任を記述]
 */
export class NewSystem extends BaseSystem {
  // 自分の責任範囲のデータのみ管理
  private internalData: Map<string, any> = new Map()
  
  protected async onInitialize(): Promise<void> {
    console.log('NewSystem initialized')
    // 初期化処理
  }
  
  protected setupEventListeners(): void {
    // 必要最小限のイベントのみ監視
    this.eventBus.on(GameEvents.TIME_HOUR, () => {
      this.processHourlyUpdate()
    })
  }
  
  // === 外部インターフェース ===
  public startFeature(params: any): boolean {
    // 外部から呼び出し可能なメソッド
    return true
  }
  
  public getFeatureStatus(id: string): any {
    // 状態取得メソッド
    return this.internalData.get(id)
  }
  
  // === 内部処理 ===
  private processHourlyUpdate(): void {
    // 時間進行時の処理
  }
  
  private calculateInternalLogic(): number {
    // 内部計算ロジック
    return 1.0
  }
  
  protected onStart(): void {
    console.log('NewSystem started')
  }
  
  protected onStop(): void {
    console.log('NewSystem stopped')
  }
  
  protected onUpdate(deltaTime: number): void {
    // フレーム更新処理（必要に応じて）
  }
  
  protected onDestroy(): void {
    console.log('NewSystem destroyed')
    this.internalData.clear()
  }
}
```

### システム登録
```typescript
// src/main.ts
import { NewSystem } from '@systems/NewSystem'

async function initializeApp() {
  const gameManager = GameManager.getInstance()
  
  // システムの登録（順序重要）
  gameManager.registerSystem('time', new TimeSystem())
  gameManager.registerSystem('character', new CharacterSystem())
  gameManager.registerSystem('newFeature', new NewSystem()) // 新システム追加
  gameManager.registerSystem('ui', new UISystem())
}
```

---

## 🔒 コンポーネント独立性ルール

### 🎯 独立性の原則

**各システムが守るべき絶対ルール：**

#### ✅ 知っていいもの
- **CentralStateManager** - 状態の取得・変更
- **EventBus** - イベント通信
- **自分の型定義** - 自システム用のinterface/type
- **共通ユーティリティ** - 日付計算、数学関数など

#### ❌ 知ってはいけないもの
- **他のシステムクラス** - CombatSystem, ExplorationSystem等
- **他のシステムの内部状態** - activeJobs, privateメソッド等
- **他のシステムの処理結果** - 戦闘結果、探索結果等

### 実装例：完全独立なシステム
```typescript
// ✅ 良い例：完全独立
export class CookingSystem extends BaseSystem {
  private activeJobs: Map<string, CookingJob> = new Map()
  // これだけを知っている（他システムは知らない）
  
  // 料理可能性の判定（他システムを知らずに判定）
  canStartCooking(characterId: string, recipeId: string): boolean {
    // 中央管理から必要な情報のみ取得
    const character = this.gameState.getCharacter(characterId)
    const recipe = this.getRecipe(recipeId)
    
    // 自分が知るべき条件のみチェック
    return (
      !this.activeJobs.has(characterId) &&           // 既に料理中でない
      character.status.health > 10 &&                // 最低限の体力
      this.gameState.hasResources(recipe.materials) && // 材料がある
      this.hasRequiredSkill(characterId, recipe)     // スキルレベル十分
    )
  }
  
  // 他システムの状態は一切考慮しない
  // 「戦闘中かどうか」「探索中かどうか」は知らない、知る必要もない
}

// ❌ 悪い例：依存関係あり
export class BadCookingSystem {
  constructor(
    private combatSystem: CombatSystem,      // 他システムに依存
    private explorationSystem: ExplorationSystem // 他システムに依存
  ) {}
  
  cookFood() {
    // 戦闘中は料理できない
    if (this.combatSystem.isInCombat()) {  // 他システムを知っている
      return false
    }
  }
}
```

### システム間の間接的な連携

**問題：** システム間で情報が必要な場合  
**解決方法：** 中央管理経由の状態共有

```typescript
// 1. 中央管理にキャラクターの状態を追加
class GameState {
  updateCharacterState(characterId: string, state: CharacterState): void {
    // state = 'idle' | 'cooking' | 'fighting' | 'exploring'
    this.characters.get(characterId).currentState = state
  }
  
  getCharacterState(characterId: string): CharacterState {
    return this.characters.get(characterId).currentState
  }
}

// 2. 各システムは自分の状態のみ更新
class CombatSystem extends BaseSystem {
  startCombat(characterId: string): void {
    // 戦闘開始時に状態更新
    this.gameState.updateCharacterState(characterId, 'fighting')
  }
  
  endCombat(characterId: string): void {
    // 戦闘終了時に状態更新
    this.gameState.updateCharacterState(characterId, 'idle')
  }
}

class CookingSystem extends BaseSystem {
  canStartCooking(characterId: string): boolean {
    // 中央管理から状態を取得（他システムは知らない）
    const state = this.gameState.getCharacterState(characterId)
    return state === 'idle' // idleの時のみ料理可能
  }
  
  startCooking(characterId: string): void {
    this.gameState.updateCharacterState(characterId, 'cooking')
  }
}
```

### 🚫 よくある独立性違反パターン

#### パターン1：直接的なシステム参照
```typescript
// ❌ 悪い例
class CookingSystem {
  constructor(
    private combatSystem: CombatSystem,    // 直接依存
    private explorationSystem: ExplorationSystem // 直接依存
  ) {}
  
  canCook(characterId: string): boolean {
    return !this.combatSystem.isInCombat(characterId) // 直接参照
  }
}

// ✅ 良い例
class CookingSystem extends BaseSystem {
  canCook(characterId: string): boolean {
    const state = this.gameState.getCharacterState(characterId)
    return state === 'idle'
  }
}
```

#### パターン2：グローバル状態の直接変更
```typescript
// ❌ 悪い例
class CookingSystem {
  cookFood() {
    // グローバル変数を直接変更
    window.gameState.resources.wheat -= 2
    window.gameState.characters.char1.hunger -= 50
  }
}

// ✅ 良い例
class CookingSystem extends BaseSystem {
  cookFood() {
    // 中央管理経由で変更
    this.gameState.removeResource('wheat', 2)
    this.gameState.updateCharacterStatus('char1', { hunger: -50 })
  }
}
```

---

## 🎨 UI開発ガイド

### UIComponent基本パターン
```typescript
// src/ui/components/NewComponent.ts
import { UIComponent } from '@ui/UIManager'
import { NewSystem } from '@systems/NewSystem'
import { GameManager } from '@core/GameManager'
import { EventBus, GameEvents } from '@core/EventBus'

export class NewComponent implements UIComponent {
  element: HTMLElement
  private newSystem: NewSystem | null = null
  private eventBus: EventBus
  
  constructor(element: HTMLElement) {
    this.element = element
    this.eventBus = EventBus.getInstance()
  }
  
  initialize(): void {
    // システム取得（直接参照はしない）
    const gameManager = GameManager.getInstance()
    this.newSystem = gameManager.getSystem<NewSystem>('newFeature')
    
    this.render()
    this.setupEventListeners()
    this.update()
  }
  
  private render(): void {
    this.element.innerHTML = `
      <div class="new-component">
        <h3>新機能</h3>
        <button id="feature-btn">機能実行</button>
        <div id="status-display"></div>
      </div>
    `
  }
  
  private setupEventListeners(): void {
    // ボタンイベント
    const button = document.getElementById('feature-btn')
    if (button) {
      button.addEventListener('click', () => {
        if (this.newSystem) {
          this.newSystem.startFeature({})
        }
      })
    }
    
    // システムイベント
    this.eventBus.on('NEW_FEATURE_UPDATE', (data) => {
      this.updateDisplay(data)
    })
  }
  
  private updateDisplay(data: any): void {
    const statusDisplay = document.getElementById('status-display')
    if (statusDisplay) {
      statusDisplay.textContent = `Status: ${data.status}`
    }
  }
  
  update(): void {
    // 定期的なUI更新
  }
  
  destroy(): void {
    this.element.innerHTML = ''
  }
}
```

### CSS設計ガイド
```scss
// src/styles/new-component.scss

// BEM記法を使用
.new-component {
  // ベース
  &__header {
    // エレメント
  }
  
  &--active {
    // モディファイア
  }
  
  &__button {
    // エレメント
    
    &:hover {
      // 疑似クラス
    }
    
    &--disabled {
      // エレメントのモディファイア
    }
  }
}

// 既存のデザインシステムを活用
.new-component {
  @extend .card; // 既存のカードスタイル
  
  .btn {
    @extend .btn--primary; // 既存のボタンスタイル
  }
}
```

---

## 🧪 テスト・デバッグ

### 独立性検証ツール
```typescript
// scripts/checkIndependence.ts
export function checkSystemIndependence(systemPath: string): IndependenceReport {
  const sourceCode = fs.readFileSync(systemPath, 'utf8')
  const violations: string[] = []
  
  // 他システムのimportをチェック
  const forbiddenImports = [
    '../combat/', '../exploration/', '../building/',
    'CombatSystem', 'ExplorationSystem', 'BuildingSystem'
  ]
  
  forbiddenImports.forEach(forbidden => {
    if (sourceCode.includes(forbidden)) {
      violations.push(`Forbidden import detected: ${forbidden}`)
    }
  })
  
  // 直接的な状態変更をチェック
  const directStateChanges = [
    '.health =', '.mana =', '.resources.',
    'window.gameState', 'globalState'
  ]
  
  directStateChanges.forEach(direct => {
    if (sourceCode.includes(direct)) {
      violations.push(`Direct state change detected: ${direct}`)
    }
  })
  
  return {
    isIndependent: violations.length === 0,
    violations
  }
}
```

### 使用例
```bash
# 全システムの独立性チェック
npm run check:independence

# 結果例
✅ CookingSystem: Independent
❌ CombatSystem: 2 violations found
  - Forbidden import: ../exploration/ExplorationSystem
  - Direct state change: character.health =
```

### デバッグ用ツール
```typescript
// 開発環境でのデバッグサポート
if (import.meta.env?.DEV) {
  // グローバルに公開
  (window as any).gameManager = gameManager
  (window as any).gameState = gameState
  
  // デバッグ用ヘルパー
  (window as any).debug = {
    // システム状態確認
    getSystemStatus: () => {
      const systems = gameManager.getAllSystems()
      return systems.map(system => ({
        name: system.constructor.name,
        initialized: system.isInitialized,
        running: system.isRunning
      }))
    },
    
    // 独立性チェック
    checkIndependence: (systemName: string) => {
      return checkSystemIndependence(`./src/systems/${systemName}.ts`)
    }
  }
}
```

---

## ⚡ パフォーマンス最適化

### メモリ管理
```typescript
// イベントリスナーの適切な管理
class MyComponent implements UIComponent {
  private eventSubscriptions: EventSubscription[] = []
  
  initialize(): void {
    // 登録時にsubscriptionを保存
    this.eventSubscriptions.push(
      this.eventBus.on(GameEvents.UPDATE, () => this.handleUpdate())
    )
  }
  
  destroy(): void {
    // 確実に解除
    this.eventSubscriptions.forEach(sub => sub.unsubscribe())
    this.eventSubscriptions = []
  }
}
```

### 更新頻度制御
```typescript
// デバウンス処理
private debouncedUpdate(): void {
  if (this.updateTimeout) {
    clearTimeout(this.updateTimeout)
  }
  
  this.updateTimeout = window.setTimeout(() => {
    this.update()
    this.updateTimeout = null
  }, 100) // 100msのデバウンス
}

// スロットリング処理
private throttledUpdate = throttle(() => {
  this.update()
}, 16) // 60FPS制限
```

---

## 🔍 品質チェックリスト

### 新機能実装時のチェック項目
- [ ] システムは他システムを直接参照していないか
- [ ] 状態変更はGameState経由で行っているか
- [ ] イベント通信は適切に使用されているか
- [ ] 型定義は明確で安全か
- [ ] エラーハンドリングは適切か
- [ ] パフォーマンスに問題はないか
- [ ] UIは既存のデザインシステムに従っているか
- [ ] ドキュメントは更新されているか

### コードレビュー観点
- **設計原則:** アーキテクチャガイドラインに準拠しているか
- **コード品質:** 可読性・保守性は十分か
- **型安全性:** TypeScriptの型システムを活用しているか
- **独立性:** システム間の依存関係は適切か
- **テスト:** 必要なテストは実装されているか

---

## 📚 参考資料

### 関連ドキュメント
- [game-specification.md](./game-specification.md) - ゲーム仕様
- [architecture.md](./architecture.md) - システム設計
- [README.md](./README.md) - プロジェクト概要

### 外部リソース
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Clean Code JavaScript](https://github.com/ryanmcdermott/clean-code-javascript)
- [BEM Methodology](https://en.bem.info/methodology/)

---

**最終更新：** 2024年6月23日  
**バージョン：** 2.0.0（チーム管理機能対応版）  
**メンテナー：** 開発チーム  
**次回更新予定：** 新機能追加時