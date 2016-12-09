var limit = require('../')
var tape = require('tape')
var pull = require('pull-stream')
var probe = require('pull-probe')
var ws = require('pull-ws')
var debug = require('debug')
var log = debug('test')

tape('Limit to one value inside the WebSocket stream', function (t) {
  var actual = []
  var expected = ['0', '0', '1', '1', '2', '2']

  log('creating server')
  var server = ws.createServer(function (stream) {
    log('server received connection')
    pull(stream, stream)
  }).listen(5000)

  log('registering listener')
  server.on('listening', function () {
    ws.connect('ws://localhost:5000', function (err, stream) {
      if (err) {
        t.fail('error connecting to server')
        return t.end()
      }
      log('client connected')

      pull(
        pull.count(2),
        pull.map(String),
        pull.through(function (x) { actual.push(x) }),
        probe('client:sending'),
        limit(stream),
        probe('client:receiving'),
        pull.through(function (x) { actual.push(x) }),
        pull.drain(null, function () {
          server.close()
          t.deepEqual(actual, expected)
          t.end()
        })
      )
    })
  })
})
