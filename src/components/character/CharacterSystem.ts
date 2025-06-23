import { BaseSystem } from '../../core/BaseSystem';
import { GameEvents } from '../../core/EventBus';
import { Character } from './Character';
import { CharacterFactory } from './CharacterFactory';
import type { CharacterData } from './types';
import type { Club, Gender } from '../../core/types/common';

export class CharacterSystem extends BaseSystem {
  private characters: Map<string, Character> = new Map();
  private updateTimer: number = 0;
  private readonly UPDATE_INTERVAL = 1; // 1秒ごとに更新

  protected async onInitialize(): Promise<void> {
    console.log('CharacterSystem initialized');
    
    // テスト用に初期キャラクターを作成
    this.createTestCharacters();
  }

  protected setupEventListeners(): void {
    // 時間経過イベント
    this.eventBus.on(GameEvents.TIME_HOUR, () => {
      this.handleHourlyUpdate();
    });

    // ゲームロード時
    this.eventBus.on(GameEvents.GAME_LOAD, (saveData: any) => {
      this.loadCharacters(saveData.characters || []);
    });

    // ゲームセーブ時
    this.eventBus.on(GameEvents.GAME_SAVE, () => {
      // CharacterSystemからのセーブデータを提供
      this.eventBus.emit('characters:save', this.getAllCharacterData());
    });

    // キャラクター死亡時の処理
    this.eventBus.on(GameEvents.CHARACTER_DEATH, ({ characterId }: { characterId: string }) => {
      this.removeCharacter(characterId);
    });
  }

  protected onStart(): void {
    console.log('CharacterSystem started');
  }

  protected onStop(): void {
    console.log('CharacterSystem stopped');
  }

  protected onUpdate(deltaTime: number): void {
    this.updateTimer += deltaTime;
    
    // 1秒ごとにキャラクターを更新
    if (this.updateTimer >= this.UPDATE_INTERVAL) {
      this.updateCharacters(this.updateTimer);
      this.updateTimer = 0;
    }
  }

  protected onDestroy(): void {
    console.log('CharacterSystem destroyed');
    this.characters.clear();
  }

  // キャラクター管理
  createCharacter(club: Club, gender: Gender, name?: string): Character {
    const character = CharacterFactory.createCharacter(club, gender, name);
    this.characters.set(character.id, character);
    
    this.eventBus.emit(GameEvents.CHARACTER_SPAWN, { character });
    console.log(`新しいキャラクター「${character.name}」(${character.club})が仲間になりました`);
    
    return character;
  }

  createRandomCharacter(name?: string): Character {
    const character = CharacterFactory.createRandomCharacter(name);
    this.characters.set(character.id, character);
    
    this.eventBus.emit(GameEvents.CHARACTER_SPAWN, { character });
    console.log(`新しいキャラクター「${character.name}」(${character.club})が仲間になりました`);
    
    return character;
  }

  getCharacter(id: string): Character | undefined {
    return this.characters.get(id);
  }

  getAllCharacters(): Character[] {
    return Array.from(this.characters.values());
  }

  removeCharacter(id: string): boolean {
    const character = this.characters.get(id);
    if (!character) return false;

    this.characters.delete(id);
    console.log(`キャラクター「${character.name}」が拠点から離れました`);
    return true;
  }

  getCharacterCount(): number {
    return this.characters.size;
  }

  // キャラクター検索・フィルタリング
  getCharactersByClub(club: Club): Character[] {
    return this.getAllCharacters().filter(char => char.club === club);
  }

  getAvailableCharacters(): Character[] {
    return this.getAllCharacters().filter(char => 
      char.canPerformAction() && char.currentTaskId === null
    );
  }

  getCharactersByTask(taskType: string): Character[] {
    return this.getAllCharacters().filter(char => 
      char.currentTaskId === taskType
    );
  }

  // スキル関連
  addSkillExperience(characterId: string, skillType: string, experience: number): void {
    const character = this.characters.get(characterId);
    if (character) {
      character.addSkillExperience(skillType as any, experience);
    }
  }

  getBestCharacterForSkill(skillType: string): Character | null {
    const characters = this.getAvailableCharacters();
    if (characters.length === 0) return null;

    return characters.reduce((best, current) => {
      const currentEfficiency = current.getSkillEfficiency(skillType as any);
      const bestEfficiency = best.getSkillEfficiency(skillType as any);
      return currentEfficiency > bestEfficiency ? current : best;
    });
  }

  // 拠点管理関連
  getHousingCapacity(): number {
    // 基本的な住居キャパシティ（拠点システム実装後に改善）
    return 10;
  }

  isHousingFull(): boolean {
    return this.getCharacterCount() >= this.getHousingCapacity();
  }

  getOvercrowdingPenalty(): number {
    const capacity = this.getHousingCapacity();
    const count = this.getCharacterCount();
    
    if (count <= capacity) return 0;
    
    // 収容人数超過時のペナルティ（happiness減少率）
    return Math.min(0.5, (count - capacity) * 0.1);
  }

  // 食料・水の管理
  getFoodConsumption(): number {
    // 1時間あたりの食料消費量
    return this.getCharacterCount() * 2;
  }

  getWaterConsumption(): number {
    // 1時間あたりの水消費量
    return this.getCharacterCount() * 3;
  }

  feedCharacters(): boolean {
    const foodNeeded = this.getFoodConsumption();
    const waterNeeded = this.getWaterConsumption();

    if (!this.centralStateManager.hasResource('food', foodNeeded) || 
        !this.centralStateManager.hasResource('water', waterNeeded)) {
      return false;
    }

    this.centralStateManager.removeResource('food', foodNeeded, 'Character feeding');
    this.centralStateManager.removeResource('water', waterNeeded, 'Character feeding');

    // 全キャラクターの空腹・渇きを回復
    this.characters.forEach(character => {
      character.updateStatus({
        hunger: Math.min(100, character.status.hunger + 20),
        thirst: Math.min(100, character.status.thirst + 30)
      });
    });

    return true;
  }

  // 更新処理
  private updateCharacters(deltaTime: number): void {
    this.characters.forEach(character => {
      character.tick(deltaTime);
      
      // 体力が0になった場合の処理
      if (character.status.health <= 0) {
        this.eventBus.emit(GameEvents.CHARACTER_DEATH, { characterId: character.id });
      }
    });
  }

  private handleHourlyUpdate(): void {
    // 1時間ごとの処理
    const overcrowdingPenalty = this.getOvercrowdingPenalty();
    
    if (overcrowdingPenalty > 0) {
      // 過密状態でのメンタル低下
      this.characters.forEach(character => {
        character.updateStatus({
          mental: character.status.mental - overcrowdingPenalty * 10
        });
      });
    }

    // 自動的な食事（食料があれば）
    this.feedCharacters();
  }

  // セーブ・ロード
  private getAllCharacterData(): CharacterData[] {
    return this.getAllCharacters().map(character => character.toData());
  }

  private loadCharacters(characterDataList: CharacterData[]): void {
    this.characters.clear();
    
    characterDataList.forEach(data => {
      const character = CharacterFactory.fromData(data);
      this.characters.set(character.id, character);
    });
    
    console.log(`${characterDataList.length}人のキャラクターを読み込みました`);
  }

  // テスト用
  private createTestCharacters(): void {
    // テスト用のキャラクターを3人作成
    this.createCharacter('剣道部', 'male', '太郎');
    this.createCharacter('料理部', 'female', '花子');
    this.createCharacter('ロボット研究会', 'male', 'タケシ');
    
    console.log('テスト用キャラクター3人を作成しました');
  }

  // デバッグ用メソッド
  printCharacterStatus(): void {
    console.log('=== キャラクター一覧 ===');
    this.characters.forEach(character => {
      console.log(`${character.name} (${character.club})`);
      console.log(`  体力: ${character.status.health}/100`);
      console.log(`  スタミナ: ${character.status.stamina}/100`);
      console.log(`  メンタル: ${character.status.mental}/100`);
      console.log(`  空腹: ${character.status.hunger}/100`);
      console.log(`  渇き: ${character.status.thirst}/100`);
      console.log(`  攻撃力: ${character.attackPower}`);
      console.log(`  防御力: ${character.defensePower}`);
      console.log('---');
    });
  }
}