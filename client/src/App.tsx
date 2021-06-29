import React from 'react'
import { BrowserRouter, Route, Switch } from 'react-router-dom'
import { ApiProvider, useAdminUser, AdminUser } from './api'

const AdminHome = ({ user }: { user: AdminUser }) => {
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
          <p>Ballot component goes here</p>
        </Route>
        <Route path="/">
          <AdminHome user={user} />
        </Route>
      </Switch>
    </BrowserRouter>
  )
}

const App = () => (
  <ApiProvider>
    <Routes />
  </ApiProvider>
)

export default App
