import { useEffect, useRef } from 'react'
import { io } from 'socket.io-client'
import { API_BASE } from './api'
import { getAccessToken } from './tokens'

let socketInstance = null

export function getSocket() {
  if (!socketInstance) {
    socketInstance = io(API_BASE, { autoConnect: false, auth: (cb) => cb({ token: getAccessToken() }) })
  }
  return socketInstance
}

export function disconnectSocket() {
  socketInstance?.disconnect()
  socketInstance = null
}

export function useSocket(events, { enabled = true } = {}) {
  const handlersRef = useRef(events)
  handlersRef.current = events

  useEffect(() => {
    if (!enabled) return undefined
    const socket = getSocket()
    if (!socket.connected) socket.connect()

    const bound = Object.keys(handlersRef.current).map((event) => {
      const wrapped = (...args) => handlersRef.current[event]?.(...args)
      socket.on(event, wrapped)
      return [event, wrapped]
    })

    return () => {
      bound.forEach(([event, wrapped]) => socket.off(event, wrapped))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled])

  return getSocket()
}
