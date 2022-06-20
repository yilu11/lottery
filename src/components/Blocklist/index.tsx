import { Trans } from '@lingui/macro'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { ReactNode, useMemo } from 'react'

const BLOCKED_ADDRESSES: string[] = [
]

export default function Blocklist({ children }: { children: ReactNode }) {
  const { account } = useActiveWeb3React()
  const blocked: boolean = useMemo(() => Boolean(account && BLOCKED_ADDRESSES.indexOf(account) !== -1), [account])
  if (blocked) {
    return (
      <div>
        <Trans>Blocked address</Trans>
      </div>
    )
  }
  return <>{children}</>
}
