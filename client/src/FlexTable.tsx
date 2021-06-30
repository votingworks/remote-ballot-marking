import React from 'react'
import styled from 'styled-components'

// eslint-disable-next-line react/jsx-props-no-spreading,no-unused-vars
const FlexTable = styled(({ scrollable, ...props }) => <table {...props} />)`
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 0 1px rgb(16 22 26 / 15%); /* Copied from Blueprint */
  width: 100%;
  thead {
    flex: 0 0 auto;
    box-shadow: inset 0 -1px 0 0 rgb(16 22 26 / 15%); /* Copied from Blueprint */
    width: 100%;
  }
  tbody {
    display: block;
    flex: 1 1 auto;
    overflow-y: ${props => (props.scrollable ? 'scroll' : 'none')};
  }
  /* Add a hidden scrollbar so headers line up with columns */
  thead tr::after {
    visibility: hidden;
    overflow-y: ${props => (props.scrollable ? 'scroll' : 'none')};
    content: '';
  }
  tr {
    display: flex;
  }
  th,
  td {
    flex: 1 0 0;
    text-align: left;
  }
  td {
    overflow-x: hidden;
    overflow-wrap: break-word;
  }
  /* Remove Blueprint border from first row */
  tbody tr:first-child td {
    box-shadow: none !important; /* stylelint-disable-line declaration-no-important */
  }
`

export default FlexTable
