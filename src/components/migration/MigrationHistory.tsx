import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, Play, Pause, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { migrationJobManager, type MigrationJob } from '@/lib/storage/migration-job';
import { formatDistanceToNow } from 'date-fns';

export function MigrationHistory() {
  const [jobs, setJobs] = useState<MigrationJob[]>([]);

  useEffect(() => {
    // Load jobs
    setJobs(migrationJobManager.getAllJobs());

    // Subscribe to updates
    const unsubscribe = migrationJobManager.subscribe(() => {
      setJobs(migrationJobManager.getAllJobs());
    });

    return unsubscribe;
  }, []);

  const handleDelete = (jobId: string) => {
    migrationJobManager.deleteJob(jobId);
  };

  const handleRetry = async (jobId: string) => {
    await migrationJobManager.startJob(jobId);
  };

  const handlePause = (jobId: string) => {
    migrationJobManager.pauseJob(jobId);
  };

  const handleResume = async (jobId: string) => {
    await migrationJobManager.resumeJob(jobId);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-destructive" />;
      case 'running':
        return <Play className="h-4 w-4 text-primary animate-pulse" />;
      case 'paused':
        return <Pause className="h-4 w-4 text-warning" />;
      default:
        return <Clock className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      completed: 'default',
      failed: 'destructive',
      running: 'default',
      paused: 'secondary',
      pending: 'secondary',
      cancelled: 'secondary',
    };

    return (
      <Badge variant={variants[status] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Migration History</CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={() => migrationJobManager.clearCompleted()}
        >
          Clear Completed
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[600px]">
          <div className="space-y-4">
            {jobs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No migration jobs yet
              </div>
            ) : (
              jobs.map(job => (
                <Card key={job.id} className="p-4">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusIcon(job.status)}
                        <h3 className="font-semibold">{job.name}</h3>
                        {getStatusBadge(job.status)}
                      </div>
                      {job.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {job.description}
                        </p>
                      )}
                      <div className="text-sm space-y-1">
                        <div>
                          <span className="text-muted-foreground">Tables: </span>
                          {job.tables.join(', ')}
                        </div>
                        <div>
                          <span className="text-muted-foreground">Progress: </span>
                          {job.progress.tablesCompleted}/{job.progress.totalTables} tables,{' '}
                          {job.progress.rowsMigrated} rows
                        </div>
                        {job.createdAt && (
                          <div>
                            <span className="text-muted-foreground">Created: </span>
                            {formatDistanceToNow(job.createdAt, { addSuffix: true })}
                          </div>
                        )}
                        {job.completedAt && (
                          <div>
                            <span className="text-muted-foreground">Completed: </span>
                            {formatDistanceToNow(job.completedAt, { addSuffix: true })}
                          </div>
                        )}
                      </div>
                      {job.error && (
                        <div className="mt-2 p-2 bg-destructive/10 rounded text-sm text-destructive">
                          {job.error}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      {job.status === 'running' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handlePause(job.id)}
                        >
                          <Pause className="h-4 w-4" />
                        </Button>
                      )}
                      {job.status === 'paused' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleResume(job.id)}
                        >
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {job.status === 'failed' && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleRetry(job.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      {(job.status === 'completed' || job.status === 'failed') && (
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => handleDelete(job.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {job.status === 'running' && (
                    <div className="mt-4">
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-muted-foreground">
                          {job.progress.currentTable}
                        </span>
                        <span className="font-medium">
                          {job.progress.percentComplete}%
                        </span>
                      </div>
                      <div className="h-2 bg-secondary rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary transition-all duration-300"
                          style={{ width: `${job.progress.percentComplete}%` }}
                        />
                      </div>
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
