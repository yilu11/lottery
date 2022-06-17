import { useState } from 'react'
import { Slash } from 'react-feather'
import { ImageProps } from 'rebass'

import useTheme from '../../hooks/useTheme'

const BAD_SRCS: { [tokenAddress: string]: true } = {}

interface Players extends Pick<ImageProps, 'style' | 'alt' | 'className'> {
  srcs: string[]
}

/**
 * Renders an image by sequentially trying a list of URIs, and then eventually a fallback triangle alert
 */
 const LotteryPlayer = ():string => {
     return ""
}
export default LotteryPlayer