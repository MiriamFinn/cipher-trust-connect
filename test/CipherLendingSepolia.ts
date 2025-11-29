import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { CipherLending } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

describe("CipherLendingSepolia", function () {
  let signers: Signers;
  let cipherLendingContract: CipherLending;
  let cipherLendingContractAddress: string;
  let step: number;
  let steps: number;

  function progress(message: string) {
    console.log(`${++step}/${steps} ${message}`);
  }

  before(async function () {
    if (fhevm.isMock) {
      console.warn(`This hardhat test suite can only run on Sepolia Testnet`);
      this.skip();
    }

    try {
      const cipherLendingDeployment = await deployments.get("CipherLending");
      cipherLendingContractAddress = cipherLendingDeployment.address;
      cipherLendingContract = await ethers.getContractAt("CipherLending", cipherLendingDeployment.address);
    } catch (e) {
      (e as Error).message += ". Call 'npx hardhat deploy --network sepolia'";
      throw e;
    }

    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { alice: ethSigners[0], bob: ethSigners[1] };
  });

  beforeEach(async () => {
    step = 0;
    steps = 0;
  });

  it("complete lending flow with encrypted credit score", async function () {
    steps = 12;

    this.timeout(4 * 60000); // Extended timeout for Sepolia

    progress("Encrypting credit score 750...");
    const creditScore = 750;
    const encryptedScore = await fhevm
      .createEncryptedInput(cipherLendingContractAddress, signers.alice.address)
      .add32(creditScore)
      .encrypt();

    progress(`Submitting borrower request...`);
    const loanAmount = ethers.parseEther("5000");
    const loanTerm = 12;

    let tx = await cipherLendingContract
      .connect(signers.alice)
      .submitBorrowerRequest(encryptedScore.handles[0], loanAmount, loanTerm, encryptedScore.inputProof);
    await tx.wait();

    progress("Borrower request submitted successfully");

    progress("Finding matches with minimum score 700...");
    const matchingIds = await cipherLendingContract.findMatches(700);
    progress(`Found ${matchingIds.length} matching requests`);
    expect(matchingIds.length).to.be.greaterThan(0);

    progress("Submitting lender offer...");
    const offerAmount = loanAmount;
    const apr = 500; // 5%

    tx = await cipherLendingContract
      .connect(signers.bob)
      .submitLenderOffer(0, offerAmount, apr, loanTerm);
    await tx.wait();

    progress("Lender offer submitted successfully");

    progress("Borrower accepting loan offer...");
    tx = await cipherLendingContract
      .connect(signers.alice)
      .acceptLoanOffer(0);
    await tx.wait();

    progress("Loan created successfully");

    progress("Verifying loan details...");
    const loanCount = await cipherLendingContract.getLoansCount();
    expect(loanCount).to.eq(1);

    const [borrower, lender, amount, loanApr, term, startTime, isActive, isRepaid] = await cipherLendingContract.getLoan(0);
    expect(borrower).to.eq(signers.alice.address);
    expect(lender).to.eq(signers.bob.address);
    expect(amount).to.eq(offerAmount);
    expect(loanApr).to.eq(apr);
    expect(isActive).to.eq(true);
    expect(isRepaid).to.eq(false);

    progress("All tests passed! Encrypted lending flow completed successfully.");
  });
});
