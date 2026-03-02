export interface RepositorySnapshotProps {
  id?: string
  repositoryId: string
  stars: number
  forks: number
  views: number
  source: 'sync' | 'webhook' | 'cron'
  recordedAt: Date
}

export class RepositorySnapshot {
  private constructor(private readonly props: RepositorySnapshotProps) {}

  static create(props: RepositorySnapshotProps): RepositorySnapshot {
    return new RepositorySnapshot(props)
  }

  get repositoryId() { return this.props.repositoryId }
  get stars() { return this.props.stars }
  get forks() { return this.props.forks }
  get views() { return this.props.views }
  get source() { return this.props.source }
  get recordedAt() { return this.props.recordedAt }
}

