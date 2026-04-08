process.env.VITE_API_URL = 'http://test'

const immutableEnv = new Proxy(process.env, {
  set() {
    return false
  },
  deleteProperty() {
    return false
  },
  defineProperty() {
    return false
  }
})

Object.defineProperty(process, 'env', {
  value: immutableEnv,
  configurable: true
})
