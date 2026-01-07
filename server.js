const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = process.env.PORT || 3000

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true)
      await handle(req, res, parsedUrl)
    } catch (err) {
      console.error('Error occurred handling', req.url, err)
      res.statusCode = 500
      res.end('internal server error')
    }
  })

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  })

  // Store salon rooms
  const salonRooms = new Map()

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id)

    // Join salon room
    socket.on('join-salon', (salonId) => {
      socket.join(`salon-${salonId}`)
      console.log(`Socket ${socket.id} joined salon-${salonId}`)
    })

    // Leave salon room
    socket.on('leave-salon', (salonId) => {
      socket.leave(`salon-${salonId}`)
      console.log(`Socket ${socket.id} left salon-${salonId}`)
    })

    // Handle appointment updates
    socket.on('appointment-updated', (data) => {
      const { salonId } = data
      socket.to(`salon-${salonId}`).emit('appointment-changed', data)
    })

    // Handle priority updates
    socket.on('priority-updated', (data) => {
      const { salonId } = data
      socket.to(`salon-${salonId}`).emit('priority-changed', data)
    })

    // Handle assignment updates
    socket.on('appointment-assigned', (data) => {
      const { salonId } = data
      socket.to(`salon-${salonId}`).emit('assignment-changed', data)
    })

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id)
    })
  })

  httpServer
    .once('error', (err) => {
      console.error(err)
      process.exit(1)
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`)
    })
})

