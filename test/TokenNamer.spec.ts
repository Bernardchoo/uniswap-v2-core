import chai, { expect } from 'chai'
import { Contract } from 'ethers'
import { solidity, MockProvider, deployContract } from 'ethereum-waffle'
import { formatBytes32String } from 'ethers/utils'
import { AddressZero } from 'ethers/constants'

import TokenNamerTest from '../build/TokenNamerTest.json'
import FakeCompliantERC20 from '../build/FakeCompliantERC20.json'
import FakeNoncompliantERC20 from '../build/FakeNoncompliantERC20.json'
import FakeOptionalERC20 from '../build/FakeOptionalERC20.json'

chai.use(solidity)

const overrides = {
  gasLimit: 9999999
}

// last byte in bytes32 strings is null terminator
const fullBytes32Name = 'NAME'.repeat(8).substr(0, 31)
const fullBytes32Symbol = 'SYMB'.repeat(8).substr(0, 31)

describe('TokenNamer', () => {
  const provider = new MockProvider({
    hardfork: 'istanbul',
    mnemonic: 'horn horn horn horn horn horn horn horn horn horn horn horn',
    gasLimit: 9999999
  })
  const [wallet] = provider.getWallets()

  let tokenNamer: Contract
  before('deploy TokenNamerTest', async () => {
    tokenNamer = await deployContract(wallet, TokenNamerTest, [], overrides)
  })

  function deployCompliant({ name, symbol }: { name: string; symbol: string }): Promise<Contract> {
    return deployContract(wallet, FakeCompliantERC20, [name, symbol], overrides)
  }

  function deployNoncompliant({ name, symbol }: { name: string; symbol: string }): Promise<Contract> {
    return deployContract(
      wallet,
      FakeNoncompliantERC20,
      [formatBytes32String(name), formatBytes32String(symbol)],
      overrides
    )
  }

  function deployOptional(): Promise<Contract> {
    return deployContract(wallet, FakeOptionalERC20, [], overrides)
  }

  async function getName(tokenAddress: string): Promise<string> {
    return tokenNamer.tokenName(tokenAddress)
  }

  async function getSymbol(tokenAddress: string): Promise<string> {
    return tokenNamer.tokenSymbol(tokenAddress)
  }

  it('is deployed', () => {
    expect(tokenNamer.address).to.be.a('string')
  })

  describe('#tokenSymbol', () => {
    it('works with compliant', async () => {
      const token = await deployCompliant({ name: 'token name', symbol: 'tn' })
      expect(await getSymbol(token.address)).to.eq('tn')
    })
    it('works with noncompliant', async () => {
      const token = await deployNoncompliant({ name: 'token name', symbol: 'tn' })
      expect(await getSymbol(token.address)).to.eq('tn')
    })
    it('works with empty bytes32', async () => {
      const token = await deployNoncompliant({ name: '', symbol: '' })
      expect(await getSymbol(token.address)).to.eq('')
    })
    it('works with noncompliant full bytes32', async () => {
      const token = await deployNoncompliant({ name: fullBytes32Name, symbol: fullBytes32Symbol })
      expect(await getSymbol(token.address)).to.eq(fullBytes32Symbol)
    })
    it('works with optional', async () => {
      const token = await deployOptional()
      expect(await getSymbol(token.address)).to.eq(token.address.substr(2, 6).toUpperCase())
    })
    it('works with non-code address', async () => {
      expect(await getSymbol(AddressZero)).to.eq(AddressZero.substr(2, 6))
    })
    it('works with really long strings', async () => {
      const token = await deployCompliant({ name: 'token name'.repeat(32), symbol: 'tn'.repeat(32) })
      expect(await getSymbol(token.address)).to.eq('tn'.repeat(32))
    })
    it('falls back to address with empty strings', async () => {
      const token = await deployCompliant({ name: '', symbol: '' })
      expect(await getSymbol(token.address)).to.eq(token.address.substr(2, 6).toUpperCase())
    })
  })
})