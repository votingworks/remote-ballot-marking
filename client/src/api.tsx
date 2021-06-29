/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from 'react-query'

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
  console.error(responseText) // eslint-disable-line no-console
  throw new Error(responseText)
}

export interface AdminUser {
  name: string
  email: string
  organization: {
    id: string
    name: string
  }
}

export const useAdminUser = () =>
  useQuery('adminUser', () => apiFetch<AdminUser>('/auth/me'))

export interface Election {
  id: string
  definition: ElectionDefinition
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ElectionDefinition {
  title: string
  county: { id: string; name: string }
}

export const useElections = () =>
  useQuery('elections', () => apiFetch<Election[]>('/api/elections'))

export const useCreateElection = () => {
  const createElection = ({ definition }: { definition: File }) => {
    const body = new FormData()
    body.append('definition', definition)
    return apiFetch('/api/elections', {
      method: 'POST',
      body,
    })
  }

  return useMutation(createElection, {
    onSuccess: () => queryClient.invalidateQueries('elections'),
  })
}
