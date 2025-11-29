import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { CipherLending, CipherLending__factory } from "../types";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("CipherLending")) as CipherLending__factory;
  const cipherLendingContract = (await factory.deploy()) as CipherLending;
  const cipherLendingContractAddress = await cipherLendingContract.getAddress();

  return { cipherLendingContract, cipherLendingContractAddress };
}

describe("CipherLending", function () {
  let signers: Signers;
  let cipherLendingContract: CipherLending;
  let cipherLendingContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    // Check whether the tests are running against an FHEVM mock environment
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ cipherLendingContract, cipherLendingContractAddress } = await deployFixture());
  });

  it("should deploy successfully", async function () {
    expect(cipherLendingContractAddress).to.be.properAddress;
  });

  it("should allow borrower to submit request with encrypted score", async function () {
    const creditScore = 750;
    const loanAmount = ethers.parseEther("5000");
    const loanTerm = 12;

    // Encrypt credit score
    const encryptedScore = await fhevm
      .createEncryptedInput(cipherLendingContractAddress, signers.alice.address)
      .add32(creditScore)
      .encrypt();

    // Submit borrower request
    const tx = await cipherLendingContract
      .connect(signers.alice)
      .submitBorrowerRequest(encryptedScore.handles[0], loanAmount, loanTerm, encryptedScore.inputProof);
    await tx.wait();

    // Check that request was created
    const requestCount = await cipherLendingContract.getBorrowerRequestsCount();
    expect(requestCount).to.eq(1);

    // Check request details
    const [borrower, amount, term, isActive] = await cipherLendingContract.getBorrowerRequest(0);
    expect(borrower).to.eq(signers.alice.address);
    expect(amount).to.eq(loanAmount);
    expect(term).to.eq(loanTerm);
    expect(isActive).to.eq(true);
  });

  it("should allow lender to find matching borrower requests", async function () {
    // First, create a borrower request
    const creditScore = 750;
    const loanAmount = ethers.parseEther("5000");
    const loanTerm = 12;

    const encryptedScore = await fhevm
      .createEncryptedInput(cipherLendingContractAddress, signers.alice.address)
      .add32(creditScore)
      .encrypt();

    await cipherLendingContract
      .connect(signers.alice)
      .submitBorrowerRequest(encryptedScore.handles[0], loanAmount, loanTerm, encryptedScore.inputProof);

    // Test finding matches with minimum score of 700
    // In MVP, findMatches returns all active requests, so we decrypt and filter
    // Note: In this MVP test, we use borrower (alice) to decrypt since she has permission
    // In production, there would be a mechanism to allow lenders to decrypt for matching
    const allRequestIds = await cipherLendingContract.findMatches(700);
    const matchingIds: number[] = [];
    
    for (const requestId of allRequestIds) {
      const encryptedScoreHandle = await cipherLendingContract.getEncryptedScore(requestId);
      if (encryptedScoreHandle !== ethers.ZeroHash) {
        // Use borrower (alice) to decrypt since she has ACL permission
        // In production, this would be handled differently (e.g., borrower grants permission to lenders)
        const decryptedScore = await fhevm.userDecryptEuint(
          FhevmType.euint32,
          encryptedScoreHandle,
          cipherLendingContractAddress,
          signers.alice // borrower decrypts (has permission)
        );
        if (Number(decryptedScore) >= 700) {
          matchingIds.push(Number(requestId));
        }
      }
    }
    
    expect(matchingIds.length).to.eq(1);
    expect(matchingIds[0]).to.eq(0);

    // Test with higher minimum score (800) - should find no matches
    const allRequestIds2 = await cipherLendingContract.findMatches(800);
    const matchingIds2: number[] = [];
    
    for (const requestId of allRequestIds2) {
      const encryptedScoreHandle = await cipherLendingContract.getEncryptedScore(requestId);
      if (encryptedScoreHandle !== ethers.ZeroHash) {
        const decryptedScore = await fhevm.userDecryptEuint(
          FhevmType.euint32,
          encryptedScoreHandle,
          cipherLendingContractAddress,
          signers.alice // borrower decrypts (has permission)
        );
        if (Number(decryptedScore) >= 800) {
          matchingIds2.push(Number(requestId));
        }
      }
    }
    
    expect(matchingIds2.length).to.eq(0);
  });

  it("should allow lender to submit offer", async function () {
    // Create borrower request first
    const creditScore = 750;
    const loanAmount = ethers.parseEther("5000");
    const loanTerm = 12;

    const encryptedScore = await fhevm
      .createEncryptedInput(cipherLendingContractAddress, signers.alice.address)
      .add32(creditScore)
      .encrypt();

    await cipherLendingContract
      .connect(signers.alice)
      .submitBorrowerRequest(encryptedScore.handles[0], loanAmount, loanTerm, encryptedScore.inputProof);

    // Submit lender offer
    const offerAmount = ethers.parseEther("5000");
    const apr = 500; // 5%
    const offerTerm = 12;

    const tx = await cipherLendingContract
      .connect(signers.bob)
      .submitLenderOffer(0, offerAmount, apr, offerTerm);
    await tx.wait();

    // Check offer was created
    const offerCount = await cipherLendingContract.getLenderOffersCount();
    expect(offerCount).to.eq(1);

    // Check offer details
    const [lender, requestId, amount, offerApr, term, isActive] = await cipherLendingContract.getLenderOffer(0);
    expect(lender).to.eq(signers.bob.address);
    expect(requestId).to.eq(0);
    expect(amount).to.eq(offerAmount);
    expect(offerApr).to.eq(apr);
    expect(term).to.eq(offerTerm);
    expect(isActive).to.eq(true);
  });

  it("should allow borrower to accept lender offer and create loan", async function () {
    // Create borrower request
    const creditScore = 750;
    const loanAmount = ethers.parseEther("5000");
    const loanTerm = 12;

    const encryptedScore = await fhevm
      .createEncryptedInput(cipherLendingContractAddress, signers.alice.address)
      .add32(creditScore)
      .encrypt();

    await cipherLendingContract
      .connect(signers.alice)
      .submitBorrowerRequest(encryptedScore.handles[0], loanAmount, loanTerm, encryptedScore.inputProof);

    // Submit lender offer
    const offerAmount = ethers.parseEther("5000");
    const apr = 500; // 5%

    await cipherLendingContract
      .connect(signers.bob)
      .submitLenderOffer(0, offerAmount, apr, loanTerm);

    // Accept the offer (borrower accepts)
    const tx = await cipherLendingContract
      .connect(signers.alice)
      .acceptLoanOffer(0);
    await tx.wait();

    // Check loan was created
    const loanCount = await cipherLendingContract.getLoansCount();
    expect(loanCount).to.eq(1);

    // Check loan details
    const [borrower, lender, amount, loanApr, term, startTime, isActive, isRepaid] = await cipherLendingContract.getLoan(0);
    expect(borrower).to.eq(signers.alice.address);
    expect(lender).to.eq(signers.bob.address);
    expect(amount).to.eq(offerAmount);
    expect(loanApr).to.eq(apr);
    expect(term).to.eq(loanTerm);
    expect(isActive).to.eq(true);
    expect(isRepaid).to.eq(false);

    // Check that request and offer are now inactive
    const [, , , requestActive] = await cipherLendingContract.getBorrowerRequest(0);
    expect(requestActive).to.eq(false);

    const [, , , , , offerActive] = await cipherLendingContract.getLenderOffer(0);
    expect(offerActive).to.eq(false);
  });
});
