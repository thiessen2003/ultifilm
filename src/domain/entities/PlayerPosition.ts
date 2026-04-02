export type Team = 'offense' | 'defense' | 'disc'

export interface PlayerPosition {
  id: string
  play_id: string
  team: Team
  x: number    // 0–100 percentage of canvas width
  y: number    // 0–100 percentage of canvas height
  label: string
}

export type CreatePlayerPositionInput = Omit<PlayerPosition, 'id'>
export type UpdatePlayerPositionInput = Partial<Pick<PlayerPosition, 'x' | 'y' | 'label' | 'team'>>
