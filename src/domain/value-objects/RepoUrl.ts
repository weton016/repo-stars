export class RepoUrl {
  private constructor(readonly value: string) {}

  static create(value: string): RepoUrl {
    try {
      const url = new URL(value)
      if (url.hostname !== 'github.com') throw new Error()
      return new RepoUrl(value)
    } catch {
      throw new Error(`Invalid RepoUrl: ${value}`)
    }
  }
}

