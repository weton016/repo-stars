import { GithubRepoId } from '../value-objects/GithubRepoId'
import { RepoUrl } from '../value-objects/RepoUrl'
import { StarCount } from '../value-objects/StarCount'
import { RepositorySnapshotProps } from './RepositorySnapshot'

export interface RepositoryProps {
  id: string
  githubRepoId: GithubRepoId
  userId: string
  name: string
  fullName: string
  url: RepoUrl
  stars: StarCount
  forks: number
  views: number
  webhookId?: number
  createdAt: Date
  updatedAt: Date
}

export class Repository {
  private constructor(private readonly props: RepositoryProps) {}

  static create(props: RepositoryProps): Repository {
    return new Repository(props)
  }

  static fromGithubPayload(payload: {
    id: number
    name: string
    full_name: string
    html_url: string
    stargazers_count: number
    forks_count: number
    userId: string
    repoId: string
  }): Repository {
    return new Repository({
      id: payload.repoId,
      githubRepoId: GithubRepoId.create(payload.id),
      userId: payload.userId,
      name: payload.name,
      fullName: payload.full_name,
      url: RepoUrl.create(payload.html_url),
      stars: StarCount.create(payload.stargazers_count),
      forks: payload.forks_count,
      views: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
  }

  get id() { return this.props.id }
  get githubRepoId() { return this.props.githubRepoId }
  get userId() { return this.props.userId }
  get name() { return this.props.name }
  get fullName() { return this.props.fullName }
  get url() { return this.props.url }
  get stars() { return this.props.stars }
  get forks() { return this.props.forks }
  get views() { return this.props.views }
  get webhookId() { return this.props.webhookId }

  updateFromWebhook(stars: number, forks: number): Repository {
    return new Repository({
      ...this.props,
      stars: StarCount.create(stars),
      forks,
      updatedAt: new Date(),
    })
  }

  updateViews(views: number): Repository {
    return new Repository({
      ...this.props,
      views,
      updatedAt: new Date(),
    })
  }

  attachWebhook(webhookId: number): Repository {
    return new Repository({ ...this.props, webhookId })
  }

  toSnapshot(source: 'sync' | 'webhook' | 'cron'): RepositorySnapshotProps {
    return {
      repositoryId: this.props.id,
      stars: this.props.stars.value,
      forks: this.props.forks,
      views: this.props.views,
      source,
      recordedAt: new Date(),
    }
  }
}

