import { Trans } from '@lingui/macro'
import { Trade } from '@uniswap/router-sdk'
import { Currency, CurrencyAmount, MaxUint256, Token, TradeType } from '@uniswap/sdk-core'
import { Trade as V2Trade } from '@uniswap/v2-sdk'
import { Trade as V3Trade } from '@uniswap/v3-sdk'
import { NetworkAlert } from 'components/NetworkAlert/NetworkAlert'
import SwapDetailsDropdown from 'components/swap/SwapDetailsDropdown'
import UnsupportedCurrencyFooter from 'components/swap/UnsupportedCurrencyFooter'
import { MouseoverTooltip } from 'components/Tooltip'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useSwapCallback } from 'hooks/useSwapCallback'
import useTransactionDeadline from 'hooks/useTransactionDeadline'
import JSBI from 'jsbi'
import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { ArrowDown, CheckCircle, HelpCircle } from 'react-feather'
import ReactGA from 'react-ga4'
import { RouteComponentProps } from 'react-router-dom'
import { Box, Flex, Heading, Text } from 'rebass'
import { TradeState } from 'state/routing/types'
import styled, { ThemeContext } from 'styled-components/macro'

import AddressInputPanel from '../../components/AddressInputPanel'
import { ButtonConfirmed, ButtonError, ButtonLight, ButtonPrimary } from '../../components/Button'
import { GreyCard, LightCard } from '../../components/Card'
import { TransactionType } from '../../state/transactions/types'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import CurrencyLogo from '../../components/CurrencyLogo'
import Loader from '../../components/Loader'
import { AutoRow } from '../../components/Row'
import confirmPriceImpactWithoutFee from '../../components/swap/confirmPriceImpactWithoutFee'
import ConfirmSwapModal from '../../components/swap/ConfirmSwapModal'
import { ArrowWrapper, SwapCallbackError, Wrapper } from '../../components/swap/styleds'
import SwapHeader from '../../components/swap/SwapHeader'
import { SwitchLocaleLink } from '../../components/SwitchLocaleLink'
import TokenWarningModal from '../../components/TokenWarningModal'
import { useAllTokens, useCurrency } from '../../hooks/Tokens'
import { ApprovalState, useApprovalOptimizedTrade, useApproveCallbackFromTrade, useApproveCallback } from '../../hooks/useApproveCallback'
import useENSAddress from '../../hooks/useENSAddress'
import { useERC20PermitFromTrade, UseERC20PermitState } from '../../hooks/useERC20Permit'
import useIsArgentWallet from '../../hooks/useIsArgentWallet'
import { useIsSwapUnsupported } from '../../hooks/useIsSwapUnsupported'
import { useUSDCValue } from '../../hooks/useUSDCPrice'
import useWrapCallback, { WrapErrorText, WrapType } from '../../hooks/useWrapCallback'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/swap/actions'
import {
  useDefaultsFromURLSearch,
  useDerivedSwapInfo,
  useSwapActionHandlers,
  useSwapState,
} from '../../state/swap/hooks'
import { useExpertModeManager } from '../../state/user/hooks'
import { LinkStyledButton, ThemedText, CloseIcon } from '../../theme'
import { computeFiatValuePriceImpact } from '../../utils/computeFiatValuePriceImpact'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import { warningSeverity } from '../../utils/prices'
import { supportedChainId } from '../../utils/supportedChainId'
import AppBody from '../AppBody'
import { useBytes32TokenContract, useTokenContract, useLotteryContract, useLotteryFactoryContract } from 'hooks/useContract'
import { LOTTERY_ADDRESS, LOTTERY_TOKEN_ADDRESS, LOTTERY_FACTORY_ADDRESS } from 'constants/addresses'
import { useSingleCallResult } from 'lib/hooks/multicall'
import { am } from 'make-plural'
import { ProposalEditor } from '../CreateProposal/ProposalEditor'
import useInterval from 'lib/hooks/useInterval'
import { LightGreyCard } from 'components/Card'
import { RowBetween, RowFixed, FullRow } from 'components/Row'
import { useCurrencyBalances } from 'state/wallet/hooks'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import { useLotteryCount, useLotteryRangeInfo } from 'state/lotteryFactory/hooks'
import { BigNumber } from '@ethersproject/bignumber'
import CustomPage from 'components/Pager'
import { CardSection } from 'components/earn/styled'
import { Label, Input } from '@rebass/forms'
import { DateInput, NumberInput, TextInput } from 'components/TextInput'
import { number } from '@lingui/core/cjs/formats'
import { useLotteryPrize, useUserLotteryInfo, useLotteryPlayersCount, useLotteryWinner, useLotteryState, useLotteryPlayerRangeInfo, useLotteryDetailInfo } from 'state/lottery/hooks'
import Modal from 'components/Modal'
import { AutoColumn } from 'components/Column'
import FormattedCurrencyAmount from 'components/FormattedCurrencyAmount'
import { LoadingView, SubmittedView } from 'components/ModalViews'
import Toast from 'components/Toast'



const ContentWrapper = styled(AutoColumn)`
  width: 100%;
  padding: 1rem;
`

const AlertWrapper = styled.div`
  max-width: 460px;
  width: 100%;
`

const Card2 = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  margin: auto;
  width: 100%;
  min-height: 100%;
  @media only screen and (max-width: 600pt) {
    flex-direction: column;
  }
  @media only screen and (min-width: 600pt) {
    flex-direction: row;
  }
`
const TextWrapper = styled(ThemedText.Main)`
  ml: 6px;
  font-size: 10pt;
  color: ${({ theme }) => theme.text1};
  margin-right: 6px !important;
`
const LightGreyCard2 = styled(LightGreyCard)`
  flex: 3;
  padding: 8px 12px;
  margin-top: 4px;
  margin-bottom: 4px;
  @media only screen and (min-width: 600pt) {
    margin-left: 20px;
    margin-right: 20px;
  }
`

const RowBetween2 = styled(RowBetween)`
  margin-top: 10pt;
  margin-bottom: 10pt;
  justify-content: left;
`

const MainContentWrapper = styled.main`
  background-color: ${({ theme }) => theme.bg0};
  padding: 8px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
`

export default function LotteryFactory({ history }: RouteComponentProps) {
  const { account, chainId } = useActiveWeb3React()
  const loadedUrlParams = useDefaultsFromURLSearch()
  const toggleWalletModal = useWalletModalToggle()
  const showConnectAWallet = Boolean(!account)
  const lotteryFactoryAddress = (account && chainId) ? LOTTERY_FACTORY_ADDRESS[chainId] : undefined;
  const lotteryFactoryContract = useLotteryFactoryContract(lotteryFactoryAddress, true)
  const [curPage, setCurPage] = useState(1)
  const pageSize = 10
  const lotteryCount = useLotteryCount(lotteryFactoryContract)
  const lotterise = useLotteryRangeInfo((curPage - 1) * pageSize, curPage * pageSize, lotteryFactoryContract)
  const [name, setName] = useState("")
  const coinAddress = (account && chainId) ? LOTTERY_TOKEN_ADDRESS[chainId] : undefined;
  const symbol = "RDAO"
  const coinName = "RDAO Token"
  const decimals = 18
  const [startTime, setStartTime] = useState("")
  const [stopTime, setStopTime] = useState("")
  const [manager, setManager] = useState(account ?? "")
  const token1 = chainId && coinAddress ? new Token(chainId, coinAddress, decimals, symbol, coinName) : undefined;
  const [isOpen, setOpen] = useState(false)

  const showWrap = true
  const { independentField, typedValue, recipient } = useSwapState()
  const relevantTokenBalances = useCurrencyBalances(
    account ?? undefined,
    useMemo(() => [token1], [token1])
  )
  const currencyBalances = { "INPUT": relevantTokenBalances[0] }
  const currencies = { "INPUT": token1, "OUTPUT": token1 }
  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()

  const theme = useContext(ThemeContext)
  const handleChangePage = (page: number) => {
    if (curPage != page) {
      setCurPage(page)
    }
  }
  const parsedAmount = useMemo(
    () => tryParseCurrencyAmount(typedValue, token1),
    [token1, typedValue]
  )
  const parsedAmounts = useMemo(
    () =>
      showWrap
        ? {
          [Field.INPUT]: parsedAmount,
          [Field.OUTPUT]: parsedAmount,
        }
        : {
          [Field.INPUT]: independentField === Field.INPUT ? parsedAmount : parsedAmount,
          [Field.OUTPUT]: independentField === Field.OUTPUT ? parsedAmount : parsedAmount,
        },
    [independentField, parsedAmount, showWrap]
  )
  const handleCreateLottery = async () => {

    const quotient = parsedAmounts[Field.INPUT]?.quotient;
    if (!name || name.length == 0) {
      Toast("please enter the lottery name")
      return
    }
    if (!manager || manager.length == 0) {
      Toast("please enter the manager address")
      return
    }
    if (!quotient || JSBI.EQ(quotient, 0)) {
      Toast("please enter the min amount")
      return
    }
    if (!startTime || startTime.length == 0) {
      Toast("please enter the start time")
      return
    }
    if (!stopTime || stopTime.length == 0) {
      Toast("please enter the stop time")
      return
    }
    if (!token1?.address || token1?.address.length == 0) {
      Toast("token address error")
      return
    }
    const amount = quotient ? quotient.toString() : "0"
    const startTimestamp = new Date(startTime).getTime() / 1000
    const stopTimeStamp = new Date(stopTime).getTime() / 1000

    if (stopTimeStamp <= startTimestamp) {
      Toast("stop time should greater than start time")
      return
    }
    if (stopTimeStamp <= new Date().getTime() / 1000) {
      Toast("stop time should greater than current time")
      return
    }
    let ok = true
    await lotteryFactoryContract?.createLottery(name, manager, token1?.address ?? "", amount, startTimestamp, stopTimeStamp).catch((err) => {
      setErrorMsg(err.data.message)
      ok = false
    }).finally(() => {
      if (ok) {
        Toast("create lottery success, please wait the block confirm.")
        setName("")
      }
    })
  }
  const formattedAmounts = useMemo(
    () => ({
      [independentField]: typedValue
    }),
    [independentField, typedValue]
  )
  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const [showLotteryAddress, setShowLotteryAddress] = useState("")

  const handleShowLottery = useCallback(
    (address: string) => {
      setShowLotteryAddress(address)
      setOpen(true)
    }, []
  )
  const contract = useLotteryContract(showLotteryAddress)
  const [detail, loadingLottery] = useLotteryDetailInfo(contract, token1)
  function wrappedOndismiss() {
    setOpen(false)
  }
  const [isLoadingLottery, setLoadingLottery] = useState(!!detail?.name)
  const [errorMsg, setErrorMsg] = useState("")
  function onErrorDismiss() {
    setErrorMsg("")
  }
  return (
    <>
      <Card2>
        <LightGreyCard2 height="auto">
          <Heading margin={3}>Create Lottery</Heading>
          <RowBetween2>
            <RowFixed>
              <TextWrapper>
                <Trans>Name:</Trans>
              </TextWrapper>
            </RowFixed>
            <RowFixed>
              <TextWrapper>
                <TextInput value={name} onUserInput={setName} placeholder={`Lottery Name`} fontSize="0.9rem" ></TextInput>
              </TextWrapper>
            </RowFixed>
          </RowBetween2>
          <RowBetween2>
            <RowFixed>
              <TextWrapper>
                <Trans>Manager:</Trans>
              </TextWrapper>
            </RowFixed>
            <RowFixed>
              <TextWrapper>
                <TextInput value={manager} onUserInput={setManager} placeholder={`Lottery Manager`} fontSize="0.9rem" ></TextInput>
              </TextWrapper>
            </RowFixed>
          </RowBetween2>
          <RowBetween2>
            <RowFixed>
              <TextWrapper>
                <Trans>Min Amount:</Trans>
              </TextWrapper>
            </RowFixed>
            <RowFixed>
              <TextWrapper>
                <AppBody>
                  <Wrapper id="swap-page"
                    style={{ width: "300px" }}>
                    <AutoColumn gap={'sm'}>
                      <div style={{ display: 'relative' }}>
                        <CurrencyInputPanel
                          hideInput={false}
                          value={formattedAmounts[Field.INPUT]}
                          showMaxButton={true}
                          currency={currencies[Field.INPUT]}
                          onUserInput={handleTypeInput}
                          fiatValue={undefined}
                          onCurrencySelect={undefined}
                          hideBalance={true}
                          otherCurrency={currencies[Field.INPUT]}
                          showCommonBases={true}
                          id="swap-currency-input"
                        />
                      </div>
                    </AutoColumn>
                  </Wrapper>
                </AppBody>
              </TextWrapper>
            </RowFixed>
          </RowBetween2>
          <RowBetween2>
            <RowFixed>
              <TextWrapper>
                <Trans>Start Time:</Trans>
              </TextWrapper>
            </RowFixed>
            <RowFixed>
              <TextWrapper>
                <DateInput value={startTime} onUserInput={setStartTime} placeholder={`Start Time`} fontSize="0.9rem" ></DateInput>
              </TextWrapper>
            </RowFixed>
          </RowBetween2>
          <RowBetween2>
            <RowFixed>
              <TextWrapper>
                <Trans>Stop Time:</Trans>
              </TextWrapper>
            </RowFixed>
            <RowFixed>
              <TextWrapper>
                <DateInput value={stopTime} onUserInput={setStopTime} placeholder={`Stop Time`} fontSize="0.9rem" ></DateInput>
              </TextWrapper>
            </RowFixed>
          </RowBetween2>

          {!showConnectAWallet && (
            <>
              <ButtonPrimary marginBottom={3} marginTop={5} onClick={handleCreateLottery}>
                <ThemedText.Label mb="4px">
                  <Trans>Create</Trans>
                </ThemedText.Label>
              </ButtonPrimary>
            </>
          )
          }
        </LightGreyCard2>
        <LightGreyCard2 display="flex" flexDirection="column">
          <RowBetween marginTop={2} marginBottom={3}>
            <RowFixed>
              <TextWrapper>
                <Trans>Lottery list:</Trans>
              </TextWrapper>
            </RowFixed>
          </RowBetween>
          <RowBetween flex="1" display="flex" flexDirection="column">
            {
              lotterise.map((a, i) => {
                return (
                  <RowBetween key={i} marginTop={2} flex="1" marginBottom={2} height="20px">
                    <FullRow>
                      <ThemedText.Main flex="2" ml="6px" fontSize="12px" color={theme.text1} style={{ overflow: "hidden", cursor: "pointer", display: "inline-block", whiteSpace: "nowrap", textOverflow: "ellipsis", msTextOverflow: "ellipsis" }}>
                        <span onClick={() => { handleShowLottery(a.lotteryAddress ?? "") }}>
                          {!(a.createTime && a.createTime > 0) ? "" : a.lotteryAddress}
                        </span>
                      </ThemedText.Main>
                      <ThemedText.Main ml="6px" fontSize="12px" color={theme.text1}>
                        <Trans>{!(a.createTime && a.createTime > 0) ? "" : new Date(a.createTime * 1000).toLocaleString()}</Trans>
                      </ThemedText.Main>
                    </FullRow>
                  </RowBetween>
                )
              })}
          </RowBetween>
          <CustomPage marginTop={5} onChangePage={handleChangePage} page={curPage} size={pageSize} total={lotteryCount} showJump={true} showEnds={true} showTotal={true} ></CustomPage>
        </LightGreyCard2>
      </Card2>

      {showConnectAWallet && (
        <ButtonPrimary style={{ marginTop: '2em', padding: '8px 16px' }} onClick={toggleWalletModal}>
          <Trans>Connect a wallet</Trans>
        </ButtonPrimary>
      )}
      <Modal isOpen={isOpen} onDismiss={wrappedOndismiss} maxHeight={90}>
        {(
          <ContentWrapper gap="lg">
            <RowBetween>
              <ThemedText.MediumHeader>
                <Trans>Lottery Detail</Trans>
              </ThemedText.MediumHeader>
              <CloseIcon onClick={wrappedOndismiss} />
            </RowBetween>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Trans>Address:</Trans> <Trans>{showLotteryAddress}</Trans>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Trans>Name:</Trans> <Trans>{detail?.name}</Trans>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Trans>Min Amount:</Trans> <Trans>{detail?.minAmount?.toExact()}</Trans> <Trans>{token1?.symbol}</Trans>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Trans>Player Count:</Trans> <Trans>{detail?.playerCount}</Trans>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Trans>Prize:</Trans> <Trans>{detail?.prize?.toExact()}</Trans> <Trans>{token1?.symbol}</Trans>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Text>Manager:</Text><Text style={{ height: "auto", overflow: "hidden", maxWidth: "620px", display: "inline-block", whiteSpace: "nowrap", textOverflow: "ellipsis", msTextOverflow: "ellipsis" }}>
                  {detail?.manager}
                </Text>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Trans>State:</Trans> <Trans>{detail?.state == 0 ? "Running" : (detail?.state == 1 ? "Pausing" : "Finish")}</Trans>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Trans>Start Time:</Trans> <Trans>{new Date((!detail?.startTime || detail?.startTime == 0) ? 0 : detail?.startTime * 1000).toLocaleString()}</Trans>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Trans>Stop Time:</Trans> <Trans>{new Date((!detail?.stopTime || detail?.stopTime == 0) ? 0 : detail?.stopTime * 1000).toLocaleString()}</Trans>
              </ThemedText.Body>
            </AutoColumn>
            <AutoColumn justify="center" gap="md">
              <ThemedText.Body>
                <Text>Winner:</Text><Text style={{ height: "auto", overflow: "hidden", maxWidth: "620px", display: "inline-block", whiteSpace: "nowrap", textOverflow: "ellipsis", msTextOverflow: "ellipsis" }}>
                  {detail?.winner}
                </Text>
              </ThemedText.Body>
            </AutoColumn>
          </ContentWrapper>
        )}
        {isLoadingLottery && (
          <LoadingView onDismiss={wrappedOndismiss}>
            <AutoColumn gap="12px" justify={'center'}>
              <ThemedText.Body fontSize={20}>
                <Trans>Loading Lottery Info...</Trans>
              </ThemedText.Body>
            </AutoColumn>
          </LoadingView>
        )}
      </Modal>
      <Modal isOpen={errorMsg.length > 0} onDismiss={onErrorDismiss} minHeight={20}>
        <ContentWrapper gap="lg">
          <RowBetween>
            <FullRow>
              <ThemedText.MediumHeader flex={1}>
                <Trans>Data Error</Trans>
              </ThemedText.MediumHeader>
              <CloseIcon onClick={onErrorDismiss} />
            </FullRow>
          </RowBetween>
          <RowBetween>
            <FullRow>
              <ThemedText.Body>
                {errorMsg}
              </ThemedText.Body>
            </FullRow>
          </RowBetween>
        </ContentWrapper>
      </Modal>
    </>
  )
}
