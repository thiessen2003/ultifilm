export interface Play {
  id: string
  game_id: string
  name: string
  start_time: number   // seconds from video start
  end_time: number | null
  notes: string
  drawing_data: string | null        // field diagram drawing (base64 PNG)
  video_drawing_data: string | null  // video overlay drawing (base64 PNG)
  created_at: string
}

export type CreatePlayInput = Omit<Play, 'id' | 'created_at' | 'drawing_data' | 'video_drawing_data'>
export type UpdatePlayInput = Partial<Omit<Play, 'id' | 'game_id' | 'created_at'>>
