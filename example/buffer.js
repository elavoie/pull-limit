var pull = require('pull-stream')
var buffer = require('pull-eager-buffer')
var limit = require('../')

// Prints 0,0,1,1,2,2
pull(
  pull.count(2),
  pull.through(console.log),
  limit(buffer()),
  pull.through(console.log),
  pull.drain()
)
