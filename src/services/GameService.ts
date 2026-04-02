import type { IGameRepository } from '../domain/repositories/IGameRepository'
import type { IStorageRepository } from '../domain/repositories/IStorageRepository'
import type { Game } from '../domain/entities/Game'

export class GameService {
  constructor(
    private gameRepo: IGameRepository,
    private storageRepo: IStorageRepository,
  ) {}

  getAllGames(): Promise<Game[]> {
    return this.gameRepo.findAll()
  }

  getGame(id: string): Promise<Game | null> {
    return this.gameRepo.findById(id)
  }

  async createGame(title: string, videoFile?: File): Promise<Game> {
    const game = await this.gameRepo.create({ title, video_path: null })
    if (videoFile) {
      const path = await this.storageRepo.uploadVideo(videoFile, game.id)
      return this.gameRepo.update(game.id, { video_path: path })
    }
    return game
  }

  async uploadVideo(gameId: string, file: File): Promise<Game> {
    const path = await this.storageRepo.uploadVideo(file, gameId)
    return this.gameRepo.update(gameId, { video_path: path })
  }

  getVideoUrl(game: Game): string | null {
    if (!game.video_path) return null
    return this.storageRepo.getVideoUrl(game.video_path)
  }

  deleteGame(id: string): Promise<void> {
    return this.gameRepo.delete(id)
  }
}
