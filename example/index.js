'use strict'

var http = require('http')
var { System } = require('../index.js')

// Specification of configuration data for all services (best stored as JSON)
// Top-level keys designate a service name
// The "depends" key states that the "server" is dependent on the "handler" service
// If multiple dependencies exist, "depends" may also be an array of service names
var config = {
  handler: { message: 'Hello World\n' },
  server: { port: 3000, depends: 'handler' } // depends: ['handler', 'another']
}

// Specification of behavioral data for all services
// Top-level keys designate a service name
// Each service should have a start function, and optionally a stop function
var fns = {
  handler: { start: startHandler },
  server: { start: startServer, stop: stopServer }
}

// Validation flag used by the System constructor function
// An error will be thrown if the configuration or functions object is deemed invalid
var validate = true

// The "handler" service start function
// Start functions have two parameters:
// - The entire configuration object
// - An object consisting of any dependent services
// The value of the "handler" service will be a handler function
function startHandler({ handler: { message } }, deps) {
  return function handler(req, res) {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain')
    res.end(message)
  }
}

// The "server" service start function
// The port number is passed in through the configuration object
// The handler function is passed in through the dependencies object
// The value of the service will be an HTTP server
function startServer({ server: { port } }, { handler }) {
  return http.createServer(handler).listen(port)
}

// The "server" service stop function
// Stop functions have two parameters:
// - The value of the service (returned from the start function)
// - An object consisting of any dependent services
// The return value of a stop function is discarded
// This function closes the HTTP server
function stopServer(server, deps) {
  server.close()
}

// Instantiate a system
// System constructor functions have three parameters:
// - The configuration object
// - The functions object
// - An optional validation flag (false, if not specified)
var sys = System(config, fns, validate)

// Start a specific service by name
sys.start('handler')

// Retrieve a service value
sys.handler

// Start all services by order of dependency
sys.start()

// Print the string representation of a system
// Running services are denoted in curly braces
console.log(sys.toString())

// Stop a specific service by name
sys.stop('server')

// Stop all services by order of dependency
sys.stop()

// Print the configuration object as JSON
console.log(sys.toJSON())
