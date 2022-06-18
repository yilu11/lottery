import { Filter } from '@ethersproject/providers'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import { useEffect, useMemo } from 'react'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useAppDispatch, useAppSelector } from '../hooks'
import { useMultipleContractSingleData, useSingleContractMultipleData, useSingleCallResult, useSingleContractWithCallData, CallStateResult } from 'lib/hooks/multicall'
import { useInterfaceMulticall, useLotteryContract, useTokenContract } from 'hooks/useContract'
import JSBI from 'jsbi'
import { ArgentWalletDetector, EnsPublicResolver, EnsRegistrar, Erc20, Erc721, Erc1155, Weth, Lottery, Lottery__factory, LotteryFactory } from 'abis/types'
import { number } from '@lingui/core/cjs/formats'

export enum LotteryState {
    Running = 0,
    Pausing = 1,
    Finish = 2,
    WaitStart = 3,
    WaitLucyDraw = 4
}

interface LotteryPlayer {
    address: string | undefined
    amount: string | undefined
    entryTime: number | undefined
    index: number | undefined
}

interface LotteryDetailInfo {
    name?: string | undefined
    playerCount?: number | undefined
    minAmount?: CurrencyAmount<Currency> | undefined
    prize?: CurrencyAmount<Currency> | undefined
    manager?: string | undefined
    winner?: string | undefined
    startTime?: number | undefined
    stopTime?: number | undefined
    state?: LotteryState | undefined
}


// based on typed value
export function useLotteryPrize(
    lotterycontract?: Lottery | null,
    token?: Token
): CurrencyAmount<Currency> | undefined {
    const result = useSingleCallResult(lotterycontract, 'prize', [])
    return useMemo(
        () => {
            if (!token) {
                return undefined
            }
            const value = result.result
            if (!value) {
                return undefined
            }
            return CurrencyAmount.fromRawAmount(token, JSBI.BigInt(value.toString()))
        },
        [token, result]
    )
}

export function useUserLotteryInfo(
    account: string | null | undefined,
    lotterycontract?: Lottery | null,
    token?: Token
): [CurrencyAmount<Currency> | undefined, number, number] {
    if (!account) {
        lotterycontract = null
    }
    const result = useSingleCallResult(lotterycontract, 'getPlayerInfoByAddress', [account ?? ""])
    return useMemo(
        () => {
            if (!token) {
                return [undefined, 0, 0]
            }
            if (!result.result) {
                return [undefined, 0, 0]
            }
            const amount = result.result[1]
            const entryTime = result.result[2]
            const index = result.result[3]
            if (!amount) {
                return [undefined, 0, 0]
            }
            return [CurrencyAmount.fromRawAmount(token, JSBI.BigInt(amount.toString())), entryTime, index]
        },
        [token, result]
    )
}



export function useLotteryPlayersCount(
    lotterycontract?: Lottery | null
): number {
    const lengthResult = useSingleCallResult(lotterycontract, 'getPlayersCount', [])
    return useMemo(
        () => {
            const value = lengthResult.result
            if (!value) {
                return 0
            }
            const count = Number.parseInt(value.toString())
            return count
        },
        [lotterycontract, lengthResult]
    )
}


export function useLotteryWinner(
    lotterycontract?: Lottery | null
): string | undefined {
    const result = useSingleCallResult(lotterycontract, 'winner', [])
    return useMemo(
        () => {
            const value = result.result
            if (!value) {
                return undefined
            }
            return value.toString()
        },
        [lotterycontract, result]
    )
}

export function useLotteryState(
    lotterycontract?: Lottery | null
): number | undefined {
    const result = useSingleCallResult(lotterycontract, 'lotteryState', [])
    return useMemo(
        () => {
            const value = result.result
            if (!value) {
                return undefined
            }
            return Number.parseInt(value.toString())
        },
        [lotterycontract, result]
    )
}

export function useLotteryPlayerRangeInfo(from?: number | undefined, to?: number | undefined, lotterycontract?: Lottery | null): [LotteryPlayer[], boolean] {
    const idxArgs = useMemo(() => {
        if (from !== undefined && to !== undefined) {
            const tokenRequests = []
            for (let i = from; i < to; i++) {
                tokenRequests.push([i])
            }
            return tokenRequests
        }
        return []
    }, [from, to])
    const playerResults = useSingleContractMultipleData(lotterycontract, "getPlayerInfoByIndex", idxArgs)
    const anyLoading: boolean = useMemo(() => playerResults.some((callState) => callState.loading), [playerResults])
    const playerInfos = useMemo(() => {
        if (from !== undefined && to !== undefined) {
            return playerResults
                .map(({ result }) => result)
                //.filter((result): result is CallStateResult => !!result)
                .map((result) => {
                    if (!result) {
                        return {
                            address: undefined,
                            amount: undefined,
                            entryTime: undefined,
                            index: undefined
                        }
                    }
                    const player: LotteryPlayer = {
                        address: result[0],
                        amount: result[1].toString(),
                        entryTime: Number.parseInt(result[2].toString()),
                        index: Number.parseInt(result[3].toString())
                    }
                    return player
                })
        }
        return []
    }, [from, to, playerResults])
    return [playerInfos, anyLoading]
}

export function useLotteryDetailInfo(
    lotterycontract?: Lottery | null,
    token?: Token
): [LotteryDetailInfo | undefined, boolean] {
    const nameResult = useSingleCallResult(lotterycontract, 'name', [])
    const lengthResult = useSingleCallResult(lotterycontract, 'getPlayersCount', [])
    const minAmountResult = useSingleCallResult(lotterycontract, 'minAmount', [])
    //const prizeResult = useSingleCallResult(lotterycontract, 'prize', [])
    const coinContract = useTokenContract(token?.address, true)
    const prizeResult = useSingleCallResult(coinContract, 'balanceOf', [
        lotterycontract?.address ?? undefined,
      ])
    const managerResult = useSingleCallResult(lotterycontract, 'manager', [])
    const winnerResult = useSingleCallResult(lotterycontract, 'winner', [])
    const startTimeResult = useSingleCallResult(lotterycontract, 'startTime', [])
    const stopTimeResult = useSingleCallResult(lotterycontract, 'stopTime', [])
    const stateResult = useSingleCallResult(lotterycontract, 'lotteryState', [])
    const anyLoading = nameResult.loading || lengthResult.loading || minAmountResult.loading || prizeResult.loading || managerResult.loading || winnerResult.loading || startTimeResult.loading || stopTimeResult.loading || stateResult.loading
    const retResult = useMemo(
        () => {
            console.log(new Date().getTime())
            const ret: LotteryDetailInfo = {}
            if (nameResult.result) {
                ret.name = nameResult.result.toString()
            }
            if (lengthResult.result) {
                ret.playerCount = Number.parseInt(lengthResult.result.toString())
            }
            if (minAmountResult.result && token) {
                ret.minAmount = CurrencyAmount.fromRawAmount(token, JSBI.BigInt(minAmountResult.result.toString()))
            }
            if (prizeResult.result && token) {
                ret.prize = CurrencyAmount.fromRawAmount(token, JSBI.BigInt(prizeResult.result.toString()))
            }
            if (managerResult.result) {
                ret.manager = managerResult.result.toString()
            }
            if (winnerResult.result) {
                ret.winner = winnerResult.result.toString()
            }
            if (startTimeResult.result) {
                ret.startTime = Number.parseInt(startTimeResult.result.toString())
            }
            if (stopTimeResult.result) {
                ret.stopTime = Number.parseInt(stopTimeResult.result.toString())
            }
            if (stateResult.result && startTimeResult.result && stopTimeResult.result) {
                ret.state = Number.parseInt(stateResult.result.toString())
                const now = new Date().getTime() / 1000
                if (ret.startTime && now < ret.startTime) {
                    ret.state = LotteryState.WaitStart
                }
                else if (ret.stopTime && now > ret.stopTime && ret.state != LotteryState.Finish) {
                    ret.state = LotteryState.WaitLucyDraw
                }
            }
            return ret
        },
        [token, lotterycontract, nameResult, minAmountResult, lengthResult, prizeResult, winnerResult, startTimeResult, stopTimeResult, stateResult, managerResult]
    )
    return [retResult, anyLoading]
}