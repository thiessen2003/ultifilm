import { supabase } from './client'
import type { IGameRepository } from '../../domain/repositories/IGameRepository'
import type { Game, CreateGameInput } from '../../domain/entities/Game'

export class SupabaseGameRepository implements IGameRepository {
  async findAll(): Promise<Game[]> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data as Game[]
  }

  async findById(id: string): Promise<Game | null> {
    const { data, error } = await supabase
      .from('games')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data as Game
  }

  async create(input: CreateGameInput): Promise<Game> {
    const { data, error } = await supabase
      .from('games')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as Game
  }

  async update(id: string, input: Partial<CreateGameInput>): Promise<Game> {
    const { data, error } = await supabase
      .from('games')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Game
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('games').delete().eq('id', id)
    if (error) throw error
  }
}
