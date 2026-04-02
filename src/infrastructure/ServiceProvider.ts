// ServiceProvider wires together the correct repository implementations.
// If Supabase env vars are present → real database + storage.
// Otherwise → in-memory mock so the app runs with zero config.

import type { IGameRepository } from '../domain/repositories/IGameRepository'
import type { IPlayRepository } from '../domain/repositories/IPlayRepository'
import type { IStorageRepository } from '../domain/repositories/IStorageRepository'
import type { IAnnotationRepository } from '../domain/repositories/IAnnotationRepository'

import { SupabaseGameRepository } from './supabase/SupabaseGameRepository'
import { SupabasePlayRepository } from './supabase/SupabasePlayRepository'
import { SupabaseStorageRepository } from './supabase/SupabaseStorageRepository'
import { SupabaseAnnotationRepository } from './supabase/SupabaseAnnotationRepository'

import { MockGameRepository } from './mock/MockGameRepository'
import { MockPlayRepository } from './mock/MockPlayRepository'
import { MockStorageRepository } from './mock/MockStorageRepository'
import { MockAnnotationRepository } from './mock/MockAnnotationRepository'

const IS_MOCK =
  !import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY

export const isMockMode = IS_MOCK

// Singletons — one instance per app lifetime so in-memory state persists across navigation.
export const gameRepo: IGameRepository           = IS_MOCK ? new MockGameRepository()         : new SupabaseGameRepository()
export const playRepo: IPlayRepository           = IS_MOCK ? new MockPlayRepository()         : new SupabasePlayRepository()
export const storageRepo: IStorageRepository     = IS_MOCK ? new MockStorageRepository()      : new SupabaseStorageRepository()
export const annotationRepo: IAnnotationRepository = IS_MOCK ? new MockAnnotationRepository() : new SupabaseAnnotationRepository()
