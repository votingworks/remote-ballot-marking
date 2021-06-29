const proxy = require('http-proxy-middleware')
const target = 'http://localhost:3001/'

module.exports = function (app) {
  app.use(proxy('/auth/**', { target }))
  app.use(proxy('/api/**', { target }))
}
