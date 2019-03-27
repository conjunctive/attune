# Attune

Micro-framework for reasoning about the stateful pieces of your software.
- Provides a simple interface for starting & stopping individual services
- Facilitates a declarative approach to configuration
- Is cognizant of dependency ordering
- Offers opt-in validation for user input

## Getting Started

Install Attune using NPM
``` shell
$ npm install attune
```

Create a setup file called `index.js`
``` shell
$ touch index.js
```

Require Attune and the HTTP module
``` javascript
var http = require('http')
var { System } = require('attune')
```

Create a configuration object
``` javascript
// Specification of configuration data for all services (best stored as JSON)
// Top-level keys designate a service name
// The "depends" key states that the "server" is dependent on the "handler" service
// If multiple dependencies exist, "depends" may also be an array of service names
var config = {
  handler: { message: 'Hello World\n' },
  server: { port: 3000, depends: 'handler' } // depends: ['handler', 'another']
}
```

Create a functions object
``` javascript
// Specification of behavioral data for all services
// Top-level keys designate a service name
// Each service should have a start function, and optionally a stop function
var fns = {
  handler: { start: startHandler },
  server: { start: startServer, stop: stopServer }
}
```

Create a validation flag
``` javascript
// Validation flag used by the System constructor function
// An error will be thrown if the configuration or functions object is deemed invalid
var validate = true
```

Create a start function for the "handler" service
``` javascript
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
```

Create a start function for the "server" service
``` javascript
// The "server" service start function
// The port number is passed in through the configuration object
// The handler function is passed in through the dependencies object
// The value of the service will be an HTTP server
function startServer({ server: { port } }, { handler }) {
  return http.createServer(handler).listen(port)
}
```

Create a stop function for the "server" service
``` javascript
// The "server" service stop function
// Stop functions have two parameters:
// - The value of the service (returned from the start function)
// - An object consisting of any dependent services
// The return value of a stop function is discarded
// This function closes the HTTP server
function stopServer(server, deps) {
  server.close()
}
```

Open the Node.js REPL
``` shell
$ node
```

Load the setup file
```
> .load index.js
```

Construct a system object
``` javascript
// Instantiate a system
// System constructor functions have three parameters:
// - The configuration object
// - The functions object
// - An optional validation flag (false, if not specified)
> var sys = System(config, fns, validate)
```

Start the "handler" service
``` javascript
// Start a specific service by name
> sys.start('handler')
```

Notice the value of the "handler" service
``` javascript
// Retrieve a service value
> sys.handler
```

Start all services
``` javascript
// Start all services by order of dependency
> sys.start()
```

Notice the string representation of the system object
``` javascript
// Print the string representation of a system
// Running services are denoted in curly braces
> sys.toString()
```

Stop the "server" service
``` javascript
// Stop a specific service by name
> sys.stop('server')
```

Stop all services
``` javascript
// Stop all services by order of dependency
> sys.stop()
```

Notice the JSON representation of the system object
``` javascript
// Print the configuration object as JSON
> sys.toJSON()
```

See [example](../master/example/index.js) for a single-file implementation

## License

This project is licensed under the MIT License

## Acknowledgments

* Inpsired by [Integrant](https://github.com/weavejester/integrant)
* Tested on Node.js v11.12.0
