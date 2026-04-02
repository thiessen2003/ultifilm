import type { IAnnotationRepository } from '../domain/repositories/IAnnotationRepository'
import type { Annotation, CreateAnnotationInput } from '../domain/entities/Annotation'

export class AnnotationService {
  constructor(private repo: IAnnotationRepository) {}

  getAnnotations(gameId: string): Promise<Annotation[]> {
    return this.repo.findByGameId(gameId)
  }

  createAnnotation(input: CreateAnnotationInput): Promise<Annotation> {
    return this.repo.create(input)
  }

  deleteAnnotation(id: string): Promise<void> {
    return this.repo.delete(id)
  }
}
