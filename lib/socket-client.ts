'use client'

import { useEffect, useState } from 'react'
import { io, Socket } from 'socket.io-client'

let socket: Socket | null = null

export const useSocket = () => {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    if (!socket) {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
      socket = io(socketUrl, {
        transports: ['websocket', 'polling'],
      })

      socket.on('connect', () => {
        setIsConnected(true)
        console.log('Socket connected')
      })

      socket.on('disconnect', () => {
        setIsConnected(false)
        console.log('Socket disconnected')
      })
    }

    return () => {
      if (socket) {
        socket.disconnect()
        socket = null
      }
    }
  }, [])

  return { socket, isConnected }
}

export const getSocketClient = (): Socket | null => {
  if (!socket && typeof window !== 'undefined') {
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || window.location.origin
    socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

