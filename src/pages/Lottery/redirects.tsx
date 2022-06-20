import { Redirect, RouteComponentProps } from 'react-router-dom'

export function RedirectPathToLotteryOnly({ location }: RouteComponentProps) {
  return <Redirect to={{ ...location, pathname: '/lottery' }} />
}