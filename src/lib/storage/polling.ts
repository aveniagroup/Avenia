/**
 * Polling-based Real-time Updates
 * Provides pseudo-realtime functionality for providers without native support
 */

import type { IStorageProvider, RealtimePayload } from './types';

export type PollingCallback = (payload: RealtimePayload) => void;

interface PollingSubscription {
  table: string;
  lastCheck: Date;
  lastData: any[];
  callbacks: PollingCallback[];
  interval: NodeJS.Timeout | null;
}

/**
 * Polling Manager
 * Manages polling intervals for multiple tables
 */
export class PollingManager {
  private subscriptions: Map<string, PollingSubscription> = new Map();
  private provider: IStorageProvider;
  private pollingInterval: number;

  constructor(provider: IStorageProvider, pollingInterval: number = 5000) {
    this.provider = provider;
    this.pollingInterval = pollingInterval;
  }

  /**
   * Subscribe to table changes
   */
  subscribe(
    table: string,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*',
    callback: PollingCallback
  ): () => void {
    const key = `${table}_${event}`;
    
    let subscription = this.subscriptions.get(key);
    
    if (!subscription) {
      subscription = {
        table,
        lastCheck: new Date(),
        lastData: [],
        callbacks: [],
        interval: null,
      };
      this.subscriptions.set(key, subscription);
    }

    subscription.callbacks.push(callback);

    // Start polling if not already started
    if (!subscription.interval) {
      this.startPolling(key, subscription, event);
    }

    // Return unsubscribe function
    return () => {
      const sub = this.subscriptions.get(key);
      if (sub) {
        const index = sub.callbacks.indexOf(callback);
        if (index > -1) {
          sub.callbacks.splice(index, 1);
        }

        // Stop polling if no more callbacks
        if (sub.callbacks.length === 0) {
          this.stopPolling(key);
        }
      }
    };
  }

  /**
   * Start polling for a table
   */
  private startPolling(
    key: string,
    subscription: PollingSubscription,
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  ): void {
    const poll = async () => {
      try {
        // Query for recent changes
        const result = await this.provider
          .from(subscription.table)
          .select('*')
          .order('updated_at', { ascending: false })
          .limit(100)
          .execute();

        if (!result.data || result.error) {
          console.error('Polling error:', result.error);
          return;
        }

        const currentData = Array.isArray(result.data) ? result.data : [result.data];

        // Detect changes
        const changes = this.detectChanges(subscription.lastData, currentData, event);

        // Notify callbacks
        for (const change of changes) {
          for (const callback of subscription.callbacks) {
            callback(change);
          }
        }

        // Update subscription state
        subscription.lastData = currentData;
        subscription.lastCheck = new Date();
      } catch (error) {
        console.error('Polling error:', error);
      }
    };

    // Initial poll
    poll();

    // Set up interval
    subscription.interval = setInterval(poll, this.pollingInterval);
  }

  /**
   * Stop polling for a table
   */
  private stopPolling(key: string): void {
    const subscription = this.subscriptions.get(key);
    if (subscription?.interval) {
      clearInterval(subscription.interval);
      subscription.interval = null;
    }
    this.subscriptions.delete(key);
  }

  /**
   * Detect changes between old and new data
   */
  private detectChanges(
    oldData: any[],
    newData: any[],
    event: 'INSERT' | 'UPDATE' | 'DELETE' | '*'
  ): RealtimePayload[] {
    const changes: RealtimePayload[] = [];

    const oldIds = new Set(oldData.map(item => item.id));
    const newIds = new Set(newData.map(item => item.id));

    // Detect inserts
    if (event === 'INSERT' || event === '*') {
      for (const item of newData) {
        if (!oldIds.has(item.id)) {
          changes.push({
            eventType: 'INSERT',
            new: item,
            old: null,
            schema: 'public',
            table: '',
          });
        }
      }
    }

    // Detect updates
    if (event === 'UPDATE' || event === '*') {
      for (const newItem of newData) {
        const oldItem = oldData.find(item => item.id === newItem.id);
        if (oldItem && JSON.stringify(oldItem) !== JSON.stringify(newItem)) {
          changes.push({
            eventType: 'UPDATE',
            new: newItem,
            old: oldItem,
            schema: 'public',
            table: '',
          });
        }
      }
    }

    // Detect deletes
    if (event === 'DELETE' || event === '*') {
      for (const item of oldData) {
        if (!newIds.has(item.id)) {
          changes.push({
            eventType: 'DELETE',
            new: null,
            old: item,
            schema: 'public',
            table: '',
          });
        }
      }
    }

    return changes;
  }

  /**
   * Stop all polling
   */
  stopAll(): void {
    for (const key of this.subscriptions.keys()) {
      this.stopPolling(key);
    }
  }

  /**
   * Get active subscriptions count
   */
  getActiveSubscriptions(): number {
    return this.subscriptions.size;
  }
}
