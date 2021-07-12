import React, { useCallback, useState } from 'react'
import { BrowserRouter, Route } from 'react-router-dom'

import { Election } from '@votingworks/ballot-encoder'
import Ballot from './bmd/components/Ballot'
import BallotContext from './bmd/contexts/ballotContext'

import { VxMarkPlusVxPrint } from './bmd/config/types'

import 'normalize.css'
import './bmd/BallotUI.css'

import memoize from './bmd/utils/memoize'
import {
  AriaScreenReader,
  SpeechSynthesisTextToSpeech,
} from './bmd/utils/ScreenReader'

import { getUSEnglishVoice } from './bmd/utils/voices'
import getPrinter from './bmd/utils/printer'

import FocusManager from './bmd/components/FocusManager'
import { getBallotStyle, getContests } from './bmd/utils/election'
import { VoterUser } from './api'

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
const VoterBallot = ({ voter }: { voter: VoterUser }) => {
  const [votes, setVotes] = useState({})
  const [hasPrinted, setHasPrinted] = useState(false)

  const screenReader = new AriaScreenReader(
    new SpeechSynthesisTextToSpeech(memoize(getUSEnglishVoice))
  )

  const printer = getPrinter()
  screenReader.mute()

  /* istanbul ignore next - need to figure out how to test this */
  const onKeyPress = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'r') {
        screenReader.toggle()
      }
    },
    [screenReader]
  )

  /* istanbul ignore next - need to figure out how to test this */
  const onClick = useCallback(
    ({ target }: React.MouseEvent) => {
      if (target) {
        const currentPath = window.location.pathname

        setImmediate(() => {
          // Only send `onClick` to the screen reader if the click didn't
          // trigger navigation and the clicked element is still here.
          if (
            window.location.pathname === currentPath &&
            document.body.contains(target as Node)
          ) {
            screenReader.onClick(target)
          }
        })
      }
    },
    [screenReader]
  )
  /* istanbul ignore next - need to figure out how to test this */
  const onFocus = useCallback(
    ({ target }: React.FocusEvent) => {
      if (target) {
        const currentPath = window.location.pathname

        setImmediate(() => {
          // Only send `onFocus` to the screen reader if the focus didn't
          // trigger navigation and the focused element is still here.
          if (
            window.location.pathname === currentPath &&
            document.body.contains(target as Node)
          ) {
            screenReader.onFocus(target)
          }
        })
      }
    },
    [screenReader]
  )

  const election = voter.election.definition as Election
  const ballotStyle = getBallotStyle({
    election,
    ballotStyleId: voter.ballotStyle,
  })

  return (
    <div id="ballotRoot">
      <BrowserRouter basename="/ballot">
        <FocusManager
          screenReader={screenReader}
          onKeyPress={onKeyPress}
          onClickCapture={onClick}
          onFocusCapture={onFocus}
        >
          <Route
            path="/"
            render={() =>
              hasPrinted ? (
                <div>
                  Voting and printing complete. Thanks for using VotingWorks
                  Remote Ballot Marking!
                </div>
              ) : (
                <BallotContext.Provider
                  value={{
                    activateBallot: () => {},
                    markVoterCardPrinted: async () => {
                      setHasPrinted(true)
                      return true
                    },
                    markVoterCardVoided: async () => {
                      return true
                    },
                    resetBallot: () => {},
                    setUserSettings: () => {},
                    updateTally: () => {},
                    updateVote: (contestId, vote) => {
                      setVotes({ ...votes, [contestId]: vote })
                    },
                    forceSaveVote: () => {},
                    userSettings: { textSize: 0 },
                    votes,
                    machineConfig: {
                      machineId: 'rbm',
                      appMode: VxMarkPlusVxPrint,
                    },
                    ballotStyleId: voter.ballotStyle,
                    contests: getContests({ ballotStyle, election }),
                    election,
                    isLiveMode: true,
                    precinctId: voter.precinct,
                    printer,
                  }}
                >
                  <Ballot />
                </BallotContext.Provider>
              )
            }
          />
        </FocusManager>
      </BrowserRouter>
    </div>
  )
}

export default VoterBallot
