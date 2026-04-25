import type { IPlayRepository } from '../../domain/repositories/IPlayRepository'
import type { Play, CreatePlayInput, UpdatePlayInput } from '../../domain/entities/Play'
import type { PlayerPosition, CreatePlayerPositionInput, UpdatePlayerPositionInput } from '../../domain/entities/PlayerPosition'

const SEED_PLAYS: Play[] = [
  { id: 'play-1', game_id: 'game-1', name: 'Super Swarm',  start_time: 315, end_time: 331, notes: 'Notice how the players are positioned in relation to the disc. There should only be about 10 yards of space between handlers and cutters.', drawing_data: null, video_drawing_data: null, tracking_data: null, created_at: new Date().toISOString() },
  { id: 'play-2', game_id: 'game-1', name: 'Infinity',     start_time: 612, end_time: 634, notes: 'Watch the cutter cycle through the stack.', drawing_data: null, video_drawing_data: null, tracking_data: null, created_at: new Date().toISOString() },
  { id: 'play-3', game_id: 'game-1', name: 'Wall',         start_time: 754, end_time: 769, notes: 'Good example of handler resets under pressure.', drawing_data: null, video_drawing_data: null, tracking_data: null, created_at: new Date().toISOString() },
  { id: 'play-4', game_id: 'game-2', name: 'Barnyard: Step 1', start_time: 60, end_time: 80, notes: 'Poppy picks up the frisbee and immediately finds Grace cutting under to get the play action started.', drawing_data: null, video_drawing_data: null, tracking_data: null, created_at: new Date().toISOString() },
]

const SEED_POSITIONS: PlayerPosition[] = [
  // game-1 / play-1  — offense (blue)
  { id: 'p1-o1', play_id: 'play-1', team: 'offense', x: 28, y: 22, label: 'H1' },
  { id: 'p1-o2', play_id: 'play-1', team: 'offense', x: 45, y: 35, label: 'C1' },
  { id: 'p1-o3', play_id: 'play-1', team: 'offense', x: 58, y: 55, label: 'C2' },
  { id: 'p1-o4', play_id: 'play-1', team: 'offense', x: 33, y: 65, label: 'H2' },
  { id: 'p1-o5', play_id: 'play-1', team: 'offense', x: 68, y: 38, label: 'C3' },
  { id: 'p1-o6', play_id: 'play-1', team: 'offense', x: 72, y: 68, label: 'C4' },
  { id: 'p1-o7', play_id: 'play-1', team: 'offense', x: 18, y: 50, label: 'H3' },
  // defense (red)
  { id: 'p1-d1', play_id: 'play-1', team: 'defense', x: 32, y: 26, label: 'D1' },
  { id: 'p1-d2', play_id: 'play-1', team: 'defense', x: 50, y: 40, label: 'D2' },
  { id: 'p1-d3', play_id: 'play-1', team: 'defense', x: 62, y: 60, label: 'D3' },
  { id: 'p1-d4', play_id: 'play-1', team: 'defense', x: 38, y: 70, label: 'D4' },
  { id: 'p1-d5', play_id: 'play-1', team: 'defense', x: 74, y: 43, label: 'D5' },
  { id: 'p1-d6', play_id: 'play-1', team: 'defense', x: 78, y: 73, label: 'D6' },
  { id: 'p1-d7', play_id: 'play-1', team: 'defense', x: 22, y: 55, label: 'D7' },
  // disc
  { id: 'p1-disc', play_id: 'play-1', team: 'disc', x: 26, y: 20, label: '' },

  // game-2 / play-4  — Barnyard
  { id: 'p4-o1', play_id: 'play-4', team: 'offense', x: 25, y: 30, label: 'H1' },
  { id: 'p4-o2', play_id: 'play-4', team: 'offense', x: 50, y: 42, label: 'C1' },
  { id: 'p4-o3', play_id: 'play-4', team: 'offense', x: 70, y: 28, label: 'C2' },
  { id: 'p4-o4', play_id: 'play-4', team: 'offense', x: 42, y: 62, label: 'C3' },
  { id: 'p4-o5', play_id: 'play-4', team: 'offense', x: 62, y: 68, label: 'C4' },
  { id: 'p4-d1', play_id: 'play-4', team: 'defense', x: 28, y: 34, label: 'D1' },
  { id: 'p4-d2', play_id: 'play-4', team: 'defense', x: 54, y: 46, label: 'D2' },
  { id: 'p4-d3', play_id: 'play-4', team: 'defense', x: 74, y: 32, label: 'D3' },
  { id: 'p4-disc', play_id: 'play-4', team: 'disc', x: 22, y: 28, label: '' },
]

export class MockPlayRepository implements IPlayRepository {
  private plays: Play[] = [...SEED_PLAYS]
  private positions: PlayerPosition[] = [...SEED_POSITIONS]

  async findByGameId(gameId: string): Promise<Play[]> {
    return this.plays.filter(p => p.game_id === gameId).sort((a, b) => a.start_time - b.start_time)
  }

  async findById(id: string): Promise<Play | null> {
    return this.plays.find(p => p.id === id) ?? null
  }

  async create(input: CreatePlayInput): Promise<Play> {
    const play: Play = { drawing_data: null, video_drawing_data: null, tracking_data: null, ...input, id: `play-${Date.now()}`, created_at: new Date().toISOString() }
    this.plays.push(play)
    return play
  }

  async update(id: string, input: UpdatePlayInput): Promise<Play> {
    const idx = this.plays.findIndex(p => p.id === id)
    if (idx === -1) throw new Error('Play not found')
    this.plays[idx] = { ...this.plays[idx], ...input }
    return this.plays[idx]
  }

  async delete(id: string): Promise<void> {
    this.plays = this.plays.filter(p => p.id !== id)
    this.positions = this.positions.filter(p => p.play_id !== id)
  }

  async getPositions(playId: string): Promise<PlayerPosition[]> {
    return this.positions.filter(p => p.play_id === playId)
  }

  async addPosition(input: CreatePlayerPositionInput): Promise<PlayerPosition> {
    const pos: PlayerPosition = { ...input, id: `pos-${Date.now()}-${Math.random()}` }
    this.positions.push(pos)
    return pos
  }

  async updatePosition(id: string, input: UpdatePlayerPositionInput): Promise<PlayerPosition> {
    const idx = this.positions.findIndex(p => p.id === id)
    if (idx === -1) throw new Error('Position not found')
    this.positions[idx] = { ...this.positions[idx], ...input }
    return this.positions[idx]
  }

  async deletePosition(id: string): Promise<void> {
    this.positions = this.positions.filter(p => p.id !== id)
  }

  async replacePositions(playId: string, positions: CreatePlayerPositionInput[]): Promise<PlayerPosition[]> {
    this.positions = this.positions.filter(p => p.play_id !== playId)
    const created = positions.map(p => ({ ...p, id: `pos-${Date.now()}-${Math.random()}` }))
    this.positions.push(...created)
    return created
  }
}
