import type { IAnnotationRepository } from '../../domain/repositories/IAnnotationRepository'
import type { Annotation, CreateAnnotationInput } from '../../domain/entities/Annotation'

const SEED: Annotation[] = [
  { id: 'ann-1', game_id: 'game-1', timestamp: 315, text: 'Notice how the stack collapses here — great defensive read.', created_at: new Date().toISOString() },
  { id: 'ann-2', game_id: 'game-1', timestamp: 612, text: 'Turnover — handler stall count hit 7.', created_at: new Date().toISOString() },
]

export class MockAnnotationRepository implements IAnnotationRepository {
  private annotations: Annotation[] = [...SEED]

  async findByGameId(gameId: string): Promise<Annotation[]> {
    return this.annotations.filter(a => a.game_id === gameId).sort((a, b) => a.timestamp - b.timestamp)
  }

  async create(input: CreateAnnotationInput): Promise<Annotation> {
    const ann: Annotation = { ...input, id: `ann-${Date.now()}`, created_at: new Date().toISOString() }
    this.annotations.push(ann)
    return ann
  }

  async delete(id: string): Promise<void> {
    this.annotations = this.annotations.filter(a => a.id !== id)
  }
}
