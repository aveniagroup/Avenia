import type { IStorageProvider } from './types';

/**
 * Health Monitoring and Auto-Reconnection
 * Background health checks and connection management
 */

export interface HealthStatus {
  healthy: boolean;
  latency?: number;
  lastCheck: Date;
  consecutiveFailures: number;
  error?: string;
}

export interface MonitoringConfig {
  checkInterval: number; // milliseconds
  timeout: number; // milliseconds
  maxRetries: number;
  retryDelay: number; // milliseconds
  onHealthChange?: (status: HealthStatus) => void;
  onReconnect?: (success: boolean) => void;
}

const DEFAULT_CONFIG: MonitoringConfig = {
  checkInterval: 30000, // 30 seconds
  timeout: 5000, // 5 seconds
  maxRetries: 3,
  retryDelay: 5000, // 5 seconds
};

export class HealthMonitor {
  private provider: IStorageProvider;
  private config: MonitoringConfig;
  private intervalId: NodeJS.Timeout | null = null;
  private status: HealthStatus = {
    healthy: true,
    lastCheck: new Date(),
    consecutiveFailures: 0,
  };
  private isReconnecting = false;

  constructor(provider: IStorageProvider, config: Partial<MonitoringConfig> = {}) {
    this.provider = provider;
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    console.log('[HealthMonitor] Initialized for provider:', provider.name);
  }

  /**
   * Start health monitoring
   */
  start(): void {
    if (this.intervalId) {
      console.warn('[HealthMonitor] Already running');
      return;
    }

    console.log('[HealthMonitor] Starting health checks...', {
      interval: this.config.checkInterval,
      timeout: this.config.timeout,
    });

    // Initial check
    this.performHealthCheck();

    // Schedule periodic checks
    this.intervalId = setInterval(() => {
      this.performHealthCheck();
    }, this.config.checkInterval);
  }

  /**
   * Stop health monitoring
   */
  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[HealthMonitor] Stopped');
    }
  }

  /**
   * Get current health status
   */
  getStatus(): HealthStatus {
    return { ...this.status };
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    const startTime = Date.now();

    try {
      console.log('[HealthMonitor] Performing health check...');

      const checkPromise = this.provider.healthCheck();
      const timeoutPromise = new Promise<boolean>((_, reject) => 
        setTimeout(() => reject(new Error('Health check timeout')), this.config.timeout)
      );

      const isHealthy = await Promise.race([checkPromise, timeoutPromise]);
      const latency = Date.now() - startTime;

      if (isHealthy) {
        this.handleHealthyCheck(latency);
      } else {
        this.handleUnhealthyCheck('Health check returned false');
      }
    } catch (error) {
      const latency = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.handleUnhealthyCheck(errorMsg, latency);
    }
  }

  /**
   * Handle successful health check
   */
  private handleHealthyCheck(latency: number): void {
    const wasUnhealthy = !this.status.healthy;

    this.status = {
      healthy: true,
      latency,
      lastCheck: new Date(),
      consecutiveFailures: 0,
    };

    console.log('[HealthMonitor] Health check passed', { latency });

    if (wasUnhealthy && this.config.onHealthChange) {
      this.config.onHealthChange(this.status);
    }
  }

  /**
   * Handle failed health check
   */
  private handleUnhealthyCheck(error: string, latency?: number): void {
    const wasHealthy = this.status.healthy;

    this.status = {
      healthy: false,
      latency,
      lastCheck: new Date(),
      consecutiveFailures: this.status.consecutiveFailures + 1,
      error,
    };

    console.error('[HealthMonitor] Health check failed', {
      error,
      consecutiveFailures: this.status.consecutiveFailures,
    });

    if (wasHealthy && this.config.onHealthChange) {
      this.config.onHealthChange(this.status);
    }

    // Trigger reconnection if threshold reached
    if (this.status.consecutiveFailures >= this.config.maxRetries) {
      this.attemptReconnection();
    }
  }

  /**
   * Attempt to reconnect
   */
  private async attemptReconnection(): Promise<void> {
    if (this.isReconnecting) {
      console.log('[HealthMonitor] Reconnection already in progress');
      return;
    }

    this.isReconnecting = true;
    console.log('[HealthMonitor] Attempting reconnection...');

    try {
      // Disconnect
      await this.provider.disconnect();
      
      // Wait before reconnecting
      await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
      
      // Reconnect
      await this.provider.initialize();
      
      // Verify connection
      const isHealthy = await this.provider.healthCheck();
      
      if (isHealthy) {
        console.log('[HealthMonitor] Reconnection successful');
        this.status.consecutiveFailures = 0;
        
        if (this.config.onReconnect) {
          this.config.onReconnect(true);
        }
      } else {
        throw new Error('Health check failed after reconnection');
      }
    } catch (error) {
      console.error('[HealthMonitor] Reconnection failed:', error);
      
      if (this.config.onReconnect) {
        this.config.onReconnect(false);
      }
    } finally {
      this.isReconnecting = false;
    }
  }

  /**
   * Force reconnection
   */
  async forceReconnect(): Promise<boolean> {
    console.log('[HealthMonitor] Forcing reconnection...');
    await this.attemptReconnection();
    return this.status.healthy;
  }
}

/**
 * Global monitoring manager
 */
class MonitoringManager {
  private monitors = new Map<string, HealthMonitor>();

  /**
   * Add provider to monitoring
   */
  monitor(
    providerId: string,
    provider: IStorageProvider,
    config?: Partial<MonitoringConfig>
  ): HealthMonitor {
    // Stop existing monitor if any
    this.stopMonitoring(providerId);

    const monitor = new HealthMonitor(provider, config);
    this.monitors.set(providerId, monitor);
    monitor.start();

    console.log(`[MonitoringManager] Started monitoring provider: ${providerId}`);
    return monitor;
  }

  /**
   * Stop monitoring a provider
   */
  stopMonitoring(providerId: string): void {
    const monitor = this.monitors.get(providerId);
    if (monitor) {
      monitor.stop();
      this.monitors.delete(providerId);
      console.log(`[MonitoringManager] Stopped monitoring provider: ${providerId}`);
    }
  }

  /**
   * Get monitor for provider
   */
  getMonitor(providerId: string): HealthMonitor | undefined {
    return this.monitors.get(providerId);
  }

  /**
   * Get all health statuses
   */
  getAllStatuses(): Map<string, HealthStatus> {
    const statuses = new Map<string, HealthStatus>();
    
    for (const [id, monitor] of this.monitors) {
      statuses.set(id, monitor.getStatus());
    }
    
    return statuses;
  }

  /**
   * Stop all monitoring
   */
  stopAll(): void {
    for (const [id] of this.monitors) {
      this.stopMonitoring(id);
    }
    console.log('[MonitoringManager] Stopped all monitoring');
  }
}

// Singleton instance
export const monitoringManager = new MonitoringManager();
