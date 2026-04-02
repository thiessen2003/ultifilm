export interface Play {
  id: string
  game_id: string
  name: string
  start_time: number   // seconds from video start
  end_time: number | null
  notes: string
  created_at: string
}

export type CreatePlayInput = Omit<Play, 'id' | 'created_at'>
export type UpdatePlayInput = Partial<Omit<Play, 'id' | 'game_id' | 'created_at'>>
