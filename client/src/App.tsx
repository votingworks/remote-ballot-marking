/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import {
  BrowserRouter,
  Redirect,
  Route,
  Switch,
  useParams,
} from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import styled from 'styled-components'
import {
  ApiProvider,
  AdminUser,
  useCreateElection,
  useElections,
  useElection,
  Election,
  useSetVoters,
  useSendBallotEmails,
  useAuth,
  useDeleteElection,
  VoterUser,
} from './api'
import FlexTable from './FlexTable'
import VoterBallot from './VoterBallot'

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  @media print {
    display: none;
  }
`

const AdminHeader = ({ adminUser }: { adminUser: AdminUser }) => (
  <Header>
    <a href="/" style={{ textDecoration: 'none', color: 'black' }}>
      Remote Ballot Marking by <strong>Voting</strong>Works
    </a>
    <span>
      {adminUser.email} &bull; <a href="/auth/logout">Log out</a>
    </span>
  </Header>
)

const AdminHome = ({ adminUser }: { adminUser: AdminUser }) => {
  const createElection = useCreateElection()
  const { register, handleSubmit, reset } = useForm<{
    definition: FileList
  }>()
  const elections = useElections()
  const deleteElection = useDeleteElection()

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

  const onClickDeleteElection = async (electionId: string) => {
    try {
      await deleteElection.mutateAsync({ electionId })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <h1>{adminUser.organization.name}</h1>
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
                  <button
                    type="button"
                    onClick={() => onClickDeleteElection(id)}
                  >
                    &#10005;
                  </button>
                </li>
              ))}
            </ul>
          ))}
      </div>
    </div>
  )
}

const SendBallots = ({ election }: { election: Election }) => {
  const sendBallotEmails = useSendBallotEmails(election.id)
  const { register, handleSubmit, watch } = useForm<{ template: string }>({
    defaultValues: {
      template: 'Click the link below to fill out and print your ballot:',
    },
  })

  const onSubmitSendBallotEmails = async ({
    template,
  }: {
    template: string
  }) => {
    try {
      await sendBallotEmails.mutateAsync({
        voterIds: election.voters.map(voter => voter.id),
        template,
      })
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div>
      <h2>Send Ballots</h2>
      <form onSubmit={handleSubmit(onSubmitSendBallotEmails)}>
        <div>
          <label>Enter an email template: </label>
          <textarea
            {...register('template')}
            style={{ display: 'block', height: '150px', width: '300px' }}
          />
        </div>
        <div>
          <p>Email preview: </p>
          <p
            style={{
              border: '1px solid lightgray',
              height: '150px',
              width: '300px',
            }}
          >
            {watch('template')}
            <br />
            {window.location.host}/voter/1a2b3c4d5e6f7a8b
          </p>
        </div>
        <input type="submit" />
      </form>
    </div>
  )
}

const ElectionScreen = () => {
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
            <FlexTable scrollable height={200}>
              <thead>
                <tr>
                  <th>Voter ID</th>
                  <th>Email</th>
                  <th>Precinct</th>
                  <th>Ballot Style</th>
                  <th>Ballot Sent</th>
                </tr>
              </thead>
              <tbody>
                {election.data.voters.map(voter => (
                  <tr key={voter.id}>
                    <td>{voter.externalId}</td>
                    <td>{voter.email}</td>
                    <td>{voter.precinct}</td>
                    <td>{voter.ballotStyle}</td>
                    <td>
                      {voter.ballotEmailLastSentAt &&
                        new Date(voter.ballotEmailLastSentAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </FlexTable>
          </div>
        )}
      </div>
      <SendBallots election={election.data} />
    </div>
  )
}

const VoterHeader = ({ voter }: { voter: VoterUser }) => (
  <Header>
    <a href="/ballot" style={{ textDecoration: 'none', color: 'black' }}>
      Remote Ballot Marking by <strong>Voting</strong>Works
    </a>
    <span>
      {voter.email} &bull; <a href="/voter/logout">Log out</a>
    </span>
  </Header>
)

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
  const auth = useAuth()
  if (auth.isLoading || auth.isIdle) return null
  const { adminUser, voter } = auth.isSuccess
    ? auth.data
    : { adminUser: null, voter: null }

  if (adminUser === null && voter === null) {
    return (
      <BrowserRouter>
        <Switch>
          <Route exact path="/">
            <LoginScreen />
          </Route>
          <Route exact path="/ballot">
            Thank you for using VotingWorks Remote Ballot Marking.
          </Route>
          <Redirect to="/" />
        </Switch>
      </BrowserRouter>
    )
  }

  if (voter !== null) {
    return (
      <BrowserRouter>
        <VoterHeader voter={voter} />
        <Switch>
          <Route path="/ballot">
            <VoterBallot voter={voter} />
          </Route>
          <Redirect to="/ballot" />
        </Switch>
      </BrowserRouter>
    )
  }

  return (
    <BrowserRouter>
      <AdminHeader adminUser={adminUser!} />
      <Switch>
        <Route path="/election/:electionId">
          <ElectionScreen />
        </Route>
        <Route exact path="/">
          <AdminHome adminUser={adminUser!} />
        </Route>
        <Route>Not found</Route>
      </Switch>
    </BrowserRouter>
  )
}

const App: React.FC = () => (
  <ApiProvider>
    <Routes />
    <ToastContainer />
  </ApiProvider>
)

export default App
