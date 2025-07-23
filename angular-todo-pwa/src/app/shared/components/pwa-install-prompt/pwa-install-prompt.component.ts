import { Component, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PwaInstallService } from '../../../core/services/pwa-install.service';

@Component({
  selector: 'app-pwa-install-prompt',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div 
      class="install-prompt" 
      *ngIf="shouldShow()"
      [class.visible]="isVisible()"
    >
      <div class="install-prompt-content">
        <div class="install-prompt-header">
          <div class="install-prompt-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" fill="currentColor"/>
            </svg>
          </div>
          <div class="install-prompt-text">
            <h3>Install Todo PWA</h3>
            <p>Get quick access and work offline!</p>
          </div>
          <button 
            class="install-prompt-close" 
            (click)="dismiss()"
            aria-label="Close install prompt"
          >
            ×
          </button>
        </div>
        
        <div class="install-prompt-actions">
          <button 
            class="install-button primary" 
            (click)="install()"
            [disabled]="isInstalling()"
          >
            {{ isInstalling() ? 'Installing...' : 'Install' }}
          </button>
          <button 
            class="install-button secondary" 
            (click)="showInstructions()"
          >
            How to Install
          </button>
        </div>

        <div class="install-instructions" *ngIf="showingInstructions()">
          <p>{{ installService.getInstallInstructions() }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .install-prompt {
      position: fixed;
      bottom: -100px;
      left: 50%;
      transform: translateX(-50%);
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      border: 1px solid #e5e7eb;
      max-width: 400px;
      width: calc(100% - 32px);
      z-index: 1000;
      transition: bottom 0.3s ease-in-out;
    }

    .install-prompt.visible {
      bottom: 16px;
    }

    .install-prompt-content {
      padding: 20px;
    }

    .install-prompt-header {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 16px;
    }

    .install-prompt-icon {
      color: #2563eb;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .install-prompt-text {
      flex: 1;
    }

    .install-prompt-text h3 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
      color: #111827;
    }

    .install-prompt-text p {
      margin: 0;
      font-size: 14px;
      color: #6b7280;
    }

    .install-prompt-close {
      background: none;
      border: none;
      font-size: 24px;
      color: #9ca3af;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 4px;
      transition: color 0.2s;
    }

    .install-prompt-close:hover {
      color: #6b7280;
      background-color: #f3f4f6;
    }

    .install-prompt-actions {
      display: flex;
      gap: 8px;
      margin-bottom: 12px;
    }

    .install-button {
      flex: 1;
      padding: 10px 16px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: 1px solid transparent;
    }

    .install-button.primary {
      background-color: #2563eb;
      color: white;
    }

    .install-button.primary:hover:not(:disabled) {
      background-color: #1d4ed8;
    }

    .install-button.primary:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }

    .install-button.secondary {
      background-color: #f9fafb;
      color: #374151;
      border-color: #d1d5db;
    }

    .install-button.secondary:hover {
      background-color: #f3f4f6;
    }

    .install-instructions {
      padding: 12px;
      background-color: #f0f9ff;
      border-radius: 8px;
      border-left: 4px solid #2563eb;
    }

    .install-instructions p {
      margin: 0;
      font-size: 13px;
      color: #1e40af;
      line-height: 1.4;
    }

    @media (max-width: 480px) {
      .install-prompt {
        width: calc(100% - 16px);
        bottom: -120px;
      }
      
      .install-prompt.visible {
        bottom: 8px;
      }

      .install-prompt-content {
        padding: 16px;
      }

      .install-prompt-actions {
        flex-direction: column;
      }
    }
  `]
})
export class PwaInstallPromptComponent {
  installService = inject(PwaInstallService);

  protected isVisible = signal(false);
  protected isInstalling = signal(false);
  protected showingInstructions = signal(false);

  constructor() {
    // Show prompt after a delay if conditions are met
    setTimeout(() => {
      if (this.installService.shouldShowInstallPrompt()) {
        this.isVisible.set(true);
      }
    }, 3000); // Show after 3 seconds
  }

  shouldShow = computed(() => {
    return this.installService.shouldShowInstallPrompt();
  });

  async install(): Promise<void> {
    this.isInstalling.set(true);
    
    try {
      const installed = await this.installService.showInstallPrompt();
      if (installed) {
        this.isVisible.set(false);
      }
    } catch (error) {
      console.error('Installation failed:', error);
    } finally {
      this.isInstalling.set(false);
    }
  }

  dismiss(): void {
    this.isVisible.set(false);
    this.installService.dismissInstallPrompt();
  }

  showInstructions(): void {
    this.showingInstructions.update(showing => !showing);
  }
}
