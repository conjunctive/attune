'use strict'

var toposort = require('toposort')

/**
 * Object predicate
 * @param {*} value
 * @returns {boolean}
 * @private
 */
var isObject = v =>
  v !== null
    && typeof v === 'object'

/**
 * Function predicate
 * @param {*} value
 * @returns {boolean}
 * @private
 */
var isFn = v =>
  typeof v === 'function'

/**
 * Populated list predicate
 * @param {Array}
 * @returns {boolean}
 * @private
 */
var isNotEmpty = xs =>
  xs.length > 0

/**
 * Predicate for dependency statement.
 * Checks if value is either an array or string.
 * @param {*} value
 * @returns {boolean}
 * @private
 */
var isDepends = v =>
  Array.isArray(v)
    || typeof v === 'string'

/**
 * Return provided object where all of it's values are null.
 * @param {object} o
 * @returns {object}
 * @example
 * nullifyVals({ a: { x: 1 }, b: { y: 2 } })
 * // => { a: null, b: null }
 * @private
 */
var nullifyVals = o =>
  Object.keys(o).reduce(
    (acc, k) => ({ ...acc, [k]: null }),
    {}
  )

/**
 * Retrieve dependency names for a given service.
 * @param {object} conf - Service configuration data
 * @param {string} service - Service name
 * @returns {string[]} - Dependency names
 * @private
 */
var dependsOn = (conf, service) =>
  typeof conf[service].depends === 'string'
    ? [conf[service].depends]
    : (conf[service].depends || [])

/**
 * Derive graph edges from a service's dependencies.
 * @param {object} conf - Service configuration data
 * @param {string} service - Service name
 * @returns {string[][]} - Graph edges
 * @private
 */
var depEdges = (conf, service) =>
  dependsOn(conf, service)
    .map(dep => [dep, service])

/**
 * Derive graph edges from service configuration data.
 * @param {object} conf - Service configuration data
 * @returns {string[][]} - Graph edges
 * @private
 */
var edges = conf =>
  Object.keys(conf)
    .flatMap(service => depEdges(conf, service))
    .filter(isNotEmpty)

/**
 * Topologically sort service names.
 * @param {object} conf - Service configuration data
 * @returns {string[]} - Sorted service names
 * @private
 */
var sortDeps = conf =>
  toposort.array(
    Object.keys(conf),
    edges(conf)
  )

/**
 * Accumulate dependencies into an object.
 * @param {string[]} deps - Dependency names
 * @param {object} services - Services object
 * @returns {object} - Dependencies object
 * @private
 */
var collectDeps = (deps, services) =>
  deps.reduce(
    (acc, dep) => ({ ...acc, [dep]: services[dep] }),
    {}
  )

/**
 * Validation error messages.
 * @private
 */
var errors = {
  conf: {
    object: 'Service configuration entry must be an object.',
    depends: 'Depends must be either an array or string.',
    behaviour: 'Service configuration data should not contain functions.'
  },
  fns: {
    object: 'Service function data must be an object.',
    start: 'Start function must be present.',
    startFn: 'Start function must be a function.',
    stop: 'Stop function must be a function.'
  }
}

/**
 * Validate service configuration data.
 * Throws an error if invalid, otherwise returns true.
 * @param {object} conf - Service configuration data
 * @private
 */
var checkConfig = conf => {
  Object.entries(conf).forEach(([k, v]) => {
    if (!isObject(v))
      throw TypeError(errors.conf.object)

    if ('depends' in v && !isDepends(v.depends))
      throw TypeError(errors.conf.depends)

    Object.entries(v).forEach(([_, data]) => {
      if (isFn(data))
        throw TypeError(errors.conf.behaviour)
    })
  })
  return true
}

/**
 * Validate service function data.
 * Throws an error if invalid, otherwise returns true.
 * @param {object} fns - Service start/stop functions
 * @private
 */
var checkFns = fns => {
  Object.entries(fns).forEach(([k, v]) => {
    if (!isObject(v))
      throw TypeError(errors.fns.object)

    if ('start' in v) {
      if (!isFn(v.start))
        throw TypeError(errors.fns.startFn)
    } else {
      throw TypeError(errors.fns.start)
    }

    if ('stop' in v && !isFn(v.stop))
      throw TypeError(errors.fns.stop)
  })
  return true
}

/**
 * Validate both service configuration & function data.
 * Throws an error if invalid, otherwise returns true.
 * @param {object} conf - Service configuration data
 * @param {object} fns - Service start/stop functions
 * @private
 */
var check = (conf, fns) => {
  checkConfig(conf)
  checkFns(fns)
  return true
}

/**
 * Instantiate a system.
 * Optionally provide a flag for validating service configuration & function data.
 * If validation is not successful, an error will be thrown.
 * Top-level getters are created for each specified service.
 * @constructor
 * @param {object} config - Service configuration data
 * @param {object} fns - Service start/stop functions
 * @param {boolean=} validate - Validation flag
 */
function System(config, fns, validate) {
  if (this instanceof System) {
    if (validate)
      check(config, fns)

    this.config    = config
    this._order    = sortDeps(config)
    this._services = nullifyVals(config)
    this._fns      = fns

    Object.keys(this.config).map(k => {
      Object.defineProperty(this, k, {
        get: function() { return this._services[k] },
        enumerable: true,
        configurable: false,
      })
    })
  } else {
    return new System(config, fns, validate)
  }
}

/**
 * Starts a specific service when name is provided.
 * Otherwise starts all services.
 * No-op if service has already been started.
 * @memberof System
 * @param {string=} [service] - Service name
 * @returns {object} - System
 * @public
 */
System.prototype.start = function(service) {
  if (service !== undefined) {
    let deps = dependsOn(this.config, service)

    deps.forEach(service => this.start(service))

    if (this._services[service] === null)
      this._services[service] = this._fns[service].start(
        this.config,
        collectDeps(deps, this._services)
      )

    return this
  } else {
    this._order.forEach(service => this.start(service))
    return this
  }
}

/**
 * Stops a specific service when name is provided.
 * Otherwise stops all services by dependency order.
 * No-op if service has already been stopped.
 * @memberof System
 * @param {string=} [service] - Service name
 * @returns {object} - System
 */
System.prototype.stop = function(service) {
  if (service !== undefined) {
    let deps = dependsOn(this.config, service),
        { stop } = this._fns[service]

    if (this._services[service] !== null) {
      if (stop)
        stop(
          this._services[service],
          collectDeps(deps, this._services)
        )

      this._services[service] = null
    }

    return this
  } else {
    this._order.reverse().forEach(
      service => this.stop(service)
    )

    return this
  }
}

/**
 * Represent a system as a readable string.
 * Names of started services will be enclosed in curly braces.
 * @memberof System
 * @returns {string} - String representation of the system
 */
System.prototype.toString = function() {
  var started = Object
    .entries(this._services)
    .filter(([k, v]) => v !== null)
    .map(([k, v]) => k)
    .join(', ')
  var names = started ? '{' + started + '}' : ''
  return '[object System' + names + ']'
}

/**
 * Represent a system's configuration as JSON.
 * @memberof System
 * @returns {string} - JSON representation of the configuration
 */
System.prototype.toJSON = function() {
  return JSON.stringify(this.config, null, 2)
}

module.exports = { System }
