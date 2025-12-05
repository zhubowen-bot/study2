import { createServer } from 'http'
import { Server } from 'socket.io'

const server = createServer()
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
})

// 存储连接的客户端
const connectedClients = new Map()

io.on('connection', (socket) => {
  console.log('客户端连接:', socket.id)

  // 用户加入房间（用户A或用户B）
  socket.on('join-user', (userLetter) => {
    socket.join(`user-${userLetter}`)
    connectedClients.set(socket.id, userLetter)
    console.log(`用户 ${userLetter} 加入房间`)
  })

  // 任务更新事件
  socket.on('task-updated', (data) => {
    const { userLetter, taskData } = data
    
    // 向同一用户的其他客户端广播更新
    socket.to(`user-${userLetter}`).emit('task-update', taskData)
    console.log(`任务更新广播给用户 ${userLetter}:`, taskData)
  })

  // 用户数据更新事件
  socket.on('user-updated', (data) => {
    const { userLetter, userData } = data
    
    // 向同一用户的其他客户端广播更新
    socket.to(`user-${userLetter}`).emit('user-update', userData)
    console.log(`用户数据广播给用户 ${userLetter}:`, userData)
  })

  // 断开连接
  socket.on('disconnect', () => {
    const userLetter = connectedClients.get(socket.id)
    connectedClients.delete(socket.id)
    console.log(`客户端断开连接: ${socket.id} (用户: ${userLetter})`)
  })
})

const PORT = 3003
server.listen(PORT, () => {
  console.log(`同步服务运行在端口 ${PORT}`)
})