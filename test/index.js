var tape = require('tape')
var pull = require('pull-stream')
var buffer = require('pull-eager-buffer')
var limit = require('../')
var debug = require('debug')
var log = debug('test')
var probe = require('pull-probe')

tape('Testing various interleavings', function (t) {
  var _cb, l, _abort

  function expRead (expAbort) {
    t.equal(_abort, expAbort)
    _abort = undefined
  }
  function sink (abort, x) {
    var cb = _cb
    _cb = null
    cb(abort, x)
  }

  var waiting = []
  function expNext (expErr, expX) {
    var next = function (err, x) {
      if (waiting.length < 1 || waiting[0] !== next) {
        t.fail('Invalid callback order resolution')
      } else {
        waiting.shift()
      }

      if (err && err !== true) t.fail('unexpected error:' + err)
      t.equal(err, expErr)
      if (!err) {
        t.equal(x, expX)
      }
    }

    waiting.push(next)
    return next
  }

  function drain (abort, expNext) {
    l.source(abort, expNext)
  }

  function setup (stream) {
    l = limit(stream)
    l.sink(function read (abort, cb) {
      if (_abort !== undefined) {
        // Test that the previous value was false
        expRead(false)
      }
      _abort = abort
      _cb = cb
    })
  }

  function end () {
    if (waiting.length > 0) {
      t.fail('Unresolved callbacks')
    }
    t.end()
  }

  setup(pull.take(1))
  log('streamRead should not have been called until' +
    ' drain has been called at least once')
  expRead(undefined)
  t.equal(_cb === undefined, true)
  drain(null, expNext(null, 1))
  log('streamRead should have been called')
  expRead(false)
  t.equal(typeof _cb === 'function', true)
  sink(null, 1)
  log('expNext should have been resolved')
  t.equal(waiting.length === 0, true)

  t.equal(typeof _cb === 'function', false)
  log('draining a value')
  drain(null, expNext(true))
  expRead(true)
  t.equal(typeof _cb === 'function', true)
  log('closing from the source')
  sink(true)

  log('Any subsequent call to drain should return true right away')
  drain(null, expNext(true))

  end()
})

tape('Limit the rate of an eager buffer', function (t) {
  var actual = []
  var expected = [0, 0, 1, 1, 2, 2]

  pull(
    pull.count(2),
    pull.through(function (x) { actual.push(x) }),
    limit(buffer()),
    pull.through(function (x) { actual.push(x) }),
    pull.drain(null, function () {
      t.deepEqual(actual, expected)
      t.end()
    })
  )
})

tape('Limit the rate of an eager buffer with N>1', function (t) {
  var actual = []
  var expected = ['in:0', 'in:1', 'out:0', 'in:2', 'out:1', 'in:3', 'out:2', 'out:3']

  pull(
    pull.count(3),
    pull.through(function (x) { actual.push('in:' + x) }),
    limit(buffer(), 2),
    pull.through(function (x) { actual.push('out:' + x) }),
    pull.drain(null, function () {
      t.deepEqual(actual, expected)
      t.end()
    })
  )
})

tape('No-effect on an eager buffer when the limit is high enough', function (t) {
  var actual = []
  var expected = [0, 1, 2, 0, 1, 2]

  pull(
    pull.count(2),
    pull.through(function (x) { actual.push(x) }),
    limit(buffer(), 3),
    pull.through(function (x) { actual.push(x) }),
    pull.drain(null, function () {
      t.deepEqual(actual, expected)
      t.end()
    })
  )
})

tape('No effect on a through pull-stream', function (t) {
  var actual = []
  var expected = [0, 0, 1, 1, 2, 2]

  pull(
    pull.count(2),
    pull.through(function (x) { actual.push(x) }),
    limit(pull.through()),
    pull.through(function (x) { actual.push(x) }),
    pull.drain(null, function () {
      t.deepEqual(actual, expected)
      t.end()
    })
  )
})

tape('Proper draining when the limited stream ends early', function (t) {
  var actual = []
  var expected = [0, 1, 2]

  pull(
    pull.count(10),
    pull.through(function (x) { log('before: ' + x) }),
    limit(pull(
      probe('stream:begin'),
      pull.take(3),
      buffer(),
      probe('stream:end')
    ), 5),
    pull.through(function (x) { log('after: ' + x) }),
    pull.through(function (x) { actual.push(x) }),
    pull.drain(null, function () {
      t.deepEqual(actual, expected)
      t.end()
    })
  )
})

tape('Dynamically change the limit value', function (t) {
  var actual = []
  var expected = [0, 0, 1, 1, 2, 2, 3, 4, 3, 5, 4, 5]

  var limitedBuffer = limit(buffer())

  pull(
    pull.count(5),
    pull.through(function (x) { actual.push(x) }),
    limitedBuffer,
    pull.through(function (x) {
      actual.push(x)

      if (x === 2) {
        limitedBuffer.updateLimit(2)
      }
    }),
    pull.drain(null, function () {
      t.deepEqual(actual, expected)
      t.end()
    })
  )
})
