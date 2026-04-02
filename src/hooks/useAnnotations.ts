import { useState, useEffect, useCallback } from 'react'
import type { Annotation } from '../domain/entities/Annotation'
import { AnnotationService } from '../services/AnnotationService'
import { annotationRepo } from '../infrastructure/ServiceProvider'

const annotationService = new AnnotationService(annotationRepo)

export function useAnnotations(gameId: string) {
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      setAnnotations(await annotationService.getAnnotations(gameId))
    } finally {
      setLoading(false)
    }
  }, [gameId])

  useEffect(() => { reload() }, [reload])

  return { annotations, setAnnotations, loading, reload, annotationService }
}
