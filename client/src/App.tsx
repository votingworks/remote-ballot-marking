import React from 'react'
import { ApiProvider, useAdminUser } from './api'

const HomeScreen: React.FC = () => {
  const userQuery = useAdminUser()
  if (userQuery.isLoading || userQuery.isIdle) return null
  const user = userQuery.isSuccess ? userQuery.data : null

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between' }}>
        <a href="/" style={{ textDecoration: 'none', color: 'black' }}>
          Remote Ballot Marking by <strong>Voting</strong>Works
        </a>
        {user ? (
          <span>
            {user.email} &bull; <a href="/auth/logout">Log out</a>
          </span>
        ) : (
          <a href="/auth/login">Log in</a>
        )}
      </header>
      {user && (
        <div>
          <h1>{user.organization.name}</h1>
        </div>
      )}
    </div>
  )
}

const App: React.FC = () => (
  <ApiProvider>
    <HomeScreen />
  </ApiProvider>
)

export default App
