import type { GameTime, Resource } from '../types/common';
import { BaseSystem } from './BaseSystem';
import { EventBus, GameEvents } from './EventBus';

/**
 * 中央状態管理システム
 * 
 * すべてのゲーム状態とシステム管理を統合した中央管理クラス
 * - 全ゲーム状態の管理
 * - システムライフサイクル管理  
 * - 状態変更の完全追跡
 * - セーブ・ロード機能
 */

interface SaveData {
  version: string;
  gameTime: GameTime;
  resources: Resource[];
  characters: any[]; // 後で詳細型定義
  teams: any[]; // 後で詳細型定義
  buildings: any[]; // 後で詳細型定義
  lastSaveTime: number;
  lastPlayTime: number;
}

interface StateChangeLog {
  timestamp: number;
  componentId: string;
  target: string;
  oldValue: any;
  newValue: any;
  reason: string;
}

export class CentralStateManager {
  private static instance: CentralStateManager;
  private eventBus: EventBus;
  
  // === システム管理 ===
  private systems: Map<string, BaseSystem> = new Map();
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;
  private animationFrameId: number | null = null;
  private readonly targetFPS: number = 60;
  private readonly targetFrameTime: number = 1000 / this.targetFPS;
  private accumulator: number = 0;
  
  // === ゲーム状態 ===
  private _isPaused: boolean = false;
  private _gameTime: GameTime = {
    year: 1,
    season: 0,
    day: 1,
    hour: 6
  };
  
  // === 6つの管理状態 ===
  private _resources: Map<string, Resource> = new Map();
  private _characters: Map<string, any> = new Map(); // 後で詳細型定義
  private _teams: Map<string, any> = new Map(); // 後で詳細型定義
  private _buildings: Map<string, any> = new Map(); // 後で詳細型定義
  private _inventories: Map<string, any> = new Map(); // 後で詳細型定義
  
  // === 状態変更追跡 ===
  private _stateChanges: StateChangeLog[] = [];
  private _lastSaveTime: number = Date.now();
  private _lastPlayTime: number = Date.now();

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.initializeResources();
  }

  static getInstance(): CentralStateManager {
    if (!CentralStateManager.instance) {
      CentralStateManager.instance = new CentralStateManager();
    }
    return CentralStateManager.instance;
  }

  // ===============================================
  // システム管理機能（旧GameManager）
  // ===============================================

  /**
   * システムを登録
   */
  registerSystem(name: string, system: BaseSystem): void {
    if (this.systems.has(name)) {
      console.warn(`System ${name} is already registered`);
      return;
    }

    this.systems.set(name, system);
    console.log(`System registered: ${name}`);
  }

  /**
   * システムを取得
   */
  getSystem<T extends BaseSystem>(name: string): T | undefined {
    return this.systems.get(name) as T;
  }

  /**
   * すべてのシステムを初期化
   */
  async initialize(): Promise<void> {
    console.log('Initializing Central State Manager...');
    
    // セーブデータ読み込み
    const loaded = this.load();
    if (loaded) {
      console.log('Save data loaded successfully');
    } else {
      console.log('Starting new game');
    }
    
    // 全システム初期化
    for (const [name, system] of this.systems) {
      try {
        await system.initialize();
        console.log(`✓ ${name} system initialized`);
      } catch (error) {
        console.error(`✗ Failed to initialize ${name} system:`, error);
        throw error;
      }
    }
    
    console.log('All systems initialized successfully');
  }

  /**
   * ゲームループ開始
   */
  start(): void {
    if (this.isRunning) {
      console.warn('Game is already running');
      return;
    }

    console.log('Starting game...');
    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    
    // システム開始
    this.systems.forEach((system, name) => {
      try {
        system.start();
        console.log(`✓ ${name} system started`);
      } catch (error) {
        console.error(`✗ Failed to start ${name} system:`, error);
      }
    });

    // ゲームループ開始
    this.gameLoop();
    
    // オフライン時間の処理
    this.processOfflineTime();
    
    console.log('Game started successfully');
  }

  /**
   * ゲームループ停止
   */
  stop(): void {
    if (!this.isRunning) {
      console.warn('Game is not running');
      return;
    }

    console.log('Stopping game...');
    this.isRunning = false;
    
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // システム停止
    this.systems.forEach((system, name) => {
      try {
        system.stop();
        console.log(`✓ ${name} system stopped`);
      } catch (error) {
        console.error(`✗ Failed to stop ${name} system:`, error);
      }
    });

    // セーブ
    this.save();
    
    console.log('Game stopped successfully');
  }

  /**
   * システム破棄
   */
  destroy(): void {
    this.stop();
    
    console.log('Destroying systems...');
    this.systems.forEach((system, name) => {
      try {
        system.destroy();
        console.log(`✓ ${name} system destroyed`);
      } catch (error) {
        console.error(`✗ Failed to destroy ${name} system:`, error);
      }
    });
    
    this.systems.clear();
    console.log('All systems destroyed');
  }

  /**
   * ゲームループ
   */
  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastUpdateTime, 100); // 最大100ms
    this.lastUpdateTime = currentTime;

    this.accumulator += deltaTime;

    // 固定タイムステップで更新
    while (this.accumulator >= this.targetFrameTime) {
      this.updateSystems(this.targetFrameTime);
      this.accumulator -= this.targetFrameTime;
    }

    this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
  }

  /**
   * システム更新
   */
  private updateSystems(deltaTime: number): void {
    this.systems.forEach(system => {
      try {
        system.update(deltaTime);
      } catch (error) {
        console.error('System update error:', error);
      }
    });
  }

  // ===============================================
  // 状態管理機能（旧GameState）
  // ===============================================

  /**
   * 初期リソース設定
   */
  private initializeResources(): void {
    const initialResources: Resource[] = [
      { id: 'yen', name: '円', amount: 10000 },
      { id: 'otherworld_currency', name: '異世界通貨', amount: 100 },
      { id: 'food', name: '食料', amount: 50, max: 1000 },
      { id: 'water', name: '水', amount: 50, max: 1000 },
      { id: 'wood', name: '木材', amount: 200, max: 2000 },
      { id: 'stone', name: '石材', amount: 100, max: 1000 },
      { id: 'metal', name: '金属', amount: 50, max: 500 },
      { id: 'wheat', name: '小麦', amount: 0, max: 1000 },
      { id: 'wheatSeeds', name: '小麦の種', amount: 10, max: 100 }
    ];

    initialResources.forEach(resource => {
      this._resources.set(resource.id, resource);
    });
  }

  // === ゲッター ===
  get isPaused(): boolean {
    return this._isPaused;
  }

  get gameTime(): Readonly<GameTime> {
    return { ...this._gameTime };
  }

  get resources(): ReadonlyMap<string, Resource> {
    return new Map(this._resources);
  }

  get characters(): ReadonlyMap<string, any> {
    return new Map(this._characters);
  }

  get teams(): ReadonlyMap<string, any> {
    return new Map(this._teams);
  }

  get buildings(): ReadonlyMap<string, any> {
    return new Map(this._buildings);
  }

  // === 状態変更メソッド（ログ付き） ===

  /**
   * 状態変更をログに記録
   */
  private logStateChange(componentId: string, target: string, oldValue: any, newValue: any, reason: string): void {
    this._stateChanges.push({
      timestamp: Date.now(),
      componentId,
      target,
      oldValue,
      newValue,
      reason
    });

    // ログサイズ制限（最新1000件のみ保持）
    if (this._stateChanges.length > 1000) {
      this._stateChanges = this._stateChanges.slice(-1000);
    }
  }

  /**
   * リソース追加
   */
  addResource(resourceId: string, amount: number, reason: string = 'Unknown'): boolean {
    const resource = this._resources.get(resourceId);
    if (!resource) {
      console.warn(`Unknown resource: ${resourceId}`);
      return false;
    }

    const oldAmount = resource.amount;
    const newAmount = resource.max 
      ? Math.min(resource.amount + amount, resource.max)
      : resource.amount + amount;
    
    if (newAmount < 0) {
      console.warn(`Insufficient ${resourceId}: ${resource.amount} < ${Math.abs(amount)}`);
      return false;
    }

    resource.amount = newAmount;
    const actualChange = newAmount - oldAmount;

    if (actualChange !== 0) {
      this.logStateChange('CentralStateManager', `resource.${resourceId}`, oldAmount, newAmount, reason);
      
      this.eventBus.emit(GameEvents.RESOURCE_GAIN, {
        resourceId,
        amount: actualChange,
        total: newAmount,
        reason
      });
    }

    return true;
  }

  /**
   * リソース削除
   */
  removeResource(resourceId: string, amount: number, reason: string = 'Unknown'): boolean {
    return this.addResource(resourceId, -amount, reason);
  }

  /**
   * リソース保有量確認
   */
  hasResource(resourceId: string, amount: number): boolean {
    const resource = this._resources.get(resourceId);
    return resource ? resource.amount >= amount : false;
  }

  /**
   * リソース量取得
   */
  getResourceAmount(resourceId: string): number {
    const resource = this._resources.get(resourceId);
    return resource ? resource.amount : 0;
  }

  /**
   * 複数リソース保有確認
   */
  hasResources(requirements: Record<string, number>): boolean {
    return Object.entries(requirements).every(([resourceId, amount]) => 
      this.hasResource(resourceId, amount)
    );
  }

  /**
   * 複数リソース消費
   */
  consumeResources(requirements: Record<string, number>, reason: string = 'Resource consumption'): boolean {
    // 事前チェック
    if (!this.hasResources(requirements)) {
      return false;
    }

    // 実際の消費
    Object.entries(requirements).forEach(([resourceId, amount]) => {
      this.removeResource(resourceId, amount, reason);
    });

    return true;
  }

  /**
   * ゲーム時間設定
   */
  setGameTime(time: Partial<GameTime>, reason: string = 'Time update'): void {
    const oldTime = { ...this._gameTime };
    this._gameTime = { ...this._gameTime, ...time };
    
    this.logStateChange('CentralStateManager', 'gameTime', oldTime, this._gameTime, reason);
    
    // 時間変更イベント発火
    if (oldTime.hour !== this._gameTime.hour) {
      this.eventBus.emit(GameEvents.TIME_HOUR, this._gameTime);
    }
    if (oldTime.day !== this._gameTime.day) {
      this.eventBus.emit(GameEvents.TIME_DAY, this._gameTime);
    }
    if (oldTime.season !== this._gameTime.season) {
      this.eventBus.emit(GameEvents.TIME_SEASON, this._gameTime);
    }
  }

  /**
   * ゲーム一時停止
   */
  pause(): void {
    if (!this._isPaused) {
      this._isPaused = true;
      this.logStateChange('CentralStateManager', 'isPaused', false, true, 'Game paused');
      this.eventBus.emit(GameEvents.GAME_PAUSE);
    }
  }

  /**
   * ゲーム再開
   */
  resume(): void {
    if (this._isPaused) {
      this._isPaused = false;
      this.logStateChange('CentralStateManager', 'isPaused', true, false, 'Game resumed');
      this.eventBus.emit(GameEvents.GAME_RESUME);
    }
  }

  // ===============================================
  // セーブ・ロード機能
  // ===============================================

  /**
   * セーブ
   */
  save(): SaveData {
    const saveData: SaveData = {
      version: '2.0.0',
      gameTime: { ...this._gameTime },
      resources: Array.from(this._resources.values()),
      characters: Array.from(this._characters.values()),
      teams: Array.from(this._teams.values()),
      buildings: Array.from(this._buildings.values()),
      lastSaveTime: Date.now(),
      lastPlayTime: this._lastPlayTime
    };

    this._lastSaveTime = saveData.lastSaveTime;
    localStorage.setItem('idlegame_save', JSON.stringify(saveData));
    this.eventBus.emit(GameEvents.GAME_SAVE, saveData);

    console.log('Game saved successfully');
    return saveData;
  }

  /**
   * ロード
   */
  load(): boolean {
    try {
      const savedData = localStorage.getItem('idlegame_save');
      if (!savedData) {
        console.log('No save data found');
        return false;
      }

      const saveData: SaveData = JSON.parse(savedData);
      
      // バージョンチェック
      if (saveData.version !== '2.0.0') {
        console.warn(`Save data version mismatch: ${saveData.version} vs 2.0.0`);
        // バージョン移行処理が必要な場合はここで実装
      }

      // データ復元
      this._gameTime = saveData.gameTime;
      this._lastSaveTime = saveData.lastSaveTime;
      this._lastPlayTime = saveData.lastPlayTime;

      // リソース復元
      this._resources.clear();
      saveData.resources.forEach(resource => {
        this._resources.set(resource.id, resource);
      });

      // その他データ復元（後で実装）
      // this._characters, this._teams, this._buildings

      this.eventBus.emit(GameEvents.GAME_LOAD, saveData);
      console.log('Game loaded successfully');
      return true;
    } catch (error) {
      console.error('Failed to load save data:', error);
      return false;
    }
  }

  /**
   * オフライン時間処理
   */
  private processOfflineTime(): void {
    const currentTime = Date.now();
    const offlineTime = currentTime - this._lastPlayTime;
    
    if (offlineTime > 60000) { // 1分以上オフライン
      const offlineHours = Math.floor(offlineTime / (1000 * 60 * 60));
      console.log(`Offline for ${offlineHours} hours, processing...`);
      
      // オフライン進行処理（後で実装）
      this.eventBus.emit('OFFLINE_PROGRESS', {
        offlineTime,
        offlineHours
      });
    }
    
    this._lastPlayTime = currentTime;
  }

  /**
   * 状態変更履歴取得
   */
  getChangeHistory(target?: string): StateChangeLog[] {
    if (target) {
      return this._stateChanges.filter(log => log.target === target);
    }
    return [...this._stateChanges];
  }

  /**
   * デバッグ用統計情報
   */
  getDebugInfo() {
    return {
      systemCount: this.systems.size,
      isRunning: this.isRunning,
      isPaused: this._isPaused,
      resourceCount: this._resources.size,
      characterCount: this._characters.size,
      teamCount: this._teams.size,
      buildingCount: this._buildings.size,
      stateChangeCount: this._stateChanges.length,
      lastSaveTime: new Date(this._lastSaveTime).toISOString(),
      lastPlayTime: new Date(this._lastPlayTime).toISOString()
    };
  }
}