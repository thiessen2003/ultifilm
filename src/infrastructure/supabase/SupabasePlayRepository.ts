import { supabase } from './client'
import type { IPlayRepository } from '../../domain/repositories/IPlayRepository'
import type { Play, CreatePlayInput, UpdatePlayInput } from '../../domain/entities/Play'
import type { PlayerPosition, CreatePlayerPositionInput, UpdatePlayerPositionInput } from '../../domain/entities/PlayerPosition'

export class SupabasePlayRepository implements IPlayRepository {
  async findByGameId(gameId: string): Promise<Play[]> {
    const { data, error } = await supabase
      .from('plays')
      .select('*')
      .eq('game_id', gameId)
      .order('start_time', { ascending: true })
    if (error) throw error
    return data as Play[]
  }

  async findById(id: string): Promise<Play | null> {
    const { data, error } = await supabase
      .from('plays')
      .select('*')
      .eq('id', id)
      .single()
    if (error) return null
    return data as Play
  }

  async create(input: CreatePlayInput): Promise<Play> {
    const { data, error } = await supabase
      .from('plays')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as Play
  }

  async update(id: string, input: UpdatePlayInput): Promise<Play> {
    const { data, error } = await supabase
      .from('plays')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as Play
  }

  async delete(id: string): Promise<void> {
    const { error } = await supabase.from('plays').delete().eq('id', id)
    if (error) throw error
  }

  async getPositions(playId: string): Promise<PlayerPosition[]> {
    const { data, error } = await supabase
      .from('player_positions')
      .select('*')
      .eq('play_id', playId)
    if (error) throw error
    return data as PlayerPosition[]
  }

  async addPosition(input: CreatePlayerPositionInput): Promise<PlayerPosition> {
    const { data, error } = await supabase
      .from('player_positions')
      .insert(input)
      .select()
      .single()
    if (error) throw error
    return data as PlayerPosition
  }

  async updatePosition(id: string, input: UpdatePlayerPositionInput): Promise<PlayerPosition> {
    const { data, error } = await supabase
      .from('player_positions')
      .update(input)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data as PlayerPosition
  }

  async deletePosition(id: string): Promise<void> {
    const { error } = await supabase.from('player_positions').delete().eq('id', id)
    if (error) throw error
  }

  async replacePositions(playId: string, positions: CreatePlayerPositionInput[]): Promise<PlayerPosition[]> {
    const { error: deleteError } = await supabase.from('player_positions').delete().eq('play_id', playId)
    if (deleteError) throw deleteError
    if (positions.length === 0) return []
    const { data, error } = await supabase
      .from('player_positions')
      .insert(positions)
      .select()
    if (error) throw error
    return data as PlayerPosition[]
  }
}
