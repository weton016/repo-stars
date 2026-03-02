export class MoMGrowth {
  private constructor(readonly value: number) {}

  static calculate(current: number, previous: number): MoMGrowth {
    if (previous === 0) return new MoMGrowth(0)
    const growth = ((current - previous) / previous) * 100
    return new MoMGrowth(Math.round(growth * 10) / 10)
  }

  isPositive(): boolean { return this.value > 0 }
  isNegative(): boolean { return this.value < 0 }

  format(): string {
    const sign = this.value > 0 ? '+' : ''
    return `${sign}${this.value}%`
  }
}

