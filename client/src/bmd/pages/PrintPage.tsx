import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { setConstantValue } from 'typescript'
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
            {!hasPrinted ? (
              <Prose textCenter id="audiofocus">
                <h1 aria-label="Printing Official Ballot.">
                  <Loading>Printing Official Ballot</Loading>
                </h1>
              </Prose>
            ) : (
              <div>
                <button onClick={() => printBallot()}>Print Again</button>
                <button onClick={() => markVoterCardPrinted()}>Finish</button>
              </div>
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
