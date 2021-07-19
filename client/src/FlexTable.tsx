import styled from 'styled-components'

interface FlexTableProps {
  scrollable: boolean
}

// eslint-disable-next-line react/jsx-props-no-spreading,no-unused-vars
const FlexTable = styled.table<FlexTableProps>`
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 0 1px #bebfc0;
  width: 100%;
  thead {
    flex: 0 0 auto;
    box-shadow: inset 0 -1px 0 0 #bebfc0;
    width: 100%;
    background: #edeff0;
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
    align-items: center;
  }
  tr:nth-child(even) {
    background: #edeff0;
  }
  th,
  td {
    flex: 1 0 0;
    text-align: left;
    padding: 7px 10px;
  }
  td {
    overflow-x: hidden;
    overflow-wrap: break-word;
  }
`

export default FlexTable
