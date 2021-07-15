/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
import React from 'react'
import {
  QueryClient,
  QueryClientProvider,
  useMutation,
  useQuery,
} from 'react-query'
import { Election as ElectionDefinition } from '@votingworks/ballot-encoder'

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
  let error
  try {
    error = JSON.parse(responseText).message
  } catch (e) {
    error = responseText
  }
  console.error(error) // eslint-disable-line no-console
  throw new Error(error)
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

export const useElections = () =>
  useQuery('elections', () => apiFetch<ElectionBase[]>('/api/elections'))

export const useCreateElection = () => {
  const createElection = async ({ definition }: { definition: File }) => {
    const body = new FormData()
    body.append('definition', definition)
    const { electionId } = await apiFetch<{ electionId: string }>(
      '/api/elections',
      {
        method: 'POST',
        body,
      }
    )
    return electionId
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
  wasManuallyAdded: boolean
}

export const useElection = (electionId: string) =>
  useQuery(['elections', electionId], () =>
    apiFetch<Election>(`/api/elections/${electionId}`)
  )

export const useUploadVoterFile = (electionId: string) => {
  const uploadVoterFile = ({ voterFile }: { voterFile: File }) => {
    const body = new FormData()
    body.append('voterFile', voterFile)
    return apiFetch(`/api/elections/${electionId}/voters/file`, {
      method: 'PUT',
      body,
    })
  }

  return useMutation(uploadVoterFile, {
    onSuccess: () => queryClient.invalidateQueries(['elections', electionId]),
  })
}

export type NewVoter = Pick<
  Voter,
  'externalId' | 'email' | 'ballotStyle' | 'precinct'
>

export const useAddVoter = (electionId: string) => {
  const addVoter = (voter: NewVoter) => {
    return apiFetch(`/api/elections/${electionId}/voters`, {
      method: 'POST',
      body: JSON.stringify(voter),
      headers: { 'Content-type': 'application/json' },
    })
  }

  return useMutation(addVoter, {
    onSuccess: () => queryClient.invalidateQueries(['elections', electionId]),
  })
}

export const useDeleteVoter = (electionId: string) => {
  const deleteVoter = ({ voterId }: { voterId: string }) => {
    return apiFetch(`/api/elections/${electionId}/voters/${voterId}`, {
      method: 'DELETE',
    })
  }

  return useMutation(deleteVoter, {
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
