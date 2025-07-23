import { Injectable, signal, computed } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, map } from 'rxjs/operators';

export interface UpdateStatus {
  updateAvailable: boolean;
  currentVersion: string;
  availableVersion: string;
  isUpdating: boolean;
  lastChecked: Date | null;
}

@Injectable({
  providedIn: 'root'
})
export class PwaUpdateService {
  private updateStatus = signal<UpdateStatus>({
    updateAvailable: false,
    currentVersion: 'unknown',
    availableVersion: 'unknown',
    isUpdating: false,
    lastChecked: null
  });

  // Public readonly signals
  readonly status = computed(() => this.updateStatus());
  readonly updateAvailable = computed(() => this.updateStatus().updateAvailable);
  readonly isUpdating = computed(() => this.updateStatus().isUpdating);

  constructor(private swUpdate: SwUpdate) {
    this.initializeUpdateChecking();
  }

  private initializeUpdateChecking(): void {
    if (!this.swUpdate.isEnabled) {
      console.log('Service Worker updates are not enabled');
      return;
    }

    // Listen for available updates
    this.swUpdate.versionUpdates
      .pipe(
        filter((evt): evt is VersionReadyEvent => evt.type === 'VERSION_READY'),
        map(evt => ({
          current: evt.currentVersion,
          available: evt.latestVersion
        }))
      )
      .subscribe(({ current, available }) => {
        console.log('Update available:', { current, available });
        this.updateStatus.update(status => ({
          ...status,
          updateAvailable: true,
          currentVersion: current.hash,
          availableVersion: available.hash,
          lastChecked: new Date()
        }));
        
        this.showUpdateNotification();
      });

    // Check for updates periodically (every 6 hours)
    this.scheduleUpdateChecks();
  }

  private scheduleUpdateChecks(): void {
    // Check immediately
    this.checkForUpdate();
    
    // Then check every 6 hours
    setInterval(() => {
      this.checkForUpdate();
    }, 6 * 60 * 60 * 1000);
  }

  async checkForUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled) {
      return false;
    }

    try {
      const updateFound = await this.swUpdate.checkForUpdate();
      this.updateStatus.update(status => ({
        ...status,
        lastChecked: new Date()
      }));
      return updateFound;
    } catch (error) {
      console.error('Error checking for updates:', error);
      return false;
    }
  }

  async applyUpdate(): Promise<boolean> {
    if (!this.swUpdate.isEnabled || !this.updateAvailable()) {
      return false;
    }

    this.updateStatus.update(status => ({
      ...status,
      isUpdating: true
    }));

    try {
      await this.swUpdate.activateUpdate();
      // Reload the page to use the new version
      window.location.reload();
      return true;
    } catch (error) {
      console.error('Error applying update:', error);
      this.updateStatus.update(status => ({
        ...status,
        isUpdating: false
      }));
      return false;
    }
  }

  private showUpdateNotification(): void {
    // Create a custom notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('App Update Available', {
        body: 'A new version of Todo PWA is available. Click to update.',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'app-update',
        requireInteraction: true
      });
    }
  }

  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }

  dismissUpdate(): void {
    this.updateStatus.update(status => ({
      ...status,
      updateAvailable: false
    }));
  }
}
