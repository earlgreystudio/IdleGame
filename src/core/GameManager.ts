import { BaseSystem } from './BaseSystem';
import { EventBus, GameEvents } from './EventBus';
import { GameState } from './GameState';

export class GameManager {
  private static instance: GameManager;
  private systems: Map<string, BaseSystem> = new Map();
  private eventBus: EventBus;
  private gameState: GameState;
  
  private lastUpdateTime: number = 0;
  private animationFrameId: number | null = null;
  private isRunning: boolean = false;
  
  private readonly targetFPS: number = 60;
  private readonly targetFrameTime: number = 1000 / this.targetFPS;
  private accumulator: number = 0;

  private constructor() {
    this.eventBus = EventBus.getInstance();
    this.gameState = GameState.getInstance();
  }

  static getInstance(): GameManager {
    if (!GameManager.instance) {
      GameManager.instance = new GameManager();
    }
    return GameManager.instance;
  }

  registerSystem(name: string, system: BaseSystem): void {
    if (this.systems.has(name)) {
      console.warn(`System ${name} is already registered`);
      return;
    }

    this.systems.set(name, system);
  }

  getSystem<T extends BaseSystem>(name: string): T | undefined {
    return this.systems.get(name) as T;
  }

  async initialize(): Promise<void> {
    console.log('Initializing game systems...');
    
    // 保存データの読み込み
    const loaded = this.gameState.load();
    if (loaded) {
      console.log('Save data loaded successfully');
    } else {
      console.log('No save data found, starting new game');
    }

    // システムの初期化
    for (const [name, system] of this.systems) {
      console.log(`Initializing ${name}...`);
      await system.initialize();
    }

    // 自動保存の設定（5分ごと）
    setInterval(() => {
      if (this.isRunning && !this.gameState.isPaused) {
        this.gameState.save();
        console.log('Game auto-saved');
      }
    }, 5 * 60 * 1000);

    console.log('Game initialization complete');
  }

  start(): void {
    if (this.isRunning) {
      console.warn('Game is already running');
      return;
    }

    console.log('Starting game...');
    
    // システムの開始
    for (const [name, system] of this.systems) {
      system.start();
    }

    this.isRunning = true;
    this.lastUpdateTime = performance.now();
    this.gameLoop();
    
    // オフライン時間の処理
    const offlineTime = this.gameState.getOfflineTime();
    if (offlineTime > 60000) { // 1分以上オフラインだった場合
      this.processOfflineTime(offlineTime);
    }
    
    this.gameState.updateLastPlayTime();
    console.log('Game started');
  }

  stop(): void {
    if (!this.isRunning) {
      console.warn('Game is not running');
      return;
    }

    console.log('Stopping game...');
    
    // ゲームループの停止
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    // システムの停止
    for (const [name, system] of this.systems) {
      system.stop();
    }

    // 最終保存
    this.gameState.save();
    
    this.isRunning = false;
    console.log('Game stopped');
  }

  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const frameTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    this.accumulator += frameTime;

    // 固定タイムステップで更新
    while (this.accumulator >= this.targetFrameTime) {
      this.update(this.targetFrameTime / 1000); // 秒に変換
      this.accumulator -= this.targetFrameTime;
    }

    this.animationFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number): void {
    if (this.gameState.isPaused) return;

    // システムの更新
    for (const [name, system] of this.systems) {
      system.update(deltaTime);
    }

    // 時間経過イベント
    this.eventBus.emit(GameEvents.TIME_TICK, deltaTime);
  }

  private processOfflineTime(offlineMs: number): void {
    console.log(`Processing ${Math.floor(offlineMs / 1000)} seconds of offline time...`);
    
    // オフライン時間を時間単位に変換（最大24時間）
    const offlineHours = Math.min(Math.floor(offlineMs / (1000 * 60 * 60)), 24);
    
    if (offlineHours > 0) {
      // オフライン報酬の計算をここで行う
      // 今はプレースホルダー
      console.log(`Processed ${offlineHours} hours of offline progress`);
    }
  }

  destroy(): void {
    this.stop();
    
    // システムの破棄
    for (const [name, system] of this.systems) {
      system.destroy();
    }
    
    this.systems.clear();
  }
}