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
  useLocation,
  useParams,
} from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import styled, { css } from 'styled-components'
import Modal from 'react-modal'
import {
  ApiProvider,
  AdminUser,
  useCreateElection,
  useElections,
  useElection,
  Election,
  useUploadVoterFile,
  useSendBallotEmails,
  useAuth,
  useDeleteElection,
  VoterUser,
  useAddVoter,
  NewVoter,
  useDeleteVoter,
} from './api'
import FlexTable from './FlexTable'
import VoterBallot from './VoterBallot'
import { getPrecinctById } from './bmd/utils/election'

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
  max-width: 18em;
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

const Card = styled.div`
  border: 1px solid #bebfc0;
  border-radius: 5px;
  padding: 20px;
`

const Form = styled.form`
  display: grid;
  grid-template-columns: max-content max-content;
  grid-gap: 10px;
  align-items: baseline;
  label {
    justify-self: end;
  }
  select {
    padding: 1px 2px;
  }
  input,
  select {
    width: 13em;
  }
  button {
    grid-column: 2;
    justify-self: end;
  }
`

const AddVoter = ({ election }: { election: Election }) => {
  const addVoter = useAddVoter(election.id)
  const { register, handleSubmit, reset, watch } = useForm<NewVoter>()

  const onSubmitAddVoter = async (newVoter: NewVoter) => {
    try {
      await addVoter.mutateAsync(newVoter)
      reset()
    } catch (error) {
      toast.error(error)
    }
  }

  return (
    <Card style={{ marginLeft: '15px' }}>
      <div>Add an individual voter:</div>
      <Form
        onSubmit={handleSubmit(onSubmitAddVoter)}
        style={{ marginTop: '15px' }}
      >
        <label>Voter ID: </label>
        <input {...register('externalId')} />
        <label>Email: </label>
        <input type="email" {...register('email')} />
        <label>Precinct: </label>
        <select {...register('precinct')}>
          <option />
          {election.definition.precincts.map(precinct => (
            <option key={precinct.id} value={precinct.id}>
              {precinct.name} ({precinct.id})
            </option>
          ))}
        </select>
        <label>Ballot style: </label>
        <select {...register('ballotStyle')}>
          {!watch('precinct') && <option />}
          {election.definition.ballotStyles
            .filter(
              ballotStyle =>
                !watch('precinct') ||
                ballotStyle.precincts.includes(watch('precinct'))
            )
            .map(ballotStyle => (
              <option key={ballotStyle.id} value={ballotStyle.id}>
                {ballotStyle.id}
              </option>
            ))}
        </select>
        <Button type="submit">Add voter</Button>
      </Form>
    </Card>
  )
}

const useQueryParams = () => {
  return Object.fromEntries(new URLSearchParams(useLocation().search).entries())
}

const ElectionScreen = () => {
  const history = useHistory()
  const { electionId } = useParams<{ electionId: string }>()
  const { voterId } = useQueryParams()
  const election = useElection(electionId)
  const uploadVoterFile = useUploadVoterFile(electionId)
  const { register, handleSubmit, reset } = useForm<{
    voterFile: FileList
  }>()
  const deleteVoter = useDeleteVoter(electionId)

  if (!election.isSuccess) return null

  const onSubmitVoterFile = async ({ voterFile }: { voterFile: FileList }) => {
    try {
      await uploadVoterFile.mutateAsync({ voterFile: voterFile[0] })
      reset()
    } catch (error) {
      toast.error(error.message)
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-shadow
  const onClickDeleteVoter = async (voterId: string) => {
    try {
      await deleteVoter.mutateAsync({ voterId })
    } catch (error) {
      toast.error(error.message)
    }
  }

  const { definition, voters } = election.data
  const selectedVoter = voterId && voters.find(({ id }) => id === voterId)

  const prettyActivityName = (activityName: string) =>
    ({
      SentBallotUrl: 'Sent ballot',
      LoggedIn: 'Logged in',
      ConfirmedPrint: 'Confirmed print',
    }[activityName])

  return (
    <div>
      <h1>{definition.title}</h1>
      <strong>
        {definition.county.name} - {definition.county.id}
      </strong>
      <Section>
        <h2>Voters</h2>
        <div style={{ display: 'flex' }}>
          <Card>
            <form onSubmit={handleSubmit(onSubmitVoterFile)}>
              <div>
                <label htmlFor="voters">Upload a voter file: </label>
                <div style={{ marginTop: '15px' }}>
                  <FileInput {...register('voterFile')} />
                </div>
              </div>
              <div>
                <Button type="submit" style={{ marginTop: '15px' }}>
                  Submit
                </Button>
              </div>
            </form>
          </Card>
          <AddVoter election={election.data} />
        </div>
        {voters.length > 0 && (
          <>
            <p>Total voters: {voters.length}</p>
            <FlexTable scrollable style={{ height: '200px' }}>
              <thead>
                <tr>
                  <th>Voter ID</th>
                  <th>Email</th>
                  <th>Precinct</th>
                  <th>Ballot Style</th>
                  <th>Source</th>
                  <th>Activity</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {voters.map(voter => (
                  <tr key={voter.id}>
                    <td>{voter.externalId}</td>
                    <td>{voter.email}</td>
                    <td>
                      {
                        getPrecinctById({
                          election: definition,
                          precinctId: voter.precinct,
                        })!.name
                      }{' '}
                      ({voter.precinct})
                    </td>
                    <td>{voter.ballotStyle}</td>
                    <td>
                      {voter.wasManuallyAdded
                        ? 'Individually added'
                        : 'Voter file'}
                    </td>
                    <td
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                      }}
                    >
                      {(() => {
                        if (voter.activities.length === 0) return null
                        return (
                          <LinkButton
                            to={`/elections/${electionId}?voterId=${voter.id}`}
                          >
                            {prettyActivityName(
                              voter.activities[voter.activities.length - 1]
                                .activityName
                            )}
                          </LinkButton>
                        )
                      })()}
                    </td>
                    <td>
                      {voter.wasManuallyAdded && (
                        <Button onClick={() => onClickDeleteVoter(voter.id)}>
                          Delete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </FlexTable>
          </>
        )}
        {selectedVoter && (
          <Modal
            appElement={document.getElementById('root')!}
            isOpen
            onRequestClose={() => history.push(`/elections/${electionId}`)}
            style={{
              overlay: {
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
              },
              content: {
                position: 'static',
                padding: '30px 40px',
                minHeight: '20em',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              },
            }}
          >
            <div>
              <h2>
                {selectedVoter.externalId} - {selectedVoter.email}
              </h2>
              <h3>Voter Activity</h3>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'max-content max-content',
                  gridGap: '20px',
                }}
              >
                {selectedVoter.activities.map(activity => (
                  <>
                    <strong>{prettyActivityName(activity.activityName)}</strong>
                    <span>{new Date(activity.timestamp).toLocaleString()}</span>
                  </>
                ))}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'flex-end',
                marginTop: '20px',
              }}
            >
              <LinkButton to={`/elections/${electionId}`}>Close</LinkButton>
            </div>
          </Modal>
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
