import { supabase } from './client'
import type { IStorageRepository } from '../../domain/repositories/IStorageRepository'

const BUCKET = 'videos'

export class SupabaseStorageRepository implements IStorageRepository {
  async uploadVideo(file: File, gameId: string): Promise<string> {
    const path = `games/${gameId}/${Date.now()}_${file.name}`
    const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
    })
    if (error) throw error
    return path
  }

  getVideoUrl(path: string): string {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return data.publicUrl
  }

  async deleteVideo(path: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([path])
    if (error) throw error
  }
}
