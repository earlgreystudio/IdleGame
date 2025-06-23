import { BaseSystem } from '../../core/BaseSystem';
import { GameEvents } from '../../core/EventBus';
import type { GameTime } from '../../core/types/common';

export class TimeSystem extends BaseSystem {
  private timeAccumulator: number = 0;
  private readonly SECONDS_PER_HOUR: number = 5; // ゲーム内1時間 = 現実5秒
  private readonly HOURS_PER_DAY: number = 24;
  private readonly DAYS_PER_SEASON: number = 30;
  private readonly SEASONS_PER_YEAR: number = 4;
  
  private seasonNames: string[] = ['春', '夏', '秋', '冬'];

  protected async onInitialize(): Promise<void> {
    console.log('TimeSystem initialized');
  }

  protected setupEventListeners(): void {
    // ゲームロード時のイベント
    this.eventBus.on(GameEvents.GAME_LOAD, (saveData: any) => {
      // オフライン時間の処理
      this.processOfflineTime(saveData.lastPlayTime);
    });
  }

  protected onStart(): void {
    console.log('TimeSystem started');
    this.timeAccumulator = 0;
  }

  protected onStop(): void {
    console.log('TimeSystem stopped');
  }

  protected onUpdate(deltaTime: number): void {
    // deltaTimeはミリ秒なので秒に変換
    this.timeAccumulator += deltaTime / 1000;
    
    // 1ゲーム時間経過したか確認
    if (this.timeAccumulator >= this.SECONDS_PER_HOUR) {
      const hoursToAdvance = Math.floor(this.timeAccumulator / this.SECONDS_PER_HOUR);
      this.timeAccumulator %= this.SECONDS_PER_HOUR;
      
      this.advanceTime(hoursToAdvance);
    }
  }

  protected onDestroy(): void {
    console.log('TimeSystem destroyed');
  }

  private advanceTime(hours: number): void {
    const currentTime = this.centralStateManager.gameTime;
    let newHour = currentTime.hour + hours;
    let newDay = currentTime.day;
    let newSeason = currentTime.season;
    let newYear = currentTime.year;

    // 時間のオーバーフロー処理
    while (newHour >= this.HOURS_PER_DAY) {
      newHour -= this.HOURS_PER_DAY;
      newDay++;
      
      // 日のオーバーフロー処理
      if (newDay > this.DAYS_PER_SEASON) {
        newDay = 1;
        newSeason++;
        
        // 季節のオーバーフロー処理
        if (newSeason >= this.SEASONS_PER_YEAR) {
          newSeason = 0;
          newYear++;
        }
      }
    }

    // 時間を更新
    this.centralStateManager.setGameTime({
      year: newYear,
      season: newSeason,
      day: newDay,
      hour: newHour
    });
  }

  private processOfflineTime(lastPlayTime: number): void {
    const offlineMs = Date.now() - lastPlayTime;
    const offlineSeconds = offlineMs / 1000;
    
    // オフライン時間が1分以上の場合のみ処理
    if (offlineSeconds < 60) return;
    
    // 最大24時間分のオフライン進行
    const maxOfflineHours = 24;
    const offlineHours = Math.min(
      Math.floor(offlineSeconds / this.SECONDS_PER_HOUR),
      maxOfflineHours
    );
    
    if (offlineHours > 0) {
      console.log(`Processing ${offlineHours} hours of offline time`);
      this.advanceTime(offlineHours);
      
      // オフライン報酬イベントを発火
      this.eventBus.emit('offline:reward', {
        hours: offlineHours,
        startTime: this.getTimeFromTimestamp(lastPlayTime),
        endTime: this.centralStateManager.gameTime
      });
    }
  }

  private getTimeFromTimestamp(timestamp: number): GameTime {
    // タイムスタンプから仮想的なゲーム時間を計算
    // これは簡略化された実装で、実際のゲーム時間とは異なる場合があります
    const currentTime = this.centralStateManager.gameTime;
    const diffMs = Date.now() - timestamp;
    const diffHours = Math.floor(diffMs / (1000 * this.SECONDS_PER_HOUR));
    
    // 現在時刻から遡って計算
    let hour = currentTime.hour - (diffHours % this.HOURS_PER_DAY);
    let day = currentTime.day;
    let season = currentTime.season;
    let year = currentTime.year;
    
    if (hour < 0) {
      hour += this.HOURS_PER_DAY;
      day--;
    }
    
    const daysBack = Math.floor(diffHours / this.HOURS_PER_DAY);
    day -= daysBack;
    
    while (day < 1) {
      day += this.DAYS_PER_SEASON;
      season--;
      if (season < 0) {
        season += this.SEASONS_PER_YEAR;
        year--;
      }
    }
    
    return { year, season, day, hour };
  }

  // ユーティリティメソッド
  getFormattedTime(): string {
    const time = this.centralStateManager.gameTime;
    const season = this.seasonNames[time.season];
    const hour = time.hour.toString().padStart(2, '0');
    return `${time.year}年 ${season} ${time.day}日 ${hour}:00`;
  }

  getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = this.centralStateManager.gameTime.hour;
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 18) return 'afternoon';
    if (hour >= 18 && hour < 22) return 'evening';
    return 'night';
  }

  getSeason(): string {
    return this.seasonNames[this.centralStateManager.gameTime.season];
  }

  // 時間を進める（デバッグ用）
  skipTime(hours: number): void {
    if (hours > 0) {
      this.advanceTime(hours);
    }
  }
}