import { setupServer } from 'msw/node'
import { rest } from 'msw'

export const server = setupServer(
  rest.get('/*', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({}))
  }),
  rest.post('/*', (req, res, ctx) => {
    return res(ctx.status(200), ctx.json({ success: true }))
  })
)
