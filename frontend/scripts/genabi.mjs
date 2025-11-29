import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTRACT_NAME = "CipherLending";

// Paths relative to frontend/scripts directory
const projectRoot = path.resolve(__dirname, "../..");
const deploymentsDir = path.join(projectRoot, "deployments");
const outdir = path.resolve(__dirname, "../src/abi");

const line = "\n===================================================================\n";

// Create output directory if it doesn't exist
if (!fs.existsSync(outdir)) {
  fs.mkdirSync(outdir, { recursive: true });
  console.log(`Created directory: ${outdir}`);
}

function readDeployment(chainName, chainId, contractName, optional = false) {
  const chainDeploymentDir = path.join(deploymentsDir, chainName);
  
  if (!fs.existsSync(chainDeploymentDir)) {
    if (optional) {
      console.log(`Deployment directory not found (optional): ${chainDeploymentDir}`);
      return null;
    }
    console.error(`${line}Unable to locate 'deployments/${chainName}' directory.${line}`);
    console.error(`Please run 'npx hardhat deploy --network ${chainName}' first.`);
    process.exit(1);
  }

  const jsonPath = path.join(chainDeploymentDir, `${contractName}.json`);
  
  if (!fs.existsSync(jsonPath)) {
    if (optional) {
      console.log(`Deployment file not found (optional): ${jsonPath}`);
      return null;
    }
    console.error(`${line}Unable to locate deployment file: ${jsonPath}${line}`);
    console.error(`Please run 'npx hardhat deploy --network ${chainName}' first.`);
    process.exit(1);
  }

  const jsonString = fs.readFileSync(jsonPath, "utf-8");
  const obj = JSON.parse(jsonString);
  obj.chainId = chainId;

  return obj;
}

console.log(`\nProcessing ${CONTRACT_NAME}...`);

// Read localhost deployment (required)
const deployLocalhost = readDeployment("localhost", 31337, CONTRACT_NAME, false);

// Read Sepolia deployment (optional)
let deploySepolia = readDeployment("sepolia", 11155111, CONTRACT_NAME, true);
if (!deploySepolia) {
  deploySepolia = { 
    abi: deployLocalhost.abi, 
    address: "0x0000000000000000000000000000000000000000" 
  };
}

// Verify ABIs match
if (deployLocalhost && deploySepolia) {
  if (JSON.stringify(deployLocalhost.abi) !== JSON.stringify(deploySepolia.abi)) {
    console.error(
      `${line}Deployments on localhost and Sepolia have different ABIs.${line}` +
      `Consider re-deploying the contracts on both networks.${line}`
    );
    process.exit(1);
  }
}

// Generate ABI TypeScript file
const tsCode = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
  Generated from: deployments/localhost/${CONTRACT_NAME}.json
*/
export const ${CONTRACT_NAME}ABI = ${JSON.stringify({ abi: deployLocalhost.abi }, null, 2)} as const;
`;

// Generate Addresses TypeScript file
const tsAddresses = `/*
  This file is auto-generated.
  Command: 'npm run genabi'
  Generated from: deployments/localhost and deployments/sepolia
*/
export const ${CONTRACT_NAME}Addresses = { 
  "11155111": { address: "${deploySepolia.address}", chainId: 11155111, chainName: "sepolia" },
  "31337": { address: "${deployLocalhost.address}", chainId: 31337, chainName: "hardhat" },
} as const;
`;

const abiPath = path.join(outdir, `${CONTRACT_NAME}ABI.ts`);
const addressesPath = path.join(outdir, `${CONTRACT_NAME}Addresses.ts`);

fs.writeFileSync(abiPath, tsCode, "utf-8");
fs.writeFileSync(addressesPath, tsAddresses, "utf-8");

console.log(`✅ Generated ${abiPath}`);
console.log(`✅ Generated ${addressesPath}`);
console.log(`\n   Localhost address: ${deployLocalhost.address}`);
console.log(`   Sepolia address: ${deploySepolia.address}`);
console.log(`\nABI generation completed!`);

