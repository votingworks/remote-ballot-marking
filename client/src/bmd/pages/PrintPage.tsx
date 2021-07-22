import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { setConstantValue } from 'typescript'
import Button from '../components/Button'
import LinkButton from '../components/LinkButton'
import Loading from '../components/Loading'
import Main, { MainChild } from '../components/Main'
import PrintedBallot from '../components/PrintedBallot'
import Prose from '../components/Prose'
import Screen from '../components/Screen'
import BallotContext from '../contexts/ballotContext'
import isEmptyObject from '../utils/isEmptyObject'

export const printerMessageTimeoutSeconds = 5

const PrintPage = () => {
  const {
    ballotStyleId,
    election,
    isLiveMode,
    markVoterCardPrinted,
    precinctId,
    printer,
    votes,
  } = useContext(BallotContext)

  const [hasPrinted, setHasPrinted] = useState(false)

  const printBallot = useCallback(async () => {
    await printer.print()
    setHasPrinted(true)
  }, [printer])

  useEffect(() => {
    if (!hasPrinted) {
      printBallot()
    }
  }, [votes, printBallot])

  return (
    <React.Fragment>
      <Screen>
        <Main>
          <MainChild centerVertical maxWidth={false}>
            {hasPrinted && (
              <Prose textCenter>
                <p>
                  <h1>Does your printed ballot have the correct selections?</h1>
                </p>
                <LinkButton to="/review">No - Review selections</LinkButton>
                <Button
                  primary
                  onPress={() => markVoterCardPrinted()}
                  style={{ marginLeft: '30px' }}
                >
                  Yes - Continue
                </Button>
                <p>
                  <Button onPress={() => printBallot()}>Print again</Button>
                </p>
              </Prose>
            )}
          </MainChild>
        </Main>
      </Screen>
      <PrintedBallot
        ballotStyleId={ballotStyleId}
        election={election!}
        isLiveMode={isLiveMode}
        precinctId={precinctId}
        votes={votes}
      />
    </React.Fragment>
  )
}

export default PrintPage
