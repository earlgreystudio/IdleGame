import { UIComponent } from '@ui/UIManager';
import { TeamManagementComponent } from './TeamManagementComponent';
import { CharacterListComponent } from './CharacterListComponent';
import { EventBus, GameEvents } from '@core/EventBus';

export class MainScreenComponent implements UIComponent {
  element: HTMLElement;
  private teamManagement: TeamManagementComponent | null = null;
  private characterList: CharacterListComponent | null = null;
  private eventBus: EventBus;

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
        <div class="main-screen__teams" id="team-management-container">
          <!-- チーム管理コンポーネントがここに配置される -->
        </div>
        
        <div class="main-screen__characters" id="character-list-container">
          <!-- キャラクターリストコンポーネントがここに配置される -->
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
      
      // ドラッグ開始イベントを設定
      this.setupCharacterDragEvents();
    }
  }

  private setupCharacterDragEvents(): void {
    if (!this.characterList) return;

    // キャラクターカードのドラッグ開始イベント
    this.characterList.element.addEventListener('dragstart', (e) => {
      const characterCard = (e.target as HTMLElement).closest('.character-card');
      if (characterCard) {
        const characterId = characterCard.getAttribute('data-character-id');
        if (characterId) {
          e.dataTransfer?.setData('text/plain', characterId);
          characterCard.classList.add('dragging');
        }
      }
    });

    // ドラッグ終了
    this.characterList.element.addEventListener('dragend', (e) => {
      const characterCard = (e.target as HTMLElement).closest('.character-card');
      if (characterCard) {
        characterCard.classList.remove('dragging');
      }
    });
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
  }

  private processTeamWork(): void {
    // チームの作業を1時間分進行
    if (this.teamManagement) {
      // チーム作業の進行処理
      // 実際の実装は後で TeamManagementComponent で行う
      console.log('Processing team work for 1 hour');
    }
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