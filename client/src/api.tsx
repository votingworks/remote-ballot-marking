import React from 'react'
import { QueryClient, QueryClientProvider, useQuery } from 'react-query'
import { toast } from 'react-toastify'

const queryClient = new QueryClient()

export const ApiProvider: React.FC = ({
  children,
}: {
  children?: React.ReactNode
}) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
ApiProvider.defaultProps = { children: null }

export const apiFetch = async <T extends unknown>(
  url: string,
  options?: RequestInit
) => {
  const response = await fetch(url, options)
  if (response.ok) return response.json() as Promise<T>

  const responseText = await response.text()
  console.error(responseText)
  toast.error(responseText)
  return null
}

interface User {
  name: string
  email: string
  organization: {
    id: string
    name: string
  }
}

export const useAdminUser = () =>
  useQuery('user', () => apiFetch<User>('/auth/me'))
