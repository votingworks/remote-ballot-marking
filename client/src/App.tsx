/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable react/jsx-props-no-spreading */
import React from 'react'
import {
  BrowserRouter,
  Link,
  Redirect,
  Route,
  Switch,
  useHistory,
  useParams,
} from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import styled, { css } from 'styled-components'
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

const buttonStyles = css<{ large?: boolean }>`
  padding: ${props => (props.large ? '0.5em 0.7em' : '0.3em 0.5em')};
  cursor: pointer;
  background: #edeff0;
  border: 1px solid #777878;
  border-radius: 0.2em;
`

const Button = styled.button`
  /* stylelint-disable-next-line value-keyword-case */
  ${buttonStyles}
`

const LinkButton = styled(Link)`
  /* stylelint-disable-next-line value-keyword-case */
  ${buttonStyles}
  appearance: button;
  color: inherit;
  text-decoration: none;
`

const AnchorButton = styled.a`
  /* stylelint-disable-next-line value-keyword-case */
  ${buttonStyles}
  appearance: button;
  color: inherit;
  text-decoration: none;
`

const FileInput = styled.input.attrs(() => ({ type: 'file' }))`
  ::file-selector-button {
    /* stylelint-disable-next-line value-keyword-case */
    ${buttonStyles}
    margin-right: 15px;
  }
`

const Logo = () => (
  <img
    style={{ height: '1.7em' }}
    src="/votingworks-wordmark-white.svg"
    alt="VotingWorks"
  />
)

const Header = styled.header`
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  line-height: 1.4em;
  @media print {
    display: none;
  }
  padding: 10px 30px;
  background: #6638b6;
  color: #ffffff;
  a {
    color: inherit;
    text-decoration: none;
  }
`

const AdminHeader = ({ adminUser }: { adminUser: AdminUser }) => (
  <Header>
    <a href="/">
      <Logo />
    </a>
    <Link to="/">
      {adminUser.organization.name} &bull; Remote Ballot Marking
    </Link>
    <span>
      {adminUser.email} &bull; <a href="/auth/logout">Log out</a>
    </span>
  </Header>
)

const VoterHeader = ({ voter }: { voter: VoterUser }) => (
  <Header>
    <a href="/ballot">
      <Logo />
    </a>
    <span>
      {voter.email} &bull; <a href="/voter/logout">Log out</a>
    </span>
  </Header>
)

const Section = styled.section`
  margin-bottom: 30px;
`

const FullScreen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
`

const LoginScreen = () => (
  <FullScreen>
    <img
      style={{ height: '6em' }}
      src="/votingworks-wordmark-purple.svg"
      alt="VotingWorks"
    />
    <h2>Remote Ballot Marking</h2>
    <AnchorButton large href="/auth/login">
      Log in
    </AnchorButton>
  </FullScreen>
)

const AdminHome = () => {
  const createElection = useCreateElection()
  const { register, handleSubmit } = useForm<{
    definition: FileList
  }>()
  const elections = useElections()
  const deleteElection = useDeleteElection()
  const history = useHistory()

  const onSubmitCreateElection = async ({
    definition,
  }: {
    definition: FileList
  }) => {
    try {
      const electionId = await createElection.mutateAsync({
        definition: definition[0],
      })
      history.push(`/elections/${electionId}`)
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
      <Section>
        <h2>Add an election</h2>
        <form onSubmit={handleSubmit(onSubmitCreateElection)}>
          <div>
            <label htmlFor="definition">
              Upload an election definition file:{' '}
            </label>
            <div style={{ marginTop: '15px' }}>
              <FileInput {...register('definition')} />
            </div>
          </div>
          <Button type="submit" style={{ marginTop: '15px' }}>
            Submit
          </Button>
        </form>
      </Section>
      {elections.isSuccess && elections.data.length > 0 && (
        <Section>
          <h2>Elections</h2>
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {elections.data.map(({ definition, id }) => (
              <li key={id} style={{ marginBottom: '10px' }}>
                <LinkButton large to={`/elections/${id}`}>
                  {definition.title} - {definition.county.name} -{' '}
                  {definition.county.id}
                </LinkButton>
                <button
                  type="button"
                  onClick={() => onClickDeleteElection(id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#b30000',
                    fontWeight: 800,
                    fontSize: '1.2em',
                    cursor: 'pointer',
                    marginLeft: '5px',
                  }}
                >
                  &#10005;
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
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
      toast.success('Ballots sent!')
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <Section>
      <h2>Send ballots</h2>
      <form onSubmit={handleSubmit(onSubmitSendBallotEmails)}>
        <div
          style={{
            display: 'flex',
            alignItems: 'top',
            width: '100%',
            height: '200px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
            <label>Enter an email template: </label>
            <textarea
              {...register('template')}
              style={{
                display: 'block',
                height: '100%',
                width: '100%',
                border: '1px solid #bebfc0',
                padding: '5px 8px',
                marginTop: '10px',
                overflowY: 'scroll',
                resize: 'none',
              }}
            />
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginLeft: '30px',
              flex: 1,
            }}
          >
            <div>Email preview: </div>
            <div
              style={{
                border: '1px solid #bebfc0',
                height: '100%',
                width: '100%',
                padding: '8px',
                marginTop: '10px',
                overflowWrap: 'break-word',
                overflowY: 'scroll',
              }}
            >
              {watch('template')}
              <br />
              {window.location.host}/voter/1a2b3c4d5e6f7a8b
            </div>
          </div>
        </div>
        <Button type="submit" style={{ marginTop: '15px' }}>
          Send ballots to all voters
        </Button>
      </form>
    </Section>
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
      <Section>
        <h2>Voters</h2>
        <form onSubmit={handleSubmit(onSubmitVoters)}>
          <div>
            <label htmlFor="voters">Upload a voter file: </label>
            <div style={{ marginTop: '15px' }}>
              <FileInput {...register('voters')} />
            </div>
          </div>
          <div>
            <Button type="submit" style={{ marginTop: '15px' }}>
              Submit
            </Button>
          </div>
        </form>
        {election.data.voters.length > 0 && (
          <>
            <p>Total voters: {election.data.voters.length}</p>
            <FlexTable scrollable style={{ height: '200px' }}>
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
          </>
        )}
      </Section>
      {election.data.voters.length > 0 && (
        <SendBallots election={election.data} />
      )}
    </div>
  )
}

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
            <FullScreen>
              Thank you for using VotingWorks Remote Ballot Marking.
            </FullScreen>
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
      <div style={{ fontSize: '16px', background: '#ffffff' }}>
        <AdminHeader adminUser={adminUser!} />
        <div style={{ padding: '0 30px' }}>
          <Switch>
            <Route path="/elections/:electionId">
              <ElectionScreen />
            </Route>
            <Route exact path="/">
              <AdminHome />
            </Route>
            <Route>
              <FullScreen>
                <p>Not found</p>
              </FullScreen>
            </Route>
          </Switch>
        </div>
      </div>
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
