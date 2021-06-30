/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { BrowserRouter, Route, Switch, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import {
  ApiProvider,
  useAdminUser,
  AdminUser,
  useCreateElection,
  useElections,
  useElection,
  useSetVoters,
} from './api'
import BallotUI from './bmd/BallotUI'

const AdminHome = ({ user }: { user: AdminUser }) => {
  const createElection = useCreateElection()
  const { register, handleSubmit, reset } = useForm<{
    definition: FileList
  }>()
  const elections = useElections()

  const onSubmitCreateElection = async ({
    definition,
  }: {
    definition: FileList
  }) => {
    try {
      await createElection.mutateAsync({ definition: definition[0] })
      reset()
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none', color: 'black' }}>
          Remote Ballot Marking by <strong>Voting</strong>Works
        </a>
        <span>
          {user.email} &bull; <a href="/auth/logout">Log out</a>
        </span>
      </header>
      <div>
        <h1>{user.organization.name}</h1>
        <div>
          <h2>Add Election</h2>
          <form onSubmit={handleSubmit(onSubmitCreateElection)}>
            <div>
              <label htmlFor="definition">Upload election definition: </label>
              <input type="file" {...register('definition')} />
            </div>
            <div>
              <input type="submit" />
            </div>
          </form>
        </div>
        <div>
          <h2>Elections</h2>
          {elections.isSuccess &&
            (elections.data.length === 0 ? (
              <p>No elections added</p>
            ) : (
              <ul>
                {elections.data.map(({ definition, id }) => (
                  <li key={id}>
                    <a href={`/election/${id}`}>
                      {definition.title} - {definition.county.name} -{' '}
                      {definition.county.id}
                    </a>
                  </li>
                ))}
              </ul>
            ))}
        </div>
      </div>
    </div>
  )
}

const Election = () => {
  const { electionId } = useParams<{ electionId: string }>()
  const election = useElection(electionId)
  const setVoters = useSetVoters(electionId)
  const { register, handleSubmit, reset } = useForm<{
    voters: FileList
  }>()

  if (!election.isSuccess) return null

  const onSubmitVoters = async ({ voters }: { voters: FileList }) => {
    try {
      await setVoters.mutateAsync({ voters: voters[0] })
      reset()
    } catch (error) {
      toast.error(error.message)
    }
  }

  const { definition } = election.data

  return (
    <div>
      <h1>{definition.title}</h1>
      <strong>
        {definition.county.name} - {definition.county.id}
      </strong>
      <div>
        <h2>Add Voters</h2>
        <form onSubmit={handleSubmit(onSubmitVoters)}>
          <div>
            <label htmlFor="voters">Upload voter file: </label>
            <input type="file" {...register('voters')} />
          </div>
          <div>
            <input type="submit" />
          </div>
        </form>
      </div>
      <div>
        <h2>Voters</h2>
        {election.data.voters.length === 0 ? (
          <p>No voters added yet</p>
        ) : (
          <div>
            <p>{election.data.voters.length} voters added</p>
            <table>
              <thead>
                <tr>
                  <th>Voter ID</th>
                  <th>Email</th>
                  <th>Precinct</th>
                  <th>Ballot Style</th>
                </tr>
              </thead>
              <tbody>
                {election.data.voters.map(voter => (
                  <tr key={voter.voterId}>
                    <td>{voter.voterId}</td>
                    <td>{voter.email}</td>
                    <td>{voter.precinct}</td>
                    <td>{voter.ballotStyle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

const LoginScreen = () => (
  <div>
    <h1>Remote Ballot Marking</h1>
    <p>
      by <strong>Voting</strong>Works
    </p>
    <a href="/auth/login">Log in</a>
  </div>
)

const Routes = () => {
  const userQuery = useAdminUser()
  if (userQuery.isLoading || userQuery.isIdle) return null
  const user = userQuery.isSuccess ? userQuery.data : null

  if (user === null) return <LoginScreen />

  return (
    <BrowserRouter>
      <Switch>
        <Route path="/ballot">
          <BallotUI />
        </Route>
        <Route path="/election/:electionId">
          <Election />
        </Route>
        <Route path="/">
          <AdminHome user={user} />
        </Route>
      </Switch>
    </BrowserRouter>
  )
}

const App: React.FC = () => (
  <ApiProvider>
    <Routes />
  </ApiProvider>
)

export default App
