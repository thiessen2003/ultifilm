export interface Annotation {
  id: string
  game_id: string
  timestamp: number   // seconds from video start
  text: string
  created_at: string
}

export type CreateAnnotationInput = Omit<Annotation, 'id' | 'created_at'>
