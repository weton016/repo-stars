export class StarCount {
  private constructor(readonly value: number) {}

  static create(value: number): StarCount {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid StarCount: ${value}`)
    }
    return new StarCount(value)
  }

  growthFrom(previous: StarCount): number {
    if (previous.value === 0) return 0
    return Math.round(((this.value - previous.value) / previous.value) * 100 * 10) / 10
  }
}

