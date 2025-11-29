import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  console.log("Deploying CipherLending contract...");

  const deployedCipherLending = await deploy("CipherLending", {
    from: deployer,
    log: true,
    args: [], // No constructor arguments needed
  });

  console.log(`✅ CipherLending contract deployed at: ${deployedCipherLending.address}`);
  console.log(`📝 Deployment transaction: ${deployedCipherLending.transactionHash}`);

  // Save deployment info for verification
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log(`🔍 Verify contract on Etherscan:`);
    console.log(`npx hardhat verify --network ${hre.network.name} ${deployedCipherLending.address}`);
  }
};

export default func;
func.id = "deploy_cipher_lending"; // id required to prevent reexecution
func.tags = ["CipherLending", "all"];
