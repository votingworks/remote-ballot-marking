// eslint-disable-next-line @typescript-eslint/no-var-requires,import/no-extraneous-dependencies
const proxy = require('http-proxy-middleware')

const target = 'http://localhost:3001/'

module.exports = function setupProxy(app) {
  app.use(proxy('/auth/**', { target }))
  app.use(proxy('/api/**', { target }))
  app.use(proxy('/voter/*', { target }))
}
