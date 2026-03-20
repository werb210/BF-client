import { server } from './server'
import { beforeAll, afterAll, afterEach } from 'vitest'

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

console.log('[CLIENT TEST MOCK SERVER ACTIVE]')
