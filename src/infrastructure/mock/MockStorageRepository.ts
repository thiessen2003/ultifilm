import type { IStorageRepository } from '../../domain/repositories/IStorageRepository'

// In demo mode, videos are stored as local object URLs in memory.
// This lets users upload and preview a video without any backend.
export class MockStorageRepository implements IStorageRepository {
  async uploadVideo(file: File, _gameId: string): Promise<string> {
    return URL.createObjectURL(file)
  }

  getVideoUrl(path: string): string {
    return path  // already a full URL (object URL or http)
  }

  async deleteVideo(_path: string): Promise<void> {
    // noop
  }
}
