import { useEffect, useRef } from 'react'
import { io, type Socket } from 'socket.io-client'
import { API_BASE } from './api'
import { getAccessToken } from './tokens'

let socketInstance: Socket | null = null

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(API_BASE, { autoConnect: false, auth: (cb) => cb({ token: getAccessToken() }) })
  }
  return socketInstance
}

export function disconnectSocket(): void {
  socketInstance?.disconnect()
  socketInstance = null
}

type SocketHandlers = Record<string, (...args: any[]) => void>

export function useSocket(events: SocketHandlers, { enabled = true }: { enabled?: boolean } = {}): Socket {
  const handlersRef = useRef(events)
  handlersRef.current = events

  useEffect(() => {
    if (!enabled) return undefined
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    const bound = Object.keys(handlersRef.current).map((event) => {
      const wrapped = (...args: any[]) => handlersRef.current[event]?.(...args)
      socket.on(event, wrapped)
      return [event, wrapped] as const
    })

    return () => {
      bound.forEach(([event, wrapped]) => socket.off(event, wrapped))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return getSocket()
}
