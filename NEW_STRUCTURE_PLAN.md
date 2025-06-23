# プロジェクト構造移行計画

## 🎯 新しい設計原則

### 核心コンセプト
1. **完全コンポーネント独立** - 各機能が独立したフォルダを持つ
2. **中央管理統一** - CentralStateManagerがすべての状態を管理
3. **関心の分離** - 各コンポーネントは自分のロジック、UI、型定義、スタイルを含む

## 📂 新しいフォルダ構造

```
src/
├── core/                           # 🏛️ 中央管理層
│   ├── CentralStateManager.ts     # ★ALL状態管理★ (GameManager+GameState統合)
│   ├── GameManager.ts             # ゲーム統括管理 (軽量化)
│   ├── BaseSystem.ts              # システム基底クラス
│   ├── EventBus.ts                # イベント通信
│   └── types/                     # 共通型定義
│       ├── common.ts              # 既存を移動
│       ├── state.ts               # 新規：状態管理型
│       └── events.ts              # 新規：イベント型
│
├── components/                     # 🧩 独立コンポーネント層
│   ├── character/                 # 👤 キャラクター管理
│   │   ├── CharacterSystem.ts     # systems/CharacterSystem.ts → 移動
│   │   ├── CharacterListComponent.ts # ui/components/ → 移動
│   │   ├── Character.ts           # entities/Character.ts → 移動
│   │   ├── CharacterFactory.ts    # utils/CharacterFactory.ts → 移動
│   │   ├── types.ts               # types/character.ts → 移動
│   │   └── character.scss         # 新規作成
│   │
│   ├── team/                      # 👥 チーム管理
│   │   ├── TeamSystem.ts          # systems/TeamWorkSystem.ts → リネーム移動
│   │   ├── TeamManagementComponent.ts # ui/components/ → 移動
│   │   ├── types.ts               # 新規作成
│   │   └── team.scss              # styles/team-management.scss → 移動
│   │
│   ├── building/                  # 🏗️ 建設管理
│   │   ├── BuildingSystem.ts      # systems/BaseSystem.ts → リネーム移動
│   │   ├── BuildingComponent.ts   # ui/components/BaseComponent.ts → リネーム移動
│   │   ├── Building.ts            # entities/Building.ts → 移動
│   │   ├── BuildingManager.ts     # managers/BuildingManager.ts → 移動
│   │   ├── types.ts               # types/building.ts → 移動
│   │   ├── buildings.json         # data/buildings.json → 移動
│   │   └── building.scss          # 新規作成
│   │
│   ├── cooking/                   # 🍳 料理システム (新規)
│   │   ├── CookingSystem.ts       # 新規作成
│   │   ├── CookingComponent.ts    # 新規作成
│   │   ├── types.ts               # 新規作成
│   │   ├── recipes.json           # 新規作成
│   │   └── cooking.scss           # 新規作成
│   │
│   ├── combat/                    # ⚔️ 戦闘システム (新規)
│   │   ├── CombatSystem.ts        # 新規作成
│   │   ├── CombatComponent.ts     # 新規作成
│   │   ├── types.ts               # 新規作成
│   │   └── combat.scss            # 新規作成
│   │
│   ├── exploration/               # 🔍 探索システム (新規)
│   │   ├── ExplorationSystem.ts   # 新規作成
│   │   ├── ExplorationComponent.ts # 新規作成
│   │   ├── types.ts               # 新規作成
│   │   └── exploration.scss       # 新規作成
│   │
│   └── time/                      # ⏰ 時間管理
│       ├── TimeSystem.ts          # systems/TimeSystem.ts → 移動
│       ├── TimeComponent.ts       # 新規作成
│       ├── types.ts               # 新規作成
│       └── time.scss              # 新規作成
│
├── ui/                            # 🎨 UI統括管理
│   ├── UIManager.ts               # 既存維持
│   ├── BaseComponent.ts           # ui/components/BaseComponent.ts → 移動
│   └── shared/                    # 共有UIコンポーネント
│       ├── HeaderComponent.ts     # ui/components/ → 移動
│       ├── MainScreenComponent.ts # ui/components/ → 移動
│       └── shared.scss            # 新規作成
│
├── utils/                         # 🛠️ ユーティリティ
│   ├── FormulaCalculator.ts       # managers/ → 移動
│   ├── DataManager.ts             # managers/ → 移動
│   └── BuildingDebugger.ts        # 既存維持
│
├── styles/                        # 🎨 グローバルスタイル
│   ├── main.scss                  # 既存維持
│   └── variables.scss             # 既存維持
│
└── main.ts                        # 🚀 エントリーポイント (更新)
```

## 🔄 移行作業フロー

### Phase 1: 中央管理統一
1. **CentralStateManager作成** (GameManager + GameState統合)
2. **BaseSystem更新** (新CentralStateManagerに対応)

### Phase 2: フォルダ構造作成
1. **components/**フォルダ作成
2. **各機能別サブフォルダ**作成
3. **core/types/**フォルダ作成

### Phase 3: ファイル移動・リファクタリング
1. **既存システム移動** (systems/ → components/[feature]/)
2. **UI移動** (ui/components/ → components/[feature]/ + ui/shared/)
3. **エンティティ移動** (entities/ → components/[feature]/)
4. **型定義移動** (types/ → components/[feature]/ + core/types/)
5. **データ移動** (data/ → components/[feature]/)

### Phase 4: 依存関係修正
1. **インポートパス修正**
2. **型定義更新**
3. **main.ts更新**

### Phase 5: 検証
1. **ビルド確認**
2. **動作テスト**
3. **独立性チェック**

## 🎯 各コンポーネントの責任範囲

### character/ (キャラクター管理)
- キャラクター生成・管理
- ステータス・スキル・能力値
- 部活システム
- キャラクター表示UI

### team/ (チーム管理)
- チーム編成・ドラッグ&ドロップ
- タスク割り当て
- 効率計算
- チーム作業UI

### building/ (建設管理)
- 建物建設・アップグレード
- レベルベース計算
- 建設効果
- 建設UI

### cooking/ (料理システム) ※新規
- 料理レシピ・材料管理
- 料理スキル・効果
- 料理UI

### combat/ (戦闘システム) ※新規
- 戦闘ロジック・敵管理
- 戦闘スキル・装備
- 戦闘UI

### exploration/ (探索システム) ※新規
- エリア探索・発見
- 探索スキル・報酬
- 探索UI

### time/ (時間管理)
- 時間進行・季節管理
- 時間イベント
- 時間表示UI

## 🔒 独立性保証

各コンポーネントは：
- **他コンポーネントを直接参照しない**
- **CentralStateManagerのみ知っている**
- **EventBus経由でのみ通信**
- **自分の責任範囲のみ管理**

この設計により：
- ✅ 新機能追加が容易
- ✅ バグの影響範囲が限定
- ✅ テストが簡単
- ✅ 保守性が向上