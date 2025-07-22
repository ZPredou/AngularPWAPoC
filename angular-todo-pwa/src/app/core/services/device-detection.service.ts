import { Injectable, signal, computed } from '@angular/core';
import { DeviceDetectorService } from 'ngx-device-detector';

export interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  screenSize: 'small' | 'medium' | 'large';
}

@Injectable({
  providedIn: 'root'
})
export class DeviceDetectionService {
  private windowWidth = signal(typeof window !== 'undefined' ? window.innerWidth : 1024);
  
  constructor(private deviceDetector: DeviceDetectorService) {
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', () => {
        this.windowWidth.set(window.innerWidth);
      });
    }
  }

  deviceInfo = computed<DeviceInfo>(() => {
    const isMobile = this.deviceDetector.isMobile();
    const isTablet = this.deviceDetector.isTablet();
    const isDesktop = this.deviceDetector.isDesktop();
    const width = this.windowWidth();

    let screenSize: 'small' | 'medium' | 'large';
    if (width < 768) {
      screenSize = 'small';
    } else if (width < 1024) {
      screenSize = 'medium';
    } else {
      screenSize = 'large';
    }

    let deviceType: 'mobile' | 'tablet' | 'desktop';
    if (isMobile) {
      deviceType = 'mobile';
    } else if (isTablet) {
      deviceType = 'tablet';
    } else {
      deviceType = 'desktop';
    }

    return {
      isMobile,
      isTablet,
      isDesktop,
      deviceType,
      screenSize
    };
  });

  get cssClasses(): string[] {
    const info = this.deviceInfo();
    return [
      `device-${info.deviceType}`,
      `screen-${info.screenSize}`
    ];
  }
}
