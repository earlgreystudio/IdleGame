import { EventBus } from './EventBus';
import { CentralStateManager } from './CentralStateManager';

export abstract class BaseSystem {
  protected eventBus: EventBus;
  protected centralStateManager: CentralStateManager;
  protected isInitialized: boolean = false;
  protected isRunning: boolean = false;

  constructor() {
    this.eventBus = EventBus.getInstance();
    this.centralStateManager = CentralStateManager.getInstance();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.warn(`${this.constructor.name} is already initialized`);
      return;
    }

    await this.onInitialize();
    this.setupEventListeners();
    this.isInitialized = true;
  }

  start(): void {
    if (!this.isInitialized) {
      throw new Error(`${this.constructor.name} must be initialized before starting`);
    }

    if (this.isRunning) {
      console.warn(`${this.constructor.name} is already running`);
      return;
    }

    this.onStart();
    this.isRunning = true;
  }

  stop(): void {
    if (!this.isRunning) {
      console.warn(`${this.constructor.name} is not running`);
      return;
    }

    this.onStop();
    this.isRunning = false;
  }

  update(deltaTime: number): void {
    if (!this.isRunning) return;
    
    this.onUpdate(deltaTime);
  }

  destroy(): void {
    if (this.isRunning) {
      this.stop();
    }

    this.onDestroy();
    this.isInitialized = false;
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract setupEventListeners(): void;
  protected abstract onStart(): void;
  protected abstract onStop(): void;
  protected abstract onUpdate(deltaTime: number): void;
  protected abstract onDestroy(): void;
}