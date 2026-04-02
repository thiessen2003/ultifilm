import type { IGameRepository } from '../../domain/repositories/IGameRepository'
import type { Game, CreateGameInput } from '../../domain/entities/Game'

const SEED: Game[] = [
  {
    id: 'game-1',
    title: 'Pennsylvania vs. Tufts',
    video_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'game-2',
    title: 'Barnyard Example',
    video_path: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
]

export class MockGameRepository implements IGameRepository {
  private games: Game[] = [...SEED]

  async findAll(): Promise<Game[]> { return [...this.games] }

  async findById(id: string): Promise<Game | null> {
    return this.games.find(g => g.id === id) ?? null
  }

  async create(input: CreateGameInput): Promise<Game> {
    const game: Game = {
      ...input,
      id: `game-${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    this.games.unshift(game)
    return game
  }

  async update(id: string, input: Partial<CreateGameInput>): Promise<Game> {
    const idx = this.games.findIndex(g => g.id === id)
    if (idx === -1) throw new Error('Game not found')
    this.games[idx] = { ...this.games[idx], ...input, updated_at: new Date().toISOString() }
    return this.games[idx]
  }

  async delete(id: string): Promise<void> {
    this.games = this.games.filter(g => g.id !== id)
  }
}
