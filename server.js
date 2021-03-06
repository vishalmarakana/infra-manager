/* eslint-env node */
const express = require('express')
const path = require('path')
const helmet = require('helmet')
const bodyParser = require('body-parser')
const winston = require('winston')
const hpp = require('hpp')
const cors = require('cors')
const app = express()
const mongoose = require('mongoose')
const {
  databaseUri,
  project: { name }
} = require(path.resolve('config'))
const webhook = require(path.resolve('lib/webhook'))
const v1 = require(path.resolve('router/v1'))

const { PORT = 8080, HOST = '0.0.0.0', NODE_ENV: MODE = 'development' } = process.env

mongoose
  .connect(databaseUri)
  .then(() => {
    winston.info('Connected to DB')
  })
  .catch(() => {
    winston.error('\n|\n|  Could not connect to DB\n|')
  })

app.use(bodyParser.urlencoded({ limit: '12mb', extended: true }))
app.use(bodyParser.json({ limit: '12mb' }))
app.use(helmet())
app.use(cors())
app.use(hpp())

app.use('/static', express.static(path.resolve('static')))
app.use('/v1', v1)
app.use(webhook)

app.use('/', express.static('dist'))

// Check if we're in development mode to use webpackDevServer middleware
if (MODE === 'development') {
  app.use(require(path.resolve('config/webpackDevServer')))
}

// Send index to all other routes
app.get('*', (req, res) => res.sendFile(path.resolve('dist/index.html')))

// Start server
const server = app.listen(PORT, HOST, () =>
  winston.info(`${name} server is listening\n  Port: ${PORT}\n  Host: ${HOST}\n  Mode: ${MODE}`)
)

const io = require('socket.io').listen(server, {
  pingInterval: 10000,
  pingTimeout: 80000,
  transports: ['polling', 'websocket']
})

io.on('connection', socket => {
  socket.on('join', companyId => {
    socket.join(companyId)
    // Emit a refresh to web platform when new camera is connected
    winston.info(companyId + ' has joined')
    io.to('web-platform').emit('refresh')
  })

  socket.on('disconnect', () => {
    // TODO Emit a refresh to web platform
    winston.info('Client disconnected')
    io.to('web-platform').emit('refresh')
  })
})

const mosca = require('mosca')

const ascoltatore = {
  // using ascoltatore
  type: 'mongo',
  url: 'mongodb://localhost:27017/mqtt',
  pubsubCollection: 'ascoltatori',
  mongo: {}
}

const settings = {
  port: 1883,
  backend: ascoltatore
}

const servermqtt = new mosca.Server(settings)

servermqtt.on('clientConnected', client => {
  console.log('client connected', client.id)
})

// fired when a message is received
servermqtt.on('published', (packet, client) => {
  console.log('Published', packet.topic, client)
})

servermqtt.on('ready', setup)

// fired when the mqtt server is ready
function setup() {
  console.log('Mosca server is up and running')
}

global.io = io
