var pull = require('pull-stream')
var ws = require('pull-ws')
var limit = require('../')

var server = ws.createServer(function (stream) {
  pull(
    stream,
    pull.map(function (x) { return x.toLowerCase() }),
    stream
  )
}).listen(5000)

ws.connect('ws://localhost:5000', function (err, stream) {
  if (err) throw err

  // Prints 'A', 'a', 'B', 'b', 'C', 'c'
  pull(
    pull.values(['A', 'B', 'C']),
    pull.through(console.log),
    limit(stream),
    pull.through(console.log),
    pull.drain(null, function () {
      server.close()
    })
  )
})
