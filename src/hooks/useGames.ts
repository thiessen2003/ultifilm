import { useState, useEffect, useCallback } from 'react'
import type { Game } from '../domain/entities/Game'
import { GameService } from '../services/GameService'
import { gameRepo, storageRepo } from '../infrastructure/ServiceProvider'

const gameService = new GameService(gameRepo, storageRepo)

export function useGames() {
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGames(await gameService.getAllGames())
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { reload() }, [reload])

  return { games, loading, error, reload, gameService }
}

export function useGame(id: string) {
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setGame(await gameService.getGame(id))
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { reload() }, [reload])

  return { game, setGame, loading, error, reload, gameService }
}
