export interface Game {
  id: string
  title: string
  video_path: string | null
  created_at: string
  updated_at: string
}

export type CreateGameInput = Omit<Game, 'id' | 'created_at' | 'updated_at'>
