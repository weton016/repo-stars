export class ViewCount {
  private constructor(readonly value: number) {}

  static create(value: number): ViewCount {
    if (!Number.isInteger(value) || value < 0) {
      throw new Error(`Invalid ViewCount: ${value}`)
    }
    return new ViewCount(value)
  }

  growthFrom(previous: ViewCount): number {
    if (previous.value === 0) return 0
    return Math.round(((this.value - previous.value) / previous.value) * 100 * 10) / 10
  }
}

