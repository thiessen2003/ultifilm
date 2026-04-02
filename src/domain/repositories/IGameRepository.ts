import type { Game, CreateGameInput } from '../entities/Game'

export interface IGameRepository {
  findAll(): Promise<Game[]>
  findById(id: string): Promise<Game | null>
  create(input: CreateGameInput): Promise<Game>
  update(id: string, input: Partial<CreateGameInput>): Promise<Game>
  delete(id: string): Promise<void>
}
