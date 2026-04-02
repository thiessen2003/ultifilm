import type { Annotation, CreateAnnotationInput } from '../entities/Annotation'

export interface IAnnotationRepository {
  findByGameId(gameId: string): Promise<Annotation[]>
  create(input: CreateAnnotationInput): Promise<Annotation>
  delete(id: string): Promise<void>
}
