'use strict'

var test = require('tape')
var { System } = require('../index.js')

test('System', t => {
  t.plan(22)
  
  var startCalls = 0

  var conf = {
    x: { val: 1 },
    y: { val: 2, depends: 'x' },
    sum: { depends: ['x', 'y'] }
  }

  var startX = ({ x: { val } }, deps) => ( startCalls++, val )
  var startY = ({ y: { val } }, deps) => ( startCalls++, val )
  var startSum = (conf, { x, y }) => ( startCalls++, x + y )

  var fns = {
    x: { start: startX },
    y: { start: startY },
    sum: { start: startSum }
  }

  var sys = System(conf, fns, true)

  t.equal(sys.config, conf, 'Configuration object stored')
  t.equal(sys._fns, fns, 'Functions object stored')
  t.equal(sys._order[0], 'x', 'Dependencies topologically sorted')
  t.equal(sys._order[1], 'y', 'Dependencies topologically sorted')
  t.equal(sys._order[2], 'sum', 'Dependencies topologically sorted')
  t.equal(sys._services.x, null, 'Initial service values are null')
  t.equal(sys._services.y, null, 'Initial service values are null')
  t.equal(sys._services.sum, null, 'Initial service values are null')
  t.equal(sys.x, null, 'Initial getter values are null')
  t.equal(sys.y, null, 'Initial getter values are null')
  t.equal(sys.sum, null, 'Initial getters values are null')
  t.equal(sys.toString(), '[object System]', 'Expected string representation')

  sys.start('sum')

  t.equal(sys.x, conf.x.val, 'X started by dependency of y')
  t.equal(sys.y, conf.y.val, 'Y started by dependency of sum')
  t.equal(sys.sum, 3, 'Sum started')
  t.equal(sys.toString(), '[object System{x, y, sum}]', 'Expected string representation')
  t.equal(startCalls, 3, 'Start functions should only be called once')

  sys.stop()
  sys.start()

  t.equal(startCalls, 6, 'Start functions should only be called once')

  sys.stop()

  t.equal(sys._services.x, null, 'Stopped service values are null')
  t.equal(sys._services.y, null, 'Stopped service values are null')
  t.equal(sys._services.sum, null, 'Stopped service values are null')
  t.equal(sys.toString(), '[object System]', 'Expected string representation')
})
