export interface GithubRepo {
  id: number
  name: string
  full_name: string
  html_url: string
  stargazers_count: number
  forks_count: number
  owner: { login: string }
}

export class GithubApiClient {
  constructor(private readonly accessToken: string) { }

  private async fetch<T>(path: string, options?: RequestInit): Promise<T> {
    const res = await fetch(`https://api.github.com${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...options?.headers,
      },
    })

    if (!res.ok) {
      const body = await res.text()
      throw new Error(`GitHub API error ${res.status}: ${body}`)
    }

    return res.json()
  }

  async getPublicRepos(): Promise<GithubRepo[]> {
    return this.fetch<GithubRepo[]>('/user/repos?type=public&per_page=100')
  }

  async createWebhook(owner: string, repo: string, webhookUrl: string): Promise<{ id: number }> {
    const response = await this.fetch<any>(`/repos/${owner}/${repo}/hooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'web',
        config: {
          url: webhookUrl,
          content_type: 'json',
          secret: process.env.GITHUB_WEBHOOK_SECRET,
        },
        events: ['star', 'fork', 'watch', 'push'],
        active: true,
      }),
    })

    console.log(`GitHub webhook response for ${owner}/${repo}:`, JSON.stringify(response, null, 2))

    // A resposta do GitHub pode ter 'id' como número
    if (!response.id) {
      throw new Error(`Webhook response missing id: ${JSON.stringify(response)}`)
    }

    return { id: response.id }
  }

  async deleteWebhook(owner: string, repo: string, hookId: number): Promise<void> {
    await this.fetch(`/repos/${owner}/${repo}/hooks/${hookId}`, { method: 'DELETE' })
  }

  async getTrafficViews(owner: string, repo: string): Promise<{ count: number }> {
    return this.fetch(`/repos/${owner}/${repo}/traffic/views`)
  }
}

