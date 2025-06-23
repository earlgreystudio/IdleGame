import { BaseSystem } from '@core/BaseSystem';
import { UIManager } from '@ui/UIManager';
import { HeaderComponent } from '@ui/components/HeaderComponent';
import { MainScreenComponent } from '@ui/components/MainScreenComponent';
import { BottomBarComponent } from '@ui/components/BottomBarComponent';

export class UISystem extends BaseSystem {
  private uiManager: UIManager;

  constructor() {
    super();
    this.uiManager = UIManager.getInstance();
  }

  protected async onInitialize(): Promise<void> {
    console.log('UISystem initialized');
    
    // UIマネージャーの初期化
    this.uiManager.initialize();
    
    // メインコンテンツエリアにメインスクリーンを配置
    const mainElement = this.uiManager.getMainElement();
    mainElement.innerHTML = `
      <div id="main-screen-container"></div>
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
    
    // BottomBarの追加
    const footerElement = this.uiManager.getFooterElement();
    const bottomBarComponent = new BottomBarComponent(footerElement);
    this.uiManager.registerComponent('bottomBar', bottomBarComponent);
  }

  protected setupEventListeners(): void {
    // UIシステム固有のイベントリスナー
  }

  protected onStart(): void {
    console.log('UISystem started');
  }

  protected onStop(): void {
    console.log('UISystem stopped');
  }

  protected onUpdate(_deltaTime: number): void {
    // UIの定期更新が必要な場合はここで処理
  }

  protected onDestroy(): void {
    console.log('UISystem destroyed');
    this.uiManager.destroy();
  }
}