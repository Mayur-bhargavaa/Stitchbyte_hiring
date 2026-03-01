/**
 * Generate device fingerprint for fraud detection
 */
export function generateDeviceFingerprint(): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return 'no-canvas';
    
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('fingerprint', 2, 2);
    
    const canvasData = canvas.toDataURL();
    
    const nav = navigator as Navigator & { deviceMemory?: number };

    const fingerprint = {
        canvas: canvasData.slice(0, 50),
        screen: `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        language: navigator.language,
        platform: navigator.platform,
        hardwareConcurrency: navigator.hardwareConcurrency,
        deviceMemory: nav.deviceMemory,
        userAgent: navigator.userAgent,
    };
    
    return btoa(JSON.stringify(fingerprint)).slice(0, 64);
}

/**
 * Detect if running in VM or emulator
 */
export function detectVirtualEnvironment(): boolean {
    const ua = navigator.userAgent.toLowerCase();
    const suspicious = [
        'virtualbox',
        'vmware',
        'qemu',
        'xen',
        'kvm',
        'parallels'
    ];
    
    return suspicious.some(keyword => ua.includes(keyword));
}

/**
 * Block common cheat attempts
 */
export function setupAntiCheat(onViolation: (type: string, details: string) => void) {
    // Disable right-click
    document.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        onViolation('right_click', 'Right-click detected');
    });

    // Disable copy-paste
    document.addEventListener('copy', (e) => {
        e.preventDefault();
        onViolation('copy', 'Copy attempt detected');
    });

    document.addEventListener('paste', (e) => {
        e.preventDefault();
        onViolation('paste', 'Paste attempt detected');
    });

    // Detect DevTools
    const detectDevTools = () => {
        const threshold = 160;
        const widthThreshold = window.outerWidth - window.innerWidth > threshold;
        const heightThreshold = window.outerHeight - window.innerHeight > threshold;
        
        if (widthThreshold || heightThreshold) {
            onViolation('devtools', 'Developer tools detected');
        }
    };

    setInterval(detectDevTools, 1000);

    // Detect multiple monitors (approximate)
    if (window.screen.availWidth < window.screen.width) {
        onViolation('multiple_monitors', 'Multiple monitor setup detected');
    }

    // Disable keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
        if (
            e.key === 'F12' ||
            (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) ||
            (e.ctrlKey && e.key === 'U')
        ) {
            e.preventDefault();
            onViolation('keyboard_shortcut', `Blocked shortcut: ${e.key}`);
        }

        // Disable Print Screen
        if (e.key === 'PrintScreen') {
            onViolation('screenshot', 'Screenshot attempt detected');
        }
    });

    // Focus tracking
    let focusLostCount = 0;
    window.addEventListener('blur', () => {
        focusLostCount++;
        if (focusLostCount > 3) {
            onViolation('focus_loss', `Focus lost ${focusLostCount} times`);
        }
    });
}

/**
 * Keyboard pattern analysis for detecting unusual typing
 */
export class KeystrokeAnalyzer {
    private keyTimes: number[] = [];
    private intervals: number[] = [];

    recordKeyPress() {
        const now = Date.now();
        this.keyTimes.push(now);

        if (this.keyTimes.length > 1) {
            const interval = now - this.keyTimes[this.keyTimes.length - 2];
            this.intervals.push(interval);
        }

        // Keep only last 50 keystrokes
        if (this.keyTimes.length > 50) {
            this.keyTimes.shift();
            this.intervals.shift();
        }
    }

    analyze(): { suspicious: boolean; reason: string } {
        if (this.intervals.length < 10) {
            return { suspicious: false, reason: '' };
        }

        // Calculate average and standard deviation
        const avg = this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length;
        const variance = this.intervals.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / this.intervals.length;
        const stdDev = Math.sqrt(variance);

        // Very consistent typing (possible bot)
        if (stdDev < 10 && avg < 100) {
            return { suspicious: true, reason: 'Unusually consistent typing pattern' };
        }

        // Extremely fast typing
        if (avg < 30) {
            return { suspicious: true, reason: 'Typing speed too fast' };
        }

        return { suspicious: false, reason: '' };
    }

    getPattern() {
        return {
            avgInterval: this.intervals.length > 0 ? 
                this.intervals.reduce((a, b) => a + b, 0) / this.intervals.length : 0,
            totalKeys: this.keyTimes.length,
        };
    }
}

/**
 * Network quality monitoring
 */
export function monitorNetworkQuality(onPoorQuality: () => void) {
    const nav = navigator as Navigator & {
        connection?: {
            effectiveType?: string;
            addEventListener?: (type: string, listener: () => void) => void;
        };
    };

    if ('connection' in nav && nav.connection) {
        const connection = nav.connection;
        
        const checkConnection = () => {
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                onPoorQuality();
            }
        };

        connection.addEventListener?.('change', checkConnection);
        checkConnection();
    }
}

/**
 * Fullscreen enforcement
 */
export function enforceFullscreen(
    element: HTMLElement,
    onExit: () => void
): () => void {
    const enterFullscreen = async () => {
        try {
            await element.requestFullscreen();
        } catch (err) {
            console.error('Failed to enter fullscreen:', err);
        }
    };

    const handleFullscreenChange = () => {
        if (!document.fullscreenElement) {
            onExit();
        }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    enterFullscreen();

    // Return cleanup function
    return () => {
        document.removeEventListener('fullscreenchange', handleFullscreenChange);
        if (document.fullscreenElement) {
            document.exitFullscreen();
        }
    };
}
