import React, { useCallback, useState } from 'react'
import { BrowserRouter, Route } from 'react-router-dom'

import { electionSample } from '@votingworks/ballot-encoder'
import Ballot from './components/Ballot'
import BallotContext from './contexts/ballotContext'

import { VxMarkOnly } from './config/types'

import 'normalize.css'
import './BallotUI.css'

import memoize from './utils/memoize'
import {
  AriaScreenReader,
  SpeechSynthesisTextToSpeech,
} from './utils/ScreenReader'

import { getUSEnglishVoice } from './utils/voices'
import getPrinter, { Printer } from './utils/printer'

import FocusManager from './components/FocusManager'
import { getContests } from './utils/election'

const BallotUI = () => {
    const [votes, setVotes] = useState({})
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

  const ballotStyle = electionSample.ballotStyles[0]
  const ballotStyleId = ballotStyle.id
  const precinctId = ballotStyle.precincts[0]

  return (
    <BrowserRouter basename="/ballot">
      <FocusManager
        screenReader={screenReader}
        onKeyPress={onKeyPress}
        onClickCapture={onClick}
        onFocusCapture={onFocus}
      >
        <Route
          path="/"
          render={() => (
            <BallotContext.Provider
              value={{
                activateBallot: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
                markVoterCardPrinted: async () => {
                  return true
                },
                markVoterCardVoided: async () => {
                  return true
                },
                resetBallot: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
                setUserSettings: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
                updateTally: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
                updateVote: (contestId, vote) => {
                  setVotes({ ...votes, [contestId]: vote })
                }, // eslint-disable-line @typescript-eslint/no-empty-function
                forceSaveVote: () => {}, // eslint-disable-line @typescript-eslint/no-empty-function
                userSettings: { textSize: 0 },
                votes,
                machineConfig: { machineId: 'foobar', appMode: VxMarkOnly },
                ballotStyleId,
                contests: getContests({
                  ballotStyle,
                  election: electionSample,
                }),
                election: electionSample,
                isLiveMode: true,
                precinctId,
                printer: printer,
              }}
            >
              <Ballot />
            </BallotContext.Provider>
          )}
        />
      </FocusManager>
    </BrowserRouter>
  )
}

export default BallotUI