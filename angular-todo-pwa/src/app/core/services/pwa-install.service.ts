import { Injectable, signal, computed } from '@angular/core';

export interface InstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export interface InstallStatus {
  canInstall: boolean;
  isInstalled: boolean;
  isStandalone: boolean;
  platform: string;
  promptEvent: InstallPromptEvent | null;
}

@Injectable({
  providedIn: 'root'
})
export class PwaInstallService {
  private installStatus = signal<InstallStatus>({
    canInstall: false,
    isInstalled: false,
    isStandalone: this.isRunningStandalone(),
    platform: this.detectPlatform(),
    promptEvent: null
  });

  // Public readonly signals
  readonly status = computed(() => this.installStatus());
  readonly canInstall = computed(() => this.installStatus().canInstall);
  readonly isInstalled = computed(() => this.installStatus().isInstalled);
  readonly isStandalone = computed(() => this.installStatus().isStandalone);

  constructor() {
    this.initializeInstallPrompt();
    this.checkInstallationStatus();
  }

  private initializeInstallPrompt(): void {
    window.addEventListener('beforeinstallprompt', (e) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      
      this.installStatus.update(status => ({
        ...status,
        canInstall: true,
        promptEvent: e as InstallPromptEvent
      }));
    });

    window.addEventListener('appinstalled', () => {
      this.installStatus.update(status => ({
        ...status,
        isInstalled: true,
        canInstall: false,
        promptEvent: null
      }));
    });
  }

  private checkInstallationStatus(): void {
    // Check if app is already installed
    if (this.isRunningStandalone()) {
      this.installStatus.update(status => ({
        ...status,
        isInstalled: true,
        isStandalone: true
      }));
    }
  }

  private isRunningStandalone(): boolean {
    // Check if running in standalone mode
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  private detectPlatform(): string {
    const userAgent = navigator.userAgent.toLowerCase();
    
    if (userAgent.includes('android')) {
      return 'Android';
    } else if (userAgent.includes('iphone') || userAgent.includes('ipad')) {
      return 'iOS';
    } else if (userAgent.includes('windows')) {
      return 'Windows';
    } else if (userAgent.includes('mac')) {
      return 'macOS';
    } else if (userAgent.includes('linux')) {
      return 'Linux';
    }
    
    return 'Unknown';
  }

  async showInstallPrompt(): Promise<boolean> {
    const currentStatus = this.installStatus();
    
    if (!currentStatus.canInstall || !currentStatus.promptEvent) {
      return false;
    }

    try {
      // Show the install prompt
      await currentStatus.promptEvent.prompt();
      
      // Wait for the user to respond to the prompt
      const choiceResult = await currentStatus.promptEvent.userChoice;
      
      
      if (choiceResult.outcome === 'accepted') {
        this.installStatus.update(status => ({
          ...status,
          canInstall: false,
          promptEvent: null
        }));
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  getInstallInstructions(): string {
    const platform = this.installStatus().platform;
    
    switch (platform) {
      case 'iOS':
        return 'Tap the Share button and then "Add to Home Screen"';
      case 'Android':
        return 'Tap the menu button and select "Add to Home Screen" or "Install App"';
      case 'Windows':
      case 'macOS':
      case 'Linux':
        return 'Click the install button in the address bar or use the browser menu';
      default:
        return 'Look for an install or "Add to Home Screen" option in your browser';
    }
  }

  dismissInstallPrompt(): void {
    this.installStatus.update(status => ({
      ...status,
      canInstall: false,
      promptEvent: null
    }));
    
    // Store dismissal in localStorage to avoid showing again for a while
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  }

  shouldShowInstallPrompt(): boolean {
    const status = this.installStatus();
    
    // Don't show if already installed or can't install
    if (status.isInstalled || status.isStandalone || !status.canInstall) {
      return false;
    }

    // Check if user dismissed recently (within 7 days)
    const dismissedTime = localStorage.getItem('pwa-install-dismissed');
    if (dismissedTime) {
      const daysSinceDismissal = (Date.now() - parseInt(dismissedTime)) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissal < 7) {
        return false;
      }
    }

    return true;
  }
}
