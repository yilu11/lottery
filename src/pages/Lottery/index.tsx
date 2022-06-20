import { Trans } from '@lingui/macro'
import { Currency, CurrencyAmount, Token } from '@uniswap/sdk-core'
import useActiveWeb3React from 'hooks/useActiveWeb3React'
import { useCallback, useContext, useMemo, useState } from 'react'
import { RouteComponentProps } from 'react-router-dom'
import { Flex, Text } from 'rebass'
import { TradeState } from 'state/routing/types'
import styled, { ThemeContext } from 'styled-components/macro'

import { ButtonDropdownLight, ButtonPrimary } from '../../components/Button'
import { LightCard } from '../../components/Card'
import { AutoColumn } from '../../components/Column'
import CurrencyInputPanel from '../../components/CurrencyInputPanel'
import { Wrapper } from '../../components/swap/styleds'
import { ApprovalState,useApproveCallback } from '../../hooks/useApproveCallback'
import { useWalletModalToggle } from '../../state/application/hooks'
import { Field } from '../../state/swap/actions'
import {
  useSwapActionHandlers,
  useSwapState,
} from '../../state/swap/hooks'
import { maxAmountSpend } from '../../utils/maxAmountSpend'
import AppBody from '../AppBody'
import { useTokenContract, useLotteryContract, useLotteryFactoryContract } from 'hooks/useContract'
import { LOTTERY_TOKEN_ADDRESS, LOTTERY_FACTORY_ADDRESS } from 'constants/addresses'
import { LightGreyCard } from 'components/Card'
import { RowBetween, RowFixed, FullRow } from 'components/Row'
import { useCurrencyBalances } from 'state/wallet/hooks'
import tryParseCurrencyAmount from 'lib/utils/tryParseCurrencyAmount'
import {  useUserLotteryInfo, useLotteryPlayerRangeInfo, useLotteryDetailInfo, LotteryState } from 'state/lottery/hooks'
import CustomPage from 'components/Pager'
import Toast from 'components/Toast'
import { LoadingDataView } from 'components/ModalViews'
import { useLotteryCount, useLotteryRangeInfo,useLastActiveLottery } from 'state/lotteryFactory/hooks'
import Modal from 'components/Modal'
import Copy from 'components/AccountDetails/Copy'
import { ThemedText } from 'theme'


const AlertWrapper = styled.div`
  max-width: 460px;
  width: 100%;
`

const Card2 = styled.div`
  display: flex;
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

const MainContentWrapper = styled.main`
  background-color: ${({ theme }) => theme.bg0};
  padding: 8px;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
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


const LightGreyCard4 = styled(LightGreyCard)`
  flex: 3;
  padding: 8px 12px;
  margin-top: 4px;
  margin-bottom: 4px;
  @media only screen and (min-width: 600pt) {
    margin-left: 20px;
    margin-right: 20px;
  }
  text-align: center;
`

const LightGreyCard3 = styled(LightGreyCard)`
  flex: 3;
  padding: 8px 12px;
`

const RowBetween2 = styled(RowBetween)`
  margin-top: 4pt;
  margin-bottom: 4pt;  
`

const LightCard2 = styled(LightCard)`
  display: flex;
  flex-direction: column;
  margin: 2pt;
`
const LightCard3 = styled(LightCard)`
  margin: 2pt;
`

const TextTitle = styled(Text)`
  font-size: 8pt;
  text-align: center;
`

const TextTitleBigger = styled(TextTitle)`
  font-size: 18pt;
  text-align: center;
  font-weight: 600;
  display: block;
  vertical-align: bottom;
`
const TextValue = styled(Text)`
  flex: 1;
  text-align: center;
  @media only screen and (min-height: 600pt) {
    font-size: 18pt;
    min-height: 21pt;
    margin: 8pt !important;
  }
  @media only screen and (max-height: 600pt) {
    font-size: 12pt;
    min-height: 14pt;
    margin: 4pt !important;
  }
`
const TextValueBigger = styled(Text)`
  vertical-align: top;
  font-weight: 600;
  display: block;
  text-align: center;
  @media only screen and (min-height: 600pt) {
    font-size: 15pt;0
    min-height: 15pt;
    margin-top: 6pt !important;
  }
  @media only screen and (max-height: 600pt) {
    font-size: 12pt;
    min-height: 14pt;
    margin: 0pt !important;
  }
`
const TextValue2 = styled(TextValue)`
 @media only screen and (min-width: 504pt)  and (max-width: 600pt) {
  font-size: 12pt !important;
}
@media only screen and (max-width: 504pt) {
  font-size: 8pt !important;
}
@media only screen and (min-width: 600pt)  and (max-width: 800pt) {
 font-size: 8pt !important;
}
@media only screen and (min-width: 800pt){
 font-size: 12pt !important;
}
 `
 const TextWrapper = styled(ThemedText.Main)`
  ml: 6px;
  font-size: 10pt;
  color: ${({ theme }) => theme.text1};
  margin-right: 6px !important;
`

export default function Lottery({ history }: RouteComponentProps) {
  const { account, chainId } = useActiveWeb3React()
  const toggleWalletModal = useWalletModalToggle()
  const showConnectAWallet = Boolean(!account)
  const [selectedLottery, setSelectedLottery] = useState("")
  const coinAddress = (account && chainId) ? LOTTERY_TOKEN_ADDRESS[chainId] : undefined;
  const lotteryFactoryAddress = (account && chainId) ? LOTTERY_FACTORY_ADDRESS[chainId] : undefined;
  const contract = useTokenContract(coinAddress, true)
  const lotteryFactoryContract = useLotteryFactoryContract(lotteryFactoryAddress, true)
  const lotteryPageSize = 10;
  const [curLotteryPage, setCurLotteryPage] = useState(1)
  const lotteryCount = useLotteryCount(lotteryFactoryContract)
  if(lotteryCount){
    //setCurLotteryPage(Math.floor(lotteryCount/lotteryPageSize) + 1)
  }
  const lotterise = useLotteryRangeInfo((curLotteryPage - 1) * lotteryPageSize, curLotteryPage * lotteryPageSize, lotteryFactoryContract)

  const lastActiveLottery = useLastActiveLottery(lotteryFactoryContract)
  console.log("lastActiveLottery",lastActiveLottery)
  if(lastActiveLottery && (!selectedLottery || selectedLottery.length == 0)){
    setSelectedLottery(lastActiveLottery??"")
  }
  const lotteryContract = useLotteryContract(selectedLottery, true)
  const token1 = chainId && coinAddress ? new Token(chainId, coinAddress, 18, "RDAO", "RDAO Token") : undefined;
  const [lotteryDetail, loadingLottery] = useLotteryDetailInfo(lotteryContract, token1)
  const [depositedAmount, entryTime, index] = useUserLotteryInfo(account, lotteryContract, token1)
  const [approvalState, approveCallback] = useApproveCallback(lotteryDetail?.minAmount, selectedLottery)
  const theme = useContext(ThemeContext)
  const [curPage, setCurPage] = useState(1)
  const pageSize = 10
  const [players, loadingPlayers] = useLotteryPlayerRangeInfo((curPage - 1) * pageSize, curPage * pageSize, lotteryContract)
  const selectedLotteryDesc = useMemo(()=>{
    if(lotteryCount === 0){
        return "No Lottery Exist"
    }
    else if(!selectedLottery || selectedLottery.length == 0){
      return "Select a Lottery"
    }
    else{
      return "Lottery: " + selectedLottery
    }
  },[selectedLottery,lotteryCount])
  const handleApprove = useCallback(async () => {
    approveCallback().catch((err) => {
      Toast(err.data.message)
    })
  }, [approveCallback])

  const handleLucyDraw = useCallback(async () => {
    let ok = true
    await lotteryContract?.luckyDraw().catch((err) => {
      ok = false
      Toast(err.data.message)
    }).finally(() => {
      if (ok) {
        Toast("Lucy draw succeed, please wait the block confirm.")
      }
    })
  }, [lotteryContract])

  const handleParticipate = useCallback(async () => {
    const quotient = parsedAmounts[Field.INPUT]?.quotient;
    if (!quotient) {
      Toast("please enter the deposit amount")
      return
    }
    const amount = quotient.toString();
    if (!account || !lotteryContract || !contract || approvalState != ApprovalState.APPROVED) {
      Toast("please approve the contract firstly")
      return;
    }
    let ok = true
    lotteryContract.participate(amount).catch((err) => {
      ok = false
      Toast(err.data.message)
    }).finally(() => {
      if (ok) {
        if (lotteryDetail?.minAmount) {
          onUserInput(Field.INPUT, lotteryDetail?.minAmount?.toExact())
        }
        else {
          onUserInput(Field.INPUT, "0")
        }
      }
    })
  }, [approveCallback])

  const { independentField, typedValue, recipient } = useSwapState()
  const dependentField: Field = independentField === Field.INPUT ? Field.OUTPUT : Field.INPUT
  const relevantTokenBalances = useCurrencyBalances(
    account ?? undefined,
    useMemo(() => [token1], [token1])
  )
  const currencyBalances = { "INPUT": relevantTokenBalances[0] }
  const currencies = { "INPUT": token1, "OUTPUT": token1 }
  //const independentField = Field.OUTPUT
  const showWrap = true
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
  const formattedAmounts = useMemo(
    () => ({
      [independentField]: typedValue
    }),
    [independentField, typedValue]
  )
  const maxInputAmount: CurrencyAmount<Currency> | undefined = useMemo(
    () => maxAmountSpend(currencyBalances[Field.INPUT]),
    [currencyBalances]
  )
  const { onSwitchTokens, onCurrencySelection, onUserInput, onChangeRecipient } = useSwapActionHandlers()

  if (!typedValue && lotteryDetail && lotteryDetail.minAmount || (lotteryDetail && lotteryDetail.minAmount && Number.parseFloat(typedValue) < Number.parseFloat(lotteryDetail.minAmount.toExact()))) {
    if (typedValue) {
      Toast("deposit value should bigger than " + lotteryDetail?.minAmount?.toExact() + lotteryDetail.minAmount.currency.symbol)
    }
    onUserInput(Field.INPUT, lotteryDetail?.minAmount?.toExact())
  }
  const showMaxButton = Boolean(maxInputAmount?.greaterThan(0) && !parsedAmounts[Field.INPUT]?.equalTo(maxInputAmount))
  const handleTypeInput = useCallback(
    (value: string) => {
      onUserInput(Field.INPUT, value)
    },
    [onUserInput]
  )
  const handleMaxInput = useCallback(() => {
    maxInputAmount && onUserInput(Field.INPUT, maxInputAmount.toExact())
  }, [maxInputAmount, onUserInput])
  const [approvalSubmitted, setApprovalSubmitted] = useState<boolean>(false)
  const handleInputSelect = useCallback(
    (inputCurrency) => {
      setApprovalSubmitted(false) // reset 2 step UI for approvals
      onCurrencySelection(Field.INPUT, inputCurrency)
    },
    [onCurrencySelection]
  )

  const handleChangePage = (page: number) => {
    if (curPage != page) {
      setCurPage(page)
    }
  }

  const handleChangeLotteryPage = (page: number) => {
    if (curLotteryPage != page) {
      setCurLotteryPage(page)
    }
  }
  const lotteryStateDesc = useMemo(() => {
    if (lotteryDetail?.state == LotteryState.Running) {
      return "Running"
    }
    else if (lotteryDetail?.state == LotteryState.Finish) {
      return "Finished"
    }
    else if (lotteryDetail?.state == LotteryState.WaitLucyDraw) {
      return "Wait Luck Draw"
    }
    else if (lotteryDetail?.state == LotteryState.WaitStart) {
      return "Pending"
    }
    else if (lotteryDetail?.state == LotteryState.Pausing) {
      return "Pausing"
    }
    return ""
  }, [lotteryDetail?.state])
  const winnerDesc = useMemo(() => {
    if (lotteryDetail?.winner && lotteryDetail.winner != "0x0000000000000000000000000000000000000000") {
      return lotteryDetail?.winner
    }
    else if(lotteryDetail?.state && lotteryDetail?.state == LotteryState.Finish){
      return "No Winner"
    }
    return "Not yet drawn"

  }, [lotteryDetail?.winner])

  const dateTimeDesc = (time: number | undefined) => {
    if (!time || time == 0) {
      return ""
    }
    else {
      return new Date(time * 1000).toLocaleString()
    }
  }
  const dateDesc = (time: number | undefined) => {
    if (!time || time == 0) {
      return ""
    }
    else {
      return new Date(time * 1000).toLocaleDateString()
    }
  }
  const currencyInfo = (currency: CurrencyAmount<Currency> | undefined) => {
    if (!currency) {
      return ""
    }
    return currency.toFixed(0, { groupSeparator: ',' }) + " " + currency.currency.symbol
  }
  const [loading, setLoading] = useState(true)
  function wrappedOndismiss() {
    setLoading(false)
  }
  const [showLotteryList,SetShowLotteryList] = useState(false)

  function onLotteryListDismiss() {
    SetShowLotteryList(false)
  }

  const handleShowLotteryList = useCallback(()=>{
    if(lotteryCount && lotteryCount > 0){
      SetShowLotteryList(true)
    }
  },[lotteryCount])

  const handleSelectLottery = useCallback((a)=>{
    setSelectedLottery(a.lotteryAddress ?? "")
    SetShowLotteryList(false)
  },[])
  return (
    <>
    <Card2><p style={{padding: "18px 12px", margin:"20px", textAlign:"center", width: "100%"}}>Instructions for use</p></Card2>
      <Card2>
      <LightGreyCard2 height="auto">
        <ButtonDropdownLight style={{width:"auto;"}} padding={1} onClick={handleShowLotteryList}>
          <Text fontWeight={500} fontSize={20} marginLeft={'12px'}>
            <TextValue>{selectedLotteryDesc}{
          selectedLottery && selectedLottery.length > 0 && <Copy toCopy={selectedLottery} style={{display: "inline-block", marginLeft:"22px"}}>
                            <span style={{ marginLeft: '3px', display: "inline-block" }}>
                              <Trans>Copy Address</Trans>
                            </span>
                          </Copy>
        }</TextValue>
          </Text>
        </ButtonDropdownLight> 
        
        </LightGreyCard2>
      </Card2>
      <Card2>
        <LightGreyCard2 height="auto">
          <RowBetween2>
            <FullRow>
              <LightCard2>
                <TextTitle>State</TextTitle>
                <TextValue>{loadingLottery ? <LoadingDataView /> : lotteryStateDesc}</TextValue>
              </LightCard2>
            </FullRow>
          </RowBetween2>
          <RowBetween2>
            <FullRow display="flex" width="100%">
              <LightCard2 flex="1" width="100%">
                <TextTitle>Start Time</TextTitle>
                <TextValue>{loadingLottery ? <LoadingDataView /> : dateDesc(lotteryDetail?.startTime)}</TextValue>
              </LightCard2>
              <LightCard2 flex="1" width="100%">
                <TextTitle>Stop Time</TextTitle>
                <TextValue>{loadingLottery ? <LoadingDataView /> : dateDesc(lotteryDetail?.stopTime)}</TextValue>
              </LightCard2>
            </FullRow>
          </RowBetween2>
          <RowBetween2>
            <FullRow display="flex" width="100%">
              <LightCard2 flex="1">
                <TextTitle>Min Amount</TextTitle>
                <TextValue>{loadingLottery ? <LoadingDataView /> : currencyInfo(lotteryDetail?.minAmount)}</TextValue>
              </LightCard2>
              <LightCard2 flex="1">
                <TextTitle>Player Count</TextTitle>
                <TextValue>{loadingLottery ? <LoadingDataView /> : lotteryDetail?.playerCount}</TextValue>
              </LightCard2>
              <LightCard3 flex="1"  style={{backgroundColor:theme.darkMode? "rgb(74,230,200)": "rgb(74,230,200)", color: "rgb(200,84,213)", verticalAlign:"middle" }}>
                <TextTitleBigger>Current Pool Amount</TextTitleBigger>
                <TextValueBigger>{loadingLottery ? <LoadingDataView /> : currencyInfo(lotteryDetail?.prize)}</TextValueBigger>
              </LightCard3>
            </FullRow>
          </RowBetween2>
          {
            lotteryDetail?.state == LotteryState.Finish && <RowBetween2>
              <FullRow>
                <LightCard2>
                  <TextTitle>Winner</TextTitle>
                  <TextValue2>{loadingLottery ? <LoadingDataView /> : winnerDesc}</TextValue2>
                </LightCard2>
              </FullRow>
            </RowBetween2>
          }
          {
            entryTime > 0 && (
              <RowBetween2>
                <FullRow>
                  <LightCard2>
                    <TextTitle>My Deposited</TextTitle>
                    <TextValue>{loadingLottery ? <LoadingDataView /> : currencyInfo(depositedAmount)}</TextValue>
                  </LightCard2>
                </FullRow>
              </RowBetween2>
            )
          }

          {showConnectAWallet && (
            <ButtonPrimary marginTop={3} marginBottom={3} onClick={toggleWalletModal}>
              <Trans>Connect a wallet</Trans>
            </ButtonPrimary>
          )}
          {!showConnectAWallet && (lotteryDetail?.manager === account) && (!!lotteryDetail?.playerCount) && (lotteryDetail.playerCount > 0) && (lotteryDetail.state != LotteryState.Finish) &&(
            <>
              <ButtonPrimary marginTop={3} marginBottom={3} onClick={handleLucyDraw}>
                <ThemedText.Label mb="4px">
                  <Trans>Lucy Draw</Trans>
                </ThemedText.Label>
              </ButtonPrimary>
            </>
          )
          }
          {!showConnectAWallet && (lotteryDetail?.manager !== account) && (approvalState != ApprovalState.APPROVED) && (lotteryDetail?.state == LotteryState.Running) && (
            <>
              <RowBetween marginTop={50}>
                <FullRow>
                  <ThemedText.Main ml="6px" fontSize="12pt" color={theme.text1} width="100%" textAlign="center">
                    <Trans>Please approve firstly</Trans>
                  </ThemedText.Main>
                </FullRow>
              </RowBetween>
              <ButtonPrimary marginTop={3} marginBottom={3} onClick={handleApprove}>
                <ThemedText.Label mb="4px">
                  <Trans>Approve</Trans>
                </ThemedText.Label>
              </ButtonPrimary>
            </>
          )
          }
          {
            !showConnectAWallet && (lotteryDetail?.manager !== account) && approvalState == ApprovalState.APPROVED && lotteryDetail?.state == LotteryState.Running && (
              <>
                <AppBody>
                  <Wrapper id="swap-page">
                    <AutoColumn gap={'sm'}>
                      <div style={{ display: 'relative' }}>
                        <CurrencyInputPanel
                          hideInput={false}
                          value={formattedAmounts[Field.INPUT]}
                          showMaxButton={true}
                          currency={currencies[Field.INPUT]}
                          onUserInput={handleTypeInput}
                          onMax={handleMaxInput}
                          fiatValue={undefined}
                          onCurrencySelect={undefined}
                          otherCurrency={currencies[Field.INPUT]}
                          showCommonBases={true}
                          id="swap-currency-input"
                        />
                      </div>
                    </AutoColumn>
                  </Wrapper>
                </AppBody>
                <ButtonPrimary disabled={!account || approvalState != ApprovalState.APPROVED || lotteryStateDesc != "Running"} marginTop={30} onClick={handleParticipate}>
                  <ThemedText.Label mb="4px">
                    <span>{depositedAmount?.greaterThan(0) ? "Add" : ""} Deposit</span>
                  </ThemedText.Label>
                </ButtonPrimary>
              </>
            )
          }
        </LightGreyCard2>
        <LightGreyCard2 display="flex" flexDirection="column">
          <RowBetween marginTop={2} marginBottom={3}>
            <RowFixed>
              <ThemedText.Main ml="6px" fontSize="10pt" color={theme.text1}>
                <Trans>Player list:</Trans>
              </ThemedText.Main>
            </RowFixed>
          </RowBetween>
          <RowBetween flex="1" display="flex" flexDirection="column">
            {
              loadingPlayers && <LoadingDataView />
            }
            {!loadingPlayers && players.map((a, i) => {
              return (
                <RowBetween key={i} marginTop={2} flex="1" marginBottom={2} height="20px">
                  <FullRow>
                    <ThemedText.Main flex="1" ml="6px" fontSize="8pt" color={theme.text1} style={{ overflow: "hidden", display: "inline-block", whiteSpace: "nowrap", textOverflow: "ellipsis", msTextOverflow: "ellipsis" }}>
                      {!(a.entryTime && a.entryTime > 0) ? "" : a.address}
                    </ThemedText.Main>
                    <ThemedText.Main ml="6px" fontSize="8pt" color={theme.text1}>
                      <span>{dateTimeDesc(a.entryTime)}</span>
                    </ThemedText.Main>
                  </FullRow>
                </RowBetween>
              )
            })}
          </RowBetween>
          <CustomPage marginTop={5} onChangePage={handleChangePage} page={curPage} size={pageSize} total={lotteryDetail?.playerCount} showJump={true} showEnds={true} showTotal={true} ></CustomPage>
        </LightGreyCard2>
      </Card2>
      <Modal isOpen={showLotteryList} onDismiss={onLotteryListDismiss} minHeight={20}>
      <LightGreyCard3 display="flex" flexDirection="column">
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
                        <span onClick={()=>{handleSelectLottery(a)}}>
                          {!(a.createTime && a.createTime > 0) ? "" : a.lotteryAddress}
                        </span>
                      </ThemedText.Main>
                      <ThemedText.Main ml="6px" fontSize="12px" color={theme.text1}>
                        <span>{!(a.createTime && a.createTime > 0) ? "" : new Date(a.createTime * 1000).toLocaleString()}</span>
                      </ThemedText.Main>
                    </FullRow>
                  </RowBetween>
                )
              })}
          </RowBetween>
          <CustomPage marginTop={5} onChangePage={handleChangeLotteryPage} page={curLotteryPage} size={lotteryPageSize} total={lotteryCount} showJump={true} showEnds={true} showTotal={true} ></CustomPage>
        </LightGreyCard3>
      </Modal>
    </>
  )
}
