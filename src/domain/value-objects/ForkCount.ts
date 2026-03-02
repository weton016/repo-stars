export class ForkCount {
  private constructor(readonly value: number) {}

  static create(value: number): ForkCount {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid ForkCount: ${value}`)
    }
    return new ForkCount(value)
  }

  growthFrom(previous: ForkCount): number {
    if (previous.value === 0) return 0
    return Math.round(((this.value - previous.value) / previous.value) * 100 * 10) / 10
  }
}

