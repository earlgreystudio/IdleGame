# 異世界Idleゲーム - システム設計書

## 🏗️ このドキュメントの目的

**このドキュメントは何のためにあるのか：**
- システム全体のアーキテクチャを明確に定義する
- 各システム間の関係性と責任範囲を示す
- 新機能追加時の設計指針を提供する
- コードの保守性・拡張性を確保するためのルールを定める

**誰が使うのか：**
- 開発者（実装時の設計参考）
- アーキテクト（システム設計の検証）
- コードレビュアー（設計原則との整合性確認）
- 新しい開発者（プロジェクト理解のため）

**どんな時に参照するのか：**
- 新しいシステム・機能を追加する時
- 既存システムを変更・リファクタリングする時
- システム間の連携を実装する時
- パフォーマンス問題を解決する時
- コードレビューを行う時

---

## 📋 設計原則

### 🎯 核心原則
1. **完全独立コンポーネント** - 各システムは他の存在を知らない
2. **中央状態管理** - すべての状態変更は中央管理経由
3. **イベント駆動設計** - 疎結合な通信
4. **型安全性** - TypeScriptの厳格モードを活用

### 🔒 独立性の定義
```typescript
// ✅ 良い例：完全独立
class CookingSystem extends BaseSystem {
  // 中央管理のみ知っている
  // 他システムの存在を一切知らない
}

// ❌ 悪い例：依存関係あり
class BadCookingSystem {
  constructor(
    private combatSystem: CombatSystem,    // 他システムに依存
    private explorationSystem: ExplorationSystem
  ) {}
}
```

---

## 🏗️ システム構成

### 階層構造
```
┌─────────────────────────────────────────┐
│                UI Layer                 │ ← ユーザーインターフェース
├─────────────────────────────────────────┤
│              System Layer               │ ← 業務ロジック（独立）
├─────────────────────────────────────────┤
│               Core Layer                │ ← 中央管理・共通機能
├─────────────────────────────────────────┤
│              Entity Layer               │ ← データモデル
└─────────────────────────────────────────┘
```

### フォルダ構成
```
src/
├── core/                    # 中央管理層
│   ├── GameManager.ts       # システム統括管理
│   ├── GameState.ts         # 状態管理
│   ├── BaseSystem.ts        # システム基底クラス
│   └── EventBus.ts          # イベント通信
│
├── systems/                 # 独立システム層
│   ├── CharacterSystem.ts   # キャラクター管理
│   ├── TeamWorkSystem.ts    # チーム作業管理
│   ├── TimeSystem.ts        # 時間進行管理
│   ├── BaseSystem.ts        # 拠点管理
│   └── UISystem.ts          # UI管理
│
├── entities/                # エンティティ層
│   ├── Character.ts         # キャラクターモデル
│   └── Building.ts          # 建物モデル
│
├── ui/                      # UI層
│   ├── UIManager.ts         # UI統括管理
│   └── components/          # UIコンポーネント
│       ├── TeamManagementComponent.ts
│       ├── CharacterListComponent.ts
│       └── ...
│
├── types/                   # 型定義
│   ├── common.ts            # 共通型
│   ├── character.ts         # キャラクター関連型
│   └── building.ts          # 建物関連型
│
└── data/                    # 設定データ
    └── buildings.json       # 建物設定
```

---

## 🎮 中央管理システム

### GameManager（システム統括）
```typescript
class GameManager {
  private systems: Map<string, BaseSystem> = new Map();
  
  // システムの登録・管理
  registerSystem(name: string, system: BaseSystem): void
  getSystem<T extends BaseSystem>(name: string): T | undefined
  
  // ライフサイクル管理
  async initialize(): Promise<void>
  start(): void
  stop(): void
  destroy(): void
}
```

### GameState（状態管理）
```typescript
class GameState {
  // 全ゲーム状態を一元管理
  private _gameTime: GameTime
  private _resources: Map<string, Resource>
  private _isPaused: boolean
  
  // 状態変更メソッド（変更履歴つき）
  addResource(id: string, amount: number): boolean
  removeResource(id: string, amount: number): boolean
  setGameTime(time: Partial<GameTime>): void
}
```

### EventBus（イベント通信）
```typescript
class EventBus {
  // 優先度付きイベント管理
  on<T>(event: string, callback: EventListener<T>, options?: EventListenerOptions): EventSubscription
  emit<T>(event: string, data?: T): void
  
  // 定数で型安全なイベント名管理
  static readonly GameEvents = {
    TIME_HOUR: 'time:hour',
    CHARACTER_SPAWN: 'character:spawn',
    TASK_COMPLETE: 'task:complete',
    // ...
  }
}
```

---

## 🛠️ 独立システム設計

### BaseSystem（システム基底クラス）
```typescript
abstract class BaseSystem {
  protected eventBus: EventBus
  protected gameState: GameState
  
  // ライフサイクル
  async initialize(): Promise<void>
  start(): void
  stop(): void
  update(deltaTime: number): void
  destroy(): void
  
  // 各システムで実装
  protected abstract onInitialize(): Promise<void>
  protected abstract setupEventListeners(): void
  protected abstract onStart(): void
  protected abstract onStop(): void
  protected abstract onUpdate(deltaTime: number): void
  protected abstract onDestroy(): void
}
```

### システム実装パターン
```typescript
class TeamWorkSystem extends BaseSystem {
  // 自分の責任範囲のデータのみ管理
  private taskDefinitions: Map<string, TaskDefinition> = new Map()
  private activeTeamTasks: Map<string, TeamTaskData> = new Map()
  
  protected setupEventListeners(): void {
    // 時間進行イベントのみ監視
    this.eventBus.on(GameEvents.TIME_HOUR, () => {
      this.processTeamWork()
    })
  }
  
  // 外部インターフェース
  assignTaskToTeam(team: Team, taskId: string): boolean
  stopTeamTask(teamId: string): void
  getTeamTaskProgress(teamId: string): number
  
  // 内部処理（他システムを知らない）
  private processTeamWork(): void
  private completeTeamTask(teamId: string, taskData: TeamTaskData): void
  private calculateTeamEfficiency(team: Team, task: TaskDefinition): number
}
```

---

## 🎨 UI設計パターン

### UIManager（UI統括管理）
```typescript
class UIManager {
  private components: Map<string, UIComponent> = new Map()
  
  registerComponent(name: string, component: UIComponent): void
  getComponent<T extends UIComponent>(name: string): T | undefined
  updateComponents(): void
}
```

### UIComponent（コンポーネント基底）
```typescript
interface UIComponent {
  element: HTMLElement
  initialize(): void
  update(): void
  destroy(): void
}
```

### 実装例：TeamManagementComponent
```typescript
class TeamManagementComponent implements UIComponent {
  private teamWorkSystem: TeamWorkSystem | null = null
  private characterSystem: CharacterSystem | null = null
  
  initialize(): void {
    // 必要なシステムを取得（直接参照はしない）
    const gameManager = GameManager.getInstance()
    this.teamWorkSystem = gameManager.getSystem<TeamWorkSystem>('teamwork')
    this.characterSystem = gameManager.getSystem<CharacterSystem>('character')
    
    this.setupEventListeners()
  }
  
  private setupEventListeners(): void {
    // イベントベースでシステム間連携
    this.eventBus.on('TEAM_WORK_PROGRESS', (data) => {
      this.updateTeamTaskProgress(data)
    })
  }
}
```

---

## 🔄 データフロー

### 状態変更の流れ
```
1. ユーザー操作
   ↓
2. UIComponent
   ↓
3. System（業務ロジック）
   ↓
4. GameState（状態変更）
   ↓
5. EventBus（変更通知）
   ↓
6. UIComponent（表示更新）
```

### 具体例：チーム作業開始
```typescript
// 1. ユーザーがタスク割り当てボタンをクリック
// 2. TeamManagementComponent
assignTaskToTeam(teamId: string, taskType: string) {
  const team = this.teams.get(teamId)
  
  // 3. TeamWorkSystem（業務ロジック）
  const success = this.teamWorkSystem.assignTaskToTeam(team, taskType)
  
  if (success) {
    // 4. GameState（リソース消費）
    this.gameState.removeResource('wheat', 2)
    
    // 5. EventBus（作業開始通知）
    this.eventBus.emit(GameEvents.TASK_START, {
      teamId: teamId,
      taskType: taskType
    })
  }
}

// 6. UIComponent（他コンポーネントも更新）
this.eventBus.on(GameEvents.TASK_START, (data) => {
  this.updateUI() // 表示更新
})
```

---

## ⚡ パフォーマンス設計

### メモリ管理
- **オブジェクトプール：** 頻繁に作成・削除されるオブジェクト
- **WeakMap使用：** 参照管理でメモリリーク防止
- **イベントリスナー管理：** 適切な登録・解除

### 更新最適化
```typescript
// デバウンス処理でUI更新頻度制御
private debouncedUpdate(): void {
  if (this.updateTimeout) {
    clearTimeout(this.updateTimeout)
  }
  
  this.updateTimeout = window.setTimeout(() => {
    this.update()
    this.updateTimeout = null
  }, 100) // 100msのデバウンス
}
```

### キャッシュ戦略
```typescript
// 計算結果のキャッシュ
class FormulaCalculator {
  private cache: Map<string, number> = new Map()
  
  calculate(config: FormulaConfig, level: number): number {
    const cacheKey = `${config.formula}_${level}`
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }
    
    const result = this.evaluateFormula(config, level)
    this.cache.set(cacheKey, result)
    return result
  }
}
```

---

## 🔧 開発・デバッグ支援

### システム検証ツール
```typescript
// 独立性チェックツール
function checkSystemIndependence(systemPath: string): IndependenceReport {
  const violations: string[] = []
  
  // 他システムのimportをチェック
  const forbiddenImports = ['../combat/', '../exploration/']
  // 直接的な状態変更をチェック
  const directStateChanges = ['.health =', '.mana =']
  
  return {
    isIndependent: violations.length === 0,
    violations
  }
}
```

### デバッグ用グローバル公開
```typescript
// 開発環境でのみ公開
if (import.meta.env?.DEV) {
  (window as any).gameManager = gameManager
  (window as any).gameState = gameState
  console.log('Debug mode: GameManager available as window.gameManager')
}
```

---

## 🚀 拡張性設計

### 新システム追加パターン
```typescript
// 1. BaseSystemを継承
class NewFeatureSystem extends BaseSystem {
  protected async onInitialize(): Promise<void> {
    // 初期化処理
  }
  
  protected setupEventListeners(): void {
    // 必要最小限のイベント監視
  }
}

// 2. GameManagerに登録
gameManager.registerSystem('newFeature', new NewFeatureSystem())

// 3. UIコンポーネント作成（必要に応じて）
class NewFeatureComponent implements UIComponent {
  // UIロジック
}
```

### 設定ファイルによる調整
```json
// data/newFeature.json
{
  "config": {
    "baseValue": 100,
    "scalingFactor": 1.5
  },
  "tasks": {
    "task1": {
      "duration": 3600,
      "rewards": {
        "experience": 50
      }
    }
  }
}
```

---

## 📊 品質保証

### 設計原則チェック
- [ ] 新システムは他システムを直接参照していないか
- [ ] 状態変更はGameState経由で行っているか
- [ ] イベント通信は適切に使用されているか
- [ ] 型定義は明確で安全か

### テスト戦略
```typescript
// システム独立性テスト
describe('TeamWorkSystem Independence', () => {
  it('should work without other systems', () => {
    const mockStateManager = new MockGameState()
    const teamWorkSystem = new TeamWorkSystem()
    
    // 他システムなしで動作するかテスト
    expect(teamWorkSystem.initialize()).resolves.toBeUndefined()
  })
})
```

---

## 🔄 今後の進化

### Phase 1: 基盤完成
- [x] 中央管理システム
- [x] 独立システム設計
- [x] イベント駆動通信
- [ ] オフライン進行計算

### Phase 2: 最適化
- [ ] パフォーマンス監視
- [ ] メモリ使用量最適化
- [ ] バンドルサイズ削減

### Phase 3: 高度な機能
- [ ] モジュール動的読み込み
- [ ] ワーカー活用
- [ ] リアルタイム同期

---

**最終更新：** 2024年6月23日  
**バージョン：** 2.0.0（チーム管理機能対応版）  
**レビュアー：** システムアーキテクト  
**次回レビュー予定：** Phase 1完了時