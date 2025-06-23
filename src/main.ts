import { CentralStateManager } from './core/CentralStateManager';
import { TimeSystem } from './components/time/TimeSystem';
import { UISystem } from './systems/UISystem';
import { CharacterSystem } from './components/character/CharacterSystem';
import { TeamWorkSystem as TeamSystem } from './components/team/TeamSystem';
import { CookingSystem } from './components/cooking/CookingSystem';
import { CombatSystem } from './components/combat/CombatSystem';
import { ExplorationSystem } from './components/exploration/ExplorationSystem';
import './styles/main.scss';
import './utils/BuildingDebugger';

// アプリケーションの初期化
async function initializeApp() {
  console.log('異世界Idleゲーム - 起動中...');
  
  const centralStateManager = CentralStateManager.getInstance();
  
  try {
    // システムの登録
    centralStateManager.registerSystem('time', new TimeSystem());
    centralStateManager.registerSystem('character', new CharacterSystem());
    centralStateManager.registerSystem('team', new TeamSystem());
    centralStateManager.registerSystem('cooking', new CookingSystem());
    centralStateManager.registerSystem('combat', new CombatSystem());
    centralStateManager.registerSystem('exploration', new ExplorationSystem());
    centralStateManager.registerSystem('ui', new UISystem());
    
    // ゲームの初期化
    await centralStateManager.initialize();
    
    // ゲーム開始
    centralStateManager.start();
    
    // 開発用: グローバルに公開
    if ((import.meta as any).env?.DEV) {
      (window as any).centralStateManager = centralStateManager;
      console.log('Development mode: CentralStateManager available as window.centralStateManager');
    }
    
  } catch (error) {
    console.error('Failed to initialize game:', error);
  }
}

// DOMContentLoadedを待つ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}

// ページ離脱時の処理
window.addEventListener('beforeunload', () => {
  const centralStateManager = CentralStateManager.getInstance();
  centralStateManager.stop();
});