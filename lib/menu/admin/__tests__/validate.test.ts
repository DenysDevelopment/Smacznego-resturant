import { describe, it, expect } from 'vitest'
import {
  cleanI18n, validateDishInput, validateOptionGroupInput, validateOptionInput,
  type DishInput, type OptionGroupInput, type OptionInput,
} from '@/lib/menu/admin/validate'

function dish(over: Partial<DishInput> = {}): DishInput {
  return {
    categoryId: 'c1',
    name: { pl: 'Pierogi' },
    description: {},
    basePrice: 2400,
    photoUrl: null,
    isAvailable: true,
    tags: [],
    sort: 0,
    ...over,
  }
}

describe('cleanI18n', () => {
  it('drops empty/whitespace locales and trims', () => {
    expect(cleanI18n({ pl: ' Pierogi ', uk: '', ru: '  ' })).toEqual({ pl: 'Pierogi' })
  })
})

describe('validateDishInput', () => {
  it('accepts a valid dish', () => {
    expect(validateDishInput(dish())).toEqual({ ok: true })
  })
  it('requires a PL name', () => {
    expect(validateDishInput(dish({ name: { uk: 'Вареники' } }))).toMatchObject({ ok: false, field: 'name' })
  })
  it('rejects negative or fractional price', () => {
    expect(validateDishInput(dish({ basePrice: -1 }))).toMatchObject({ ok: false, field: 'basePrice' })
    expect(validateDishInput(dish({ basePrice: 10.5 }))).toMatchObject({ ok: false, field: 'basePrice' })
  })
  it('requires a category', () => {
    expect(validateDishInput(dish({ categoryId: '' }))).toMatchObject({ ok: false, field: 'categoryId' })
  })
})

function group(over: Partial<OptionGroupInput> = {}): OptionGroupInput {
  return { dishId: 'd1', name: { pl: 'Dodatki' }, minSelect: 0, maxSelect: 3, required: false, sort: 0, ...over }
}

describe('validateOptionGroupInput', () => {
  it('accepts a valid group', () => {
    expect(validateOptionGroupInput(group())).toEqual({ ok: true })
  })
  it('requires PL name and min<=max, min>=0', () => {
    expect(validateOptionGroupInput(group({ name: {} }))).toMatchObject({ ok: false, field: 'name' })
    expect(validateOptionGroupInput(group({ minSelect: -1 }))).toMatchObject({ ok: false, field: 'minSelect' })
    expect(validateOptionGroupInput(group({ minSelect: 2, maxSelect: 1 }))).toMatchObject({ ok: false, field: 'maxSelect' })
  })
})

describe('validateOptionInput', () => {
  const opt = (over: Partial<OptionInput> = {}): OptionInput =>
    ({ optionGroupId: 'g1', name: { pl: 'Skwarki' }, priceDelta: 200, sort: 0, ...over })
  it('accepts valid options incl. negative delta', () => {
    expect(validateOptionInput(opt())).toEqual({ ok: true })
    expect(validateOptionInput(opt({ priceDelta: -100 }))).toEqual({ ok: true })
  })
  it('rejects fractional delta and missing PL name', () => {
    expect(validateOptionInput(opt({ priceDelta: 1.5 }))).toMatchObject({ ok: false, field: 'priceDelta' })
    expect(validateOptionInput(opt({ name: { ru: 'Шкварки' } }))).toMatchObject({ ok: false, field: 'name' })
  })
})
