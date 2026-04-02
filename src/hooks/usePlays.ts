import { useState, useEffect, useCallback } from 'react'
import type { Play } from '../domain/entities/Play'
import type { PlayerPosition } from '../domain/entities/PlayerPosition'
import { PlayService } from '../services/PlayService'
import { playRepo } from '../infrastructure/ServiceProvider'

const playService = new PlayService(playRepo)

export function usePlays(gameId: string) {
  const [plays, setPlays] = useState<Play[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setPlays(await playService.getPlaysForGame(gameId))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => { reload() }, [reload])

  return { plays, setPlays, loading, error, reload, playService }
}

export function usePlayPositions(playId: string) {
  const [positions, setPositions] = useState<PlayerPosition[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setPositions(await playService.getPositions(playId))
    } finally {
      setLoading(false)
    }
  }, [playId])

  useEffect(() => { reload() }, [reload])

  return { positions, setPositions, loading, reload, playService }
}
