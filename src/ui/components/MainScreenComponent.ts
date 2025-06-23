import { UIComponent } from '@ui/UIManager';
import { TeamManagementComponent } from './TeamManagementComponent';
import { CharacterListComponent } from './CharacterListComponent';
import { EventBus, GameEvents } from '@core/EventBus';

export class MainScreenComponent implements UIComponent {
  element: HTMLElement;
  private teamManagement: TeamManagementComponent | null = null;
  private characterList: CharacterListComponent | null = null;
  private eventBus: EventBus;
  private currentTab: string = 'team';

  constructor(element: HTMLElement) {
    this.element = element;
    this.eventBus = EventBus.getInstance();
  }

  initialize(): void {
    this.render();
    this.initializeSubComponents();
    this.setupEventListeners();
  }

  private render(): void {
    this.element.innerHTML = `
      <div class="main-screen">
        <div class="main-screen__content">
          <div class="content-view ${this.currentTab === 'team' ? 'active' : ''}" id="team-view">
            <div id="team-management-container"></div>
            <div id="character-list-container"></div>
          </div>
          
          <div class="content-view ${this.currentTab === 'base' ? 'active' : ''}" id="base-view">
            <div id="base-building-container">
              <h3>拠点建設</h3>
              <div class="building-grid">
                <div class="building-card">
                  <h4>🏠 住居</h4>
                  <p>キャラクターの住む場所</p>
                  <button class="btn btn--primary build-btn" data-building="house">建設</button>
                </div>
                <div class="building-card">
                  <h4>🍳 キッチン</h4>
                  <p>料理を作る場所</p>
                  <button class="btn btn--primary build-btn" data-building="kitchen">建設</button>
                </div>
                <div class="building-card">
                  <h4>🔨 工房</h4>
                  <p>道具を作る場所</p>
                  <button class="btn btn--primary build-btn" data-building="workshop">建設</button>
                </div>
                <div class="building-card">
                  <h4>🏥 医務室</h4>
                  <p>怪我や病気を治す場所</p>
                  <button class="btn btn--primary build-btn" data-building="clinic">建設</button>
                </div>
              </div>
            </div>
          </div>
          
          <div class="content-view ${this.currentTab === 'item' ? 'active' : ''}" id="item-view">
            <div id="item-container">
              <h3>アイテム</h3>
              <div class="item-categories">
                <div class="item-category">
                  <h4>🎒 インベントリ</h4>
                  <p>所持しているアイテムの管理</p>
                </div>
                <div class="item-category">
                  <h4>🛍️ ショップ</h4>
                  <p>現世のオンラインショップでアイテムを購入</p>
                </div>
                <div class="item-category">
                  <h4>🔄 取引</h4>
                  <p>異世界アイテムと現世通貨の交換</p>
                </div>
              </div>
            </div>
          </div>
          
          <div class="content-view ${this.currentTab === 'settings' ? 'active' : ''}" id="settings-view">
            <div id="settings-container">
              <h3>設定</h3>
              <div class="settings-options">
                <button class="btn btn--secondary">音量設定</button>
                <button class="btn btn--secondary">オートセーブ設定</button>
                <button class="btn btn--danger">データリセット</button>
              </div>
            </div>
          </div>
        </div>
        
      </div>
    `;
  }

  private initializeSubComponents(): void {
    // チーム管理コンポーネント
    const teamContainer = document.getElementById('team-management-container');
    if (teamContainer) {
      this.teamManagement = new TeamManagementComponent(teamContainer);
      this.teamManagement.initialize();
    }

    // キャラクターリストコンポーネント
    const characterContainer = document.getElementById('character-list-container');
    if (characterContainer) {
      this.characterList = new CharacterListComponent(characterContainer);
      this.characterList.initialize();
    }

  }


  private setupEventListeners(): void {
    // 時間関連イベント
    this.eventBus.on(GameEvents.TIME_HOUR, () => {
      this.processTeamWork();
    });

    // キャラクター関連イベント
    this.eventBus.on(GameEvents.CHARACTER_SPAWN, () => {
      this.update();
    });

    this.eventBus.on(GameEvents.CHARACTER_STATUS_CHANGE, () => {
      this.update();
    });

    // タブ切り替えイベント
    this.eventBus.on('TAB_SWITCH', (data: any) => {
      this.switchToTab(data.tabId);
    });

    // 建設ボタンのイベント
    this.element.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.classList.contains('build-btn')) {
        const buildingType = target.getAttribute('data-building');
        if (buildingType) {
          this.buildStructure(buildingType);
        }
      }
    });
  }

  private processTeamWork(): void {
    // チームの作業を1時間分進行
    if (this.teamManagement) {
      // チーム作業の進行処理
      // 実際の実装は後で TeamManagementComponent で行う
    }
  }

  private switchToTab(tabId: string): void {
    this.currentTab = tabId;
    
    // すべてのビューを非表示
    const views = this.element.querySelectorAll('.content-view');
    views.forEach(view => view.classList.remove('active'));
    
    // 選択されたビューを表示
    const activeView = this.element.querySelector(`#${tabId}-view`);
    if (activeView) {
      activeView.classList.add('active');
    }
  }

  private buildStructure(buildingType: string): void {
    // 拠点建設の実装
    console.log(`Building: ${buildingType}`);
    alert(`${this.getBuildingName(buildingType)}を建設しました！`);
  }

  private getBuildingName(buildingType: string): string {
    const names: Record<string, string> = {
      'house': '住居',
      'kitchen': 'キッチン',
      'workshop': '工房',
      'clinic': '医務室'
    };
    return names[buildingType] || buildingType;
  }

  update(): void {
    if (this.teamManagement) {
      this.teamManagement.update();
    }
    if (this.characterList) {
      this.characterList.update();
    }
  }

  destroy(): void {
    if (this.teamManagement) {
      this.teamManagement.destroy();
    }
    if (this.characterList) {
      this.characterList.destroy();
    }
    this.element.innerHTML = '';
  }
}