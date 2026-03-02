import { createHmac, timingSafeEqual } from 'crypto'

export class GithubWebhookValidator {
  constructor(private readonly secret: string) {}

  validate(payload: string, signature: string | null): boolean {
    if (!signature) return false

    const expectedSignature = 'sha256=' + createHmac('sha256', this.secret)
      .update(payload, 'utf8')
      .digest('hex')

    try {
      return timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )
    } catch {
      return false
    }
  }
}

