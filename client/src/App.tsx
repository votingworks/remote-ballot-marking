/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast } from 'react-toastify'
import {
  ApiProvider,
  useAdminUser,
  AdminUser,
  useCreateElection,
  useElections,
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
                    {definition.title} - {definition.county.name} -{' '}
                    {definition.county.id}
                  </li>
                ))}
              </ul>
            ))}
        </div>
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
