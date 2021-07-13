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

export interface Auth {
  adminUser: AdminUser
  voter: VoterUser
}

export interface AdminUser {
  name: string
  email: string
  organization: {
    id: string
    name: string
  }
}

export interface VoterUser {
  id: string
  email: string
  election: ElectionBase
  ballotStyle: string
  precinct: string
}

export const useAuth = () => useQuery('auth', () => apiFetch<Auth>('/auth/me'))

export interface ElectionBase {
  id: string
  definition: ElectionDefinition
}

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface ElectionDefinition {
  title: string
  county: { id: string; name: string }
}

export const useElections = () =>
  useQuery('elections', () => apiFetch<ElectionBase[]>('/api/elections'))

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

export const useDeleteElection = () => {
  const deleteElection = ({ electionId }: { electionId: string }) => {
    return apiFetch(`/api/elections/${electionId}`, { method: 'DELETE' })
  }

  return useMutation(deleteElection, {
    onSuccess: () => queryClient.invalidateQueries('elections'),
  })
}

export interface Election extends ElectionBase {
  voters: Voter[]
}

export interface Voter {
  id: string
  externalId: string
  email: string
  precinct: string
  ballotStyle: string
  ballotEmailLastSentAt: string
}

export const useElection = (electionId: string) =>
  useQuery(['elections', electionId], () =>
    apiFetch<Election>(`/api/elections/${electionId}`)
  )

export const useSetVoters = (electionId: string) => {
  const setVoters = ({ voters }: { voters: File }) => {
    const body = new FormData()
    body.append('voters', voters)
    return apiFetch(`/api/elections/${electionId}/voters`, {
      method: 'PUT',
      body,
    })
  }

  return useMutation(setVoters, {
    onSuccess: () => queryClient.invalidateQueries(['elections', electionId]),
  })
}

export const useSendBallotEmails = (electionId: string) => {
  const sendBallotEmails = (body: { voterIds: string[]; template: string }) =>
    apiFetch(`/api/elections/${electionId}/voters/emails`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-type': 'application/json' },
    })

  return useMutation(sendBallotEmails, {
    onSuccess: () => queryClient.invalidateQueries(['elections', electionId]),
  })
}
