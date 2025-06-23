import { BaseSystem } from '@core/BaseSystem';
import { UIManager } from '@ui/UIManager';
import { HeaderComponent } from '@ui/components/HeaderComponent';
import { MainScreenComponent } from '@ui/components/MainScreenComponent';
import { BaseComponent } from '@ui/components/BaseComponent';

export class UISystem extends BaseSystem {
  private uiManager: UIManager;
  private currentView: 'main' | 'base' = 'main';

  constructor() {
    super();
    this.uiManager = UIManager.getInstance();
  }

  protected async onInitialize(): Promise<void> {
    console.log('UISystem initialized');
    
    // UIマネージャーの初期化
    this.uiManager.initialize();
    
    // メインコンテンツエリアにナビゲーションと各ビューを追加
    const mainElement = this.uiManager.getMainElement();
    mainElement.innerHTML = `
      <div class="main-nav">
        <button class="btn btn--sm btn--primary nav-btn" id="nav-main">メイン</button>
        <button class="btn btn--sm btn--secondary nav-btn" id="nav-base">拠点</button>
      </div>
      <div class="view-container">
        <div id="main-screen-container" class="view-content view-content--active"></div>
        <div id="base-container" class="view-content view-content--hidden"></div>
      </div>
    `;
    
    // コンポーネントの登録
    const headerElement = this.uiManager.getHeaderElement();
    const headerComponent = new HeaderComponent(headerElement);
    this.uiManager.registerComponent('header', headerComponent);
    
    const mainScreenElement = document.getElementById('main-screen-container');
    if (mainScreenElement) {
      const mainScreenComponent = new MainScreenComponent(mainScreenElement);
      this.uiManager.registerComponent('mainScreen', mainScreenComponent);
    }
    
    const baseElement = document.getElementById('base-container');
    if (baseElement) {
      const baseComponent = new BaseComponent(baseElement);
      this.uiManager.registerComponent('base', baseComponent);
    }
    
    // ナビゲーションイベントの設定
    this.setupNavigation();
  }

  protected setupEventListeners(): void {
    // UIシステム固有のイベントリスナー
  }
  
  private setupNavigation(): void {
    const mainBtn = document.getElementById('nav-main');
    const baseBtn = document.getElementById('nav-base');
    
    if (mainBtn) {
      mainBtn.addEventListener('click', () => {
        this.switchView('main');
      });
    }
    
    if (baseBtn) {
      baseBtn.addEventListener('click', () => {
        this.switchView('base');
      });
    }
  }
  
  private switchView(view: 'main' | 'base'): void {
    if (this.currentView === view) return;
    
    this.currentView = view;
    
    // ナビゲーションボタンの状態更新
    const mainBtn = document.getElementById('nav-main');
    const baseBtn = document.getElementById('nav-base');
    
    if (mainBtn && baseBtn) {
      if (view === 'main') {
        mainBtn.className = 'btn btn--sm btn--primary nav-btn';
        baseBtn.className = 'btn btn--sm btn--secondary nav-btn';
      } else {
        mainBtn.className = 'btn btn--sm btn--secondary nav-btn';
        baseBtn.className = 'btn btn--sm btn--primary nav-btn';
      }
    }
    
    // ビューコンテナの表示切り替え
    const mainContainer = document.getElementById('main-screen-container');
    const baseContainer = document.getElementById('base-container');
    
    if (mainContainer && baseContainer) {
      if (view === 'main') {
        mainContainer.className = 'view-content view-content--active';
        baseContainer.className = 'view-content view-content--hidden';
      } else {
        mainContainer.className = 'view-content view-content--hidden';
        baseContainer.className = 'view-content view-content--active';
      }
    }
  }

  protected onStart(): void {
    console.log('UISystem started');
  }

  protected onStop(): void {
    console.log('UISystem stopped');
  }

  protected onUpdate(deltaTime: number): void {
    // UIの定期更新が必要な場合はここで処理
  }

  protected onDestroy(): void {
    console.log('UISystem destroyed');
    this.uiManager.destroy();
  }
}