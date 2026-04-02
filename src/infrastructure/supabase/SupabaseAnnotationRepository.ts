import { supabase } from './client'
import type { IAnnotationRepository } from '../../domain/repositories/IAnnotationRepository'
import type { Annotation, CreateAnnotationInput } from '../../domain/entities/Annotation'

export class SupabaseAnnotationRepository implements IAnnotationRepository {
  async findByGameId(gameId: string): Promise<Annotation[]> {
    const { data, error } = await supabase
      .from('annotations')
      .select('*')
      .eq('game_id', gameId)
      .order('timestamp', { ascending: true })
    if (error) throw error
    return data as Annotation[]
  }

  async create(input: CreateAnnotationInput): Promise<Annotation> {
    const { data, error } = await supabase
      .from('annotations')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as Annotation
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('annotations').delete().eq('id', id)
    if (error) throw error
  }
}
