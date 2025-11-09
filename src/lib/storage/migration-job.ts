import type { IStorageProvider } from './types';
import type { MigrationResult } from './migrations';
import type { TransformationConfig } from './transformation';

/**
 * Migration Job Management System
 */

export type MigrationJobStatus = 
  | 'pending' 
  | 'running' 
  | 'paused' 
  | 'completed' 
  | 'failed' 
  | 'cancelled';

export interface MigrationCheckpoint {
  tableName: string;
  rowsProcessed: number;
  lastProcessedId?: any;
  timestamp: Date;
}

export interface MigrationJob {
  id: string;
  name: string;
  description?: string;
  sourceProvider: IStorageProvider;
  targetProvider: IStorageProvider;
  tables: string[];
  status: MigrationJobStatus;
  progress: {
    currentTable?: string;
    tablesCompleted: number;
    totalTables: number;
    rowsMigrated: number;
    totalRows?: number;
    percentComplete: number;
  };
  checkpoint?: MigrationCheckpoint;
  transformations?: TransformationConfig;
  options: {
    batchSize: number;
    skipExisting: boolean;
    validateData: boolean;
    dryRun: boolean;
    continueOnError: boolean;
  };
  result?: MigrationResult;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
}

export type MigrationJobEventType = 
  | 'created'
  | 'started'
  | 'progress'
  | 'paused'
  | 'resumed'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface MigrationJobEvent {
  jobId: string;
  type: MigrationJobEventType;
  timestamp: Date;
  data?: any;
}

type MigrationJobListener = (event: MigrationJobEvent) => void;

/**
 * Migration Job Manager
 */
export class MigrationJobManager {
  private jobs: Map<string, MigrationJob> = new Map();
  private listeners: MigrationJobListener[] = [];
  private activeJobs: Set<string> = new Set();

  /**
   * Create a new migration job
   */
  createJob(config: {
    name: string;
    description?: string;
    sourceProvider: IStorageProvider;
    targetProvider: IStorageProvider;
    tables: string[];
    transformations?: TransformationConfig;
    options?: Partial<MigrationJob['options']>;
  }): MigrationJob {
    const job: MigrationJob = {
      id: crypto.randomUUID(),
      name: config.name,
      description: config.description,
      sourceProvider: config.sourceProvider,
      targetProvider: config.targetProvider,
      tables: config.tables,
      status: 'pending',
      progress: {
        tablesCompleted: 0,
        totalTables: config.tables.length,
        rowsMigrated: 0,
        percentComplete: 0,
      },
      transformations: config.transformations,
      options: {
        batchSize: 1000,
        skipExisting: false,
        validateData: true,
        dryRun: false,
        continueOnError: false,
        ...config.options,
      },
      createdAt: new Date(),
    };

    this.jobs.set(job.id, job);
    this.emitEvent({ jobId: job.id, type: 'created', timestamp: new Date() });

    return job;
  }

  /**
   * Start a migration job
   */
  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (this.activeJobs.has(jobId)) throw new Error(`Job ${jobId} already running`);

    job.status = 'running';
    job.startedAt = new Date();
    this.activeJobs.add(jobId);

    this.emitEvent({ jobId, type: 'started', timestamp: new Date() });

    try {
      // Execute migration (simplified - actual implementation in migrations.ts)
      const startTable = job.checkpoint?.tableName
        ? job.tables.indexOf(job.checkpoint.tableName)
        : 0;

      for (let i = startTable; i < job.tables.length; i++) {
        // Check current job status (may have changed during execution)
        const currentJob = this.jobs.get(jobId);
        if (currentJob && (currentJob.status === 'paused' || currentJob.status === 'cancelled')) break;

        const tableName = job.tables[i];
        job.progress.currentTable = tableName;

        // Update progress
        job.progress.tablesCompleted = i;
        job.progress.percentComplete = Math.round((i / job.tables.length) * 100);

        this.emitEvent({
          jobId,
          type: 'progress',
          timestamp: new Date(),
          data: job.progress,
        });

        // Create checkpoint
        job.checkpoint = {
          tableName,
          rowsProcessed: job.progress.rowsMigrated,
          timestamp: new Date(),
        };
      }

      if (job.status === 'running') {
        job.status = 'completed';
        job.completedAt = new Date();
        job.progress.percentComplete = 100;
        this.emitEvent({ jobId, type: 'completed', timestamp: new Date() });
      }
    } catch (error) {
      job.status = 'failed';
      job.error = error instanceof Error ? error.message : 'Unknown error';
      job.completedAt = new Date();
      this.emitEvent({
        jobId,
        type: 'failed',
        timestamp: new Date(),
        data: { error: job.error },
      });
    } finally {
      this.activeJobs.delete(jobId);
    }
  }

  /**
   * Pause a running job
   */
  pauseJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'running') throw new Error(`Job ${jobId} is not running`);

    job.status = 'paused';
    this.emitEvent({ jobId, type: 'paused', timestamp: new Date() });
  }

  /**
   * Resume a paused job
   */
  async resumeJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);
    if (job.status !== 'paused') throw new Error(`Job ${jobId} is not paused`);

    this.emitEvent({ jobId, type: 'resumed', timestamp: new Date() });
    await this.startJob(jobId);
  }

  /**
   * Cancel a job
   */
  cancelJob(jobId: string): void {
    const job = this.jobs.get(jobId);
    if (!job) throw new Error(`Job ${jobId} not found`);

    job.status = 'cancelled';
    job.completedAt = new Date();
    this.activeJobs.delete(jobId);
    this.emitEvent({ jobId, type: 'cancelled', timestamp: new Date() });
  }

  /**
   * Get job by ID
   */
  getJob(jobId: string): MigrationJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAllJobs(): MigrationJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get jobs by status
   */
  getJobsByStatus(status: MigrationJobStatus): MigrationJob[] {
    return this.getAllJobs().filter(job => job.status === status);
  }

  /**
   * Delete a job
   */
  deleteJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job) return false;
    if (this.activeJobs.has(jobId)) {
      throw new Error('Cannot delete running job');
    }
    return this.jobs.delete(jobId);
  }

  /**
   * Subscribe to job events
   */
  subscribe(listener: MigrationJobListener): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) this.listeners.splice(index, 1);
    };
  }

  /**
   * Emit event to all listeners
   */
  private emitEvent(event: MigrationJobEvent): void {
    this.listeners.forEach(listener => listener(event));
  }

  /**
   * Clear completed jobs
   */
  clearCompleted(): number {
    let cleared = 0;
    for (const [id, job] of this.jobs.entries()) {
      if (job.status === 'completed' || job.status === 'failed') {
        this.jobs.delete(id);
        cleared++;
      }
    }
    return cleared;
  }
}

// Singleton instance
export const migrationJobManager = new MigrationJobManager();
