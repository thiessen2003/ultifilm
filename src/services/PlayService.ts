import type { IPlayRepository } from '../domain/repositories/IPlayRepository'
import type { Play, CreatePlayInput, UpdatePlayInput } from '../domain/entities/Play'
import type { PlayerPosition, CreatePlayerPositionInput } from '../domain/entities/PlayerPosition'

export class PlayService {
  constructor(private playRepo: IPlayRepository) {}

  getPlaysForGame(gameId: string): Promise<Play[]> {
    return this.playRepo.findByGameId(gameId)
  }

  getPlay(id: string): Promise<Play | null> {
    return this.playRepo.findById(id)
  }

  createPlay(input: CreatePlayInput): Promise<Play> {
    return this.playRepo.create(input)
  }

  updatePlay(id: string, input: UpdatePlayInput): Promise<Play> {
    return this.playRepo.update(id, input)
  }

  deletePlay(id: string): Promise<void> {
    return this.playRepo.delete(id)
  }

  getPositions(playId: string): Promise<PlayerPosition[]> {
    return this.playRepo.getPositions(playId)
  }

  savePositions(playId: string, positions: CreatePlayerPositionInput[]): Promise<PlayerPosition[]> {
    return this.playRepo.replacePositions(playId, positions)
  }
}
