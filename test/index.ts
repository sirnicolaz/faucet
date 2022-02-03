import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, network } from "hardhat";
// eslint-disable-next-line node/no-missing-import,camelcase
import {TCO2Faucet, TCO2Faucet__factory, ToucanCarbonOffsets} from "../typechain";
import * as tcoAbi from "../artifacts/contracts/CO2KEN_contracts/ToucanCarbonOffsets.sol/ToucanCarbonOffsets.json";
import deposit from "../utils/deposit";
import { BigNumber } from "ethers";

// this is the TCO2 address from the test.toucan.earth/contracts list for Mumbai network
// const tco2Address: string = "0x788d12e9f6E5D65a0Fa4C3f5D6AA34Ef39A6E582";

/**
 * This is my the address of my TCO2 coins.
 * I got it from my test project (Yingpeng HFC23 Decompostion Project).
 */
const tco2Address: string = "0xa5831eb637dff307395b5183c86B04c69C518681";
// and this is the address that I wish to deploy from
const myAddress: string = "0x721F6f7A29b99CbdE1F18C4AA7D7AEb31eb2923B";

// TODO implement tests with .to.be.revertedWith

describe("TCO2Faucet", function () {
  let faucet: TCO2Faucet;
  let tco: ToucanCarbonOffsets;
  let owner: SignerWithAddress;
  let addr1: SignerWithAddress;
  let addr2: SignerWithAddress;
  let addrs: SignerWithAddress[];

  beforeEach(async function () {
    /**
     * if we are forking Mumbai (which I chose to do for performance, so I can test & iterate faster)
     * we impersonate my Mumbai account (I have TCO2, BCT & MATIC on it at the blockNumber I chose)
     */
    if (network.name === "hardhat") {
      await network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [myAddress],
      });
    }

    // we get a signer based on my above address (I have TCO2, BCT & MATIC on it at the blockNumber I chose)
    owner = await ethers.getSigner(myAddress);
    // and we get a bunch of other random signers
    [addr1, addr2, ...addrs] = await ethers.getSigners();

    // we deploy a Faucet contract and get a portal to it
    const TCO2FaucetFactory = (await ethers.getContractFactory(
      "TCO2Faucet",
      owner
      // eslint-disable-next-line camelcase
    )) as TCO2Faucet__factory;
    faucet = await TCO2FaucetFactory.deploy(tco2Address);

    // we instantiate a portal to my TCO2 contract
    // @ts-ignore
    tco = new ethers.Contract(tco2Address, tcoAbi.abi, owner);
  });

  describe("Deposit", function () {
    it("Should deposit 1 TCO2", async function () {
      const amountToDeposit = "1.0";

      /**
       * we check my TCO2 before depositing some of it
       */
      const myTcoBalanceBefore = await tco.balanceOf(myAddress);

      /**
       * we attempt to deposit an amount of TCO2 into the DEX contract.
       * I have separated in the deposit() function for readability
       */
      const depositTxn = await deposit(tco, faucet, tco2Address, amountToDeposit);
      expect(depositTxn.confirmations).to.be.above(0);

      /**
       * we check the my TCO2 balance after depositing some of it
       * and we are expecting it to be less by the deposited amount
       */
      const myTcoBalanceAfter = await tco.balanceOf(myAddress);
      const expectedTcoBalance = myTcoBalanceBefore.sub(
        ethers.utils.parseEther(amountToDeposit)
      );
      expect(myTcoBalanceAfter).to.eql(expectedTcoBalance);

      /**
       * we check the TCO2 balance of the contract to see if it changed.
       * Normally it should be equal to 1.0 as we redeploy a new DEX contract before each test.
       */
      const dexTcoBalance = await faucet.getTokenBalance(tco2Address);
      expect(ethers.utils.formatEther(dexTcoBalance)).to.eql("1.0");
    });
  });
});