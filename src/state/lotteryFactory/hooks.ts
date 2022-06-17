import { Filter } from '@ethersproject/providers'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import useBlockNumber from 'lib/hooks/useBlockNumber'
import { useEffect, useMemo } from 'react'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import { useAppDispatch, useAppSelector } from '../hooks'
import { useMultipleContractSingleData, useSingleContractMultipleData, useSingleCallResult, useSingleContractWithCallData, CallStateResult } from 'lib/hooks/multicall'
import { useInterfaceMulticall, useLotteryContract } from 'hooks/useContract'
import JSBI from 'jsbi'
import { ArgentWalletDetector, EnsPublicResolver, EnsRegistrar, Erc20, Erc721, Erc1155, Weth, Lottery, Lottery__factory, LotteryFactory } from 'abis/types'
import { number } from '@lingui/core/cjs/formats'

interface LotteryInfo {
    lotteryAddress: string | undefined
    name: string | undefined
    createTime: number | undefined
    managerAddress: string | undefined
    startTime: number | undefined
    stopTime: number | undefined
}

export function useLotteryCount(
    contract?: LotteryFactory | null
): number | undefined {
    const result = useSingleCallResult(contract, 'getAllLotteriesLength', [])
    return useMemo(
        () => {
            const value = result.result
            if (!value) {
                return undefined
            }
            return Number.parseInt(value.toString())
        },
        [contract, result]
    )
}

export function useLotteryRangeInfo(from?: number | undefined, to?: number | undefined, contract?: LotteryFactory | null): LotteryInfo[] {
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
    const playerResults = useSingleContractMultipleData(contract, "lotteries", idxArgs)
    const playerInfos = useMemo(() => {
        if (from !== undefined && to !== undefined) {
            const ret = playerResults
                .map(({ result }) => result)
                //.filter((result): result is CallStateResult => !!result)
                .map((result) => {
                    if(!result){
                        return {
                            lotteryAddress:undefined,
                            name: undefined,
                            createTime: undefined,
                            managerAddress: undefined,
                            startTime: undefined,
                            stopTime: undefined
                        }
                    }
                    const player: LotteryInfo = {
                        lotteryAddress:result[0],
                        name: result[1],
                        createTime: Number.parseInt(result[2].toString()),
                        managerAddress: result[3],
                        startTime: Number.parseInt(result[4].toString()),
                        stopTime: Number.parseInt(result[5].toString())
                    }
                    return player
                })
            return ret
        }
        return []
    }, [from, to, playerResults])
    return playerInfos
}


export function useLastActiveLottery(
    contract?: LotteryFactory | null
): string | undefined {
    const result = useSingleCallResult(contract, 'getLastActiveLottery', [])
    return useMemo(
        () => {
            const value = result.result
            if (result.loading || !value) {
                return undefined
            }
            const strValue = value.toString()
            if(strValue == "0x0000000000000000000000000000000000000000"){
                return ""
            }
            else{
                return value.toString()
            }
        },
        [contract, result]
    )
}