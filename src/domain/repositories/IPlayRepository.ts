import type { Play, CreatePlayInput, UpdatePlayInput } from '../entities/Play'
import type { PlayerPosition, CreatePlayerPositionInput, UpdatePlayerPositionInput } from '../entities/PlayerPosition'

export interface IPlayRepository {
  findByGameId(gameId: string): Promise<Play[]>
  findById(id: string): Promise<Play | null>
  create(input: CreatePlayInput): Promise<Play>
  update(id: string, input: UpdatePlayInput): Promise<Play>
  delete(id: string): Promise<void>

  getPositions(playId: string): Promise<PlayerPosition[]>
  addPosition(input: CreatePlayerPositionInput): Promise<PlayerPosition>
  updatePosition(id: string, input: UpdatePlayerPositionInput): Promise<PlayerPosition>
  deletePosition(id: string): Promise<void>
  replacePositions(playId: string, positions: CreatePlayerPositionInput[]): Promise<PlayerPosition[]>
}
