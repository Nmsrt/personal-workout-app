import { describe, expect, it } from 'vitest'
import { musclesFor, routineMuscles } from './muscles'
import { legsRoutine, pullRoutine } from './seed'

describe('muscles', () => {
  it('name rules beat the shared illustration', () => {
    expect(musclesFor({ name: 'Overhead triceps extension' })).toEqual({ triceps: 3 })
    expect(musclesFor({ name: 'Overhead press' }).shoulders).toBe(3)
  })

  it('an explicit illustration wins over name rules', () => {
    expect(musclesFor({ name: 'Tricep thing', illustration: 'curl' }).biceps).toBe(3)
  })

  it('unknown exercises work nothing', () => {
    expect(routineMuscles({ exercises: [] }).ranked).toEqual([])
    expect(musclesFor({ name: 'Jumping jacks' })).toEqual({})
  })

  it('ranks a routine by set-weighted load', () => {
    const legs = routineMuscles(legsRoutine())
    expect(legs.ranked.slice(0, 2).sort()).toEqual(['glutes', 'quads'])
    expect(legs.tiers.biceps).toBeUndefined()
    const pull = routineMuscles(pullRoutine())
    expect(pull.tiers.biceps).toBe(3)
    expect(pull.tiers.chest).toBeUndefined()
  })
})
