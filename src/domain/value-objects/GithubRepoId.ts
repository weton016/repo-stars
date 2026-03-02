export class GithubRepoId {
  private constructor(readonly value: number) {}

  static create(value: number): GithubRepoId {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`Invalid GithubRepoId: ${value}`)
    }
    return new GithubRepoId(value)
  }

  equals(other: GithubRepoId): boolean {
    return this.value === other.value
  }
}

