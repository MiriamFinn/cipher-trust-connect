import { isAddress, Eip1193Provider, JsonRpcProvider } from "ethers";
import type {
  FhevmInitSDKOptions,
  FhevmInitSDKType,
  FhevmLoadSDKType,
  FhevmWindowType,
} from "./fhevmTypes";
import { isFhevmWindowType, RelayerSDKLoader } from "./RelayerSDKLoader";
import { publicKeyStorageGet, publicKeyStorageSet } from "./PublicKeyStorage";
import { FhevmInstance, FhevmInstanceConfig } from "../fhevmTypes";

export class FhevmReactError extends Error {
  code: string;
  constructor(code: string, message?: string, options?: ErrorOptions) {
    super(message, options);
    this.code = code;
    this.name = "FhevmReactError";
  }
}

function throwFhevmError(
  code: string,
  message?: string,
  cause?: unknown
): never {
  throw new FhevmReactError(code, message, cause ? { cause } : undefined);
}

const isFhevmInitialized = (): boolean => {
  if (!isFhevmWindowType(window, console.log)) {
    return false;
  }
  return window.relayerSDK.__initialized__ === true;
};

const fhevmLoadSDK: FhevmLoadSDKType = () => {
  const loader = new RelayerSDKLoader({ trace: console.log });
  return loader.load();
};

const fhevmInitSDK: FhevmInitSDKType = async (
  options?: FhevmInitSDKOptions
) => {
  if (!isFhevmWindowType(window, console.log)) {
    throw new Error("window.relayerSDK is not available");
  }
  const result = await window.relayerSDK.initSDK(options);
  window.relayerSDK.__initialized__ = result;
  if (!result) {
    throw new Error("window.relayerSDK.initSDK failed.");
  }
  return true;
};

function checkIsAddress(a: unknown): a is `0x${string}` {
  if (typeof a !== "string") {
    return false;
  }
  if (!isAddress(a)) {
    return false;
  }
  return true;
}

export class FhevmAbortError extends Error {
  constructor(message = "FHEVM operation was cancelled") {
    super(message);
    this.name = "FhevmAbortError";
  }
}

type FhevmRelayerStatusType =
  | "sdk-loading"
  | "sdk-loaded"
  | "sdk-initializing"
  | "sdk-initialized"
  | "creating";

async function getChainId(
  providerOrUrl: Eip1193Provider | string
): Promise<number> {
  // Special case: "sepolia" marker should not be processed here
  // It should be handled before calling this function
  if (typeof providerOrUrl === "string" && providerOrUrl === "sepolia") {
    return 11155111;
  }
  
  if (typeof providerOrUrl === "string") {
    const provider = new JsonRpcProvider(providerOrUrl);
    return Number((await provider.getNetwork()).chainId);
  }
  const chainId = await providerOrUrl.request({ method: "eth_chainId" });
  return Number.parseInt(chainId as string, 16);
}

async function getWeb3Client(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("web3_clientVersion", []);
    return version;
  } catch (e) {
    throwFhevmError(
      "WEB3_CLIENTVERSION_ERROR",
      `The URL ${rpcUrl} is not a Web3 node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

async function tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl: string): Promise<
  | {
      ACLAddress: `0x${string}`;
      InputVerifierAddress: `0x${string}`;
      KMSVerifierAddress: `0x${string}`;
    }
  | undefined
> {
  const version = await getWeb3Client(rpcUrl);
  if (
    typeof version !== "string" ||
    !version.toLowerCase().includes("hardhat")
  ) {
    // Not a Hardhat Node
    return undefined;
  }
  try {
    const metadata = await getFHEVMRelayerMetadata(rpcUrl);
    if (!metadata || typeof metadata !== "object") {
      return undefined;
    }
    if (
      !(
        "ACLAddress" in metadata &&
        typeof metadata.ACLAddress === "string" &&
        metadata.ACLAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    if (
      !(
        "InputVerifierAddress" in metadata &&
        typeof metadata.InputVerifierAddress === "string" &&
        metadata.InputVerifierAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    if (
      !(
        "KMSVerifierAddress" in metadata &&
        typeof metadata.KMSVerifierAddress === "string" &&
        metadata.KMSVerifierAddress.startsWith("0x")
      )
    ) {
      return undefined;
    }
    return metadata;
  } catch {
    // Not a FHEVM Hardhat Node
    return undefined;
  }
}

async function getFHEVMRelayerMetadata(rpcUrl: string) {
  const rpc = new JsonRpcProvider(rpcUrl);
  try {
    const version = await rpc.send("fhevm_relayer_metadata", []);
    return version;
  } catch (e) {
    throwFhevmError(
      "FHEVM_RELAYER_METADATA_ERROR",
      `The URL ${rpcUrl} is not a FHEVM Hardhat node or is not reachable. Please check the endpoint.`,
      e
    );
  } finally {
    rpc.destroy();
  }
}

type MockResolveResult = { isMock: true; chainId: number; rpcUrl: string };
type GenericResolveResult = { isMock: false; chainId: number; rpcUrl?: string };
type ResolveResult = MockResolveResult | GenericResolveResult;

async function resolve(
  providerOrUrl: Eip1193Provider | string,
  mockChains?: Record<number, string>
): Promise<ResolveResult> {
  // Resolve chainId
  const chainId = await getChainId(providerOrUrl);

  // Resolve rpc url
  let rpcUrl = typeof providerOrUrl === "string" ? providerOrUrl : undefined;

  const _mockChains: Record<number, string> = {
    31337: "http://localhost:8545",
    ...(mockChains ?? {}),
  };

  // Help Typescript solver here:
  if (Object.hasOwn(_mockChains, chainId)) {
    if (!rpcUrl) {
      rpcUrl = _mockChains[chainId];
    }

    return { isMock: true, chainId, rpcUrl };
  }

  return { isMock: false, chainId, rpcUrl };
}

export const createFhevmInstance = async (parameters: {
  provider: Eip1193Provider | string;
  mockChains?: Record<number, string>;
  signal: AbortSignal;
  onStatusChange?: (status: FhevmRelayerStatusType) => void;
}): Promise<FhevmInstance> => {
  const throwIfAborted = () => {
    if (signal.aborted) throw new FhevmAbortError();
  };

  const notify = (status: FhevmRelayerStatusType) => {
    if (onStatusChange) onStatusChange(status);
  };

  const {
    signal,
    onStatusChange,
    provider: providerOrUrl,
    mockChains,
  } = parameters;

  // For Sepolia, if providerOrUrl is the special marker "sepolia", use Dairy approach
  // This must be checked BEFORE calling resolve/getChainId to avoid trying to parse "sepolia" as RPC URL
  if (typeof providerOrUrl === "string" && providerOrUrl === "sepolia") {
    console.log("[createFhevmInstance] Creating FHEVM instance for Sepolia network using Dairy approach");
    
    try {
      // Try to use window.relayerSDK first (loaded from CDN in index.html, like Dairy)
      if (typeof window !== "undefined" && (window as any).relayerSDK) {
        console.log("[createFhevmInstance] Using window.relayerSDK from CDN");
        const relayerSDK = (window as any).relayerSDK;
        
        // Initialize SDK if not already initialized
        if (!relayerSDK.__initialized__) {
          console.log("[createFhevmInstance] Initializing SDK from window.relayerSDK...");
          await relayerSDK.initSDK();
          throwIfAborted();
          console.log("[createFhevmInstance] SDK initialized");
        } else {
          console.log("[createFhevmInstance] SDK already initialized");
        }
        
        // Create instance directly with SepoliaConfig (no provider needed)
        console.log("[createFhevmInstance] Creating instance with SepoliaConfig...");
        const instance = await relayerSDK.createInstance(relayerSDK.SepoliaConfig);
        console.log("[createFhevmInstance] Instance created successfully");
        
        throwIfAborted();
        return instance;
      }
      
      // Fallback: Load SDK from bundle (dynamic import)
      console.log("[createFhevmInstance] window.relayerSDK not found, trying bundle import...");
      const relayerSDKModule = await import("@zama-fhe/relayer-sdk/bundle");
      console.log("[createFhevmInstance] Relayer SDK imported, available exports:", Object.keys(relayerSDKModule));
      
      // Extract named exports - dynamic import returns them directly, not in a default object
      const { initSDK, createInstance, SepoliaConfig } = relayerSDKModule;
      
      // Check if exports are available
      if (!initSDK || !createInstance || !SepoliaConfig) {
        console.error("[createFhevmInstance] Missing exports. Available keys:", Object.keys(relayerSDKModule));
        throw new Error(
          `Missing required exports from relayer SDK. ` +
          `initSDK: ${!!initSDK}, createInstance: ${!!createInstance}, SepoliaConfig: ${!!SepoliaConfig}. ` +
          `Available: ${Object.keys(relayerSDKModule).join(", ")}`
        );
      }
      
      // Initialize SDK
      console.log("[createFhevmInstance] Initializing SDK from bundle...");
      await initSDK();
      throwIfAborted();
      console.log("[createFhevmInstance] SDK initialized");
      
      // Create instance directly with SepoliaConfig (no provider needed)
      console.log("[createFhevmInstance] Creating instance with SepoliaConfig...");
      const instance = await createInstance(SepoliaConfig);
      console.log("[createFhevmInstance] Instance created successfully");
      
      throwIfAborted();
      return instance;
    } catch (error) {
      console.error("[createFhevmInstance] Error creating Sepolia instance:", error);
      throw error;
    }
  }
  
  // Log what we received if it's not "sepolia"
  if (typeof providerOrUrl === "string") {
    console.log("[createFhevmInstance] Received string provider:", providerOrUrl);
  } else if (providerOrUrl) {
    console.log("[createFhevmInstance] Received Eip1193Provider object");
  } else {
    console.log("[createFhevmInstance] Received undefined provider");
  }

  // Resolve chainId
  const { isMock, rpcUrl, chainId } = await resolve(providerOrUrl, mockChains);

  if (isMock) {
    // Throws an error if cannot connect or url does not refer to a Web3 client
    const fhevmRelayerMetadata =
      await tryFetchFHEVMHardhatNodeRelayerMetadata(rpcUrl);

    if (fhevmRelayerMetadata) {
      // fhevmRelayerMetadata is defined, which means rpcUrl refers to a FHEVM Hardhat Node
      notify("creating");

      //////////////////////////////////////////////////////////////////////////
      // 
      // WARNING!!
      // ALWAY USE DYNAMIC IMPORT TO AVOID INCLUDING THE ENTIRE FHEVM MOCK LIB 
      // IN THE FINAL PRODUCTION BUNDLE!!
      // 
      //////////////////////////////////////////////////////////////////////////
      const fhevmMock = await import("./mock/fhevmMock");
      const mockInstance = await fhevmMock.fhevmMockCreateInstance({
        rpcUrl,
        chainId,
        metadata: fhevmRelayerMetadata,
      });

      throwIfAborted();

      return mockInstance;
    }
  }

  throwIfAborted();

  // For Sepolia network, relayer SDK handles network internally
  // We don't need to pass network parameter, and providerOrUrl can be ignored for Sepolia
  if (chainId === 11155111) {
    // Sepolia: Skip provider check, relayer SDK handles network internally
    console.log("Creating FHEVM instance for Sepolia network (relayer SDK handles network internally)");
  } else if (typeof providerOrUrl === "string") {
    // For other non-mock chains, providerOrUrl must be an Eip1193Provider object
    throw new Error(
      `Invalid provider for chainId ${chainId}: expected Eip1193Provider but got string "${providerOrUrl}". ` +
      `This usually means the wallet client transport is not available. Please ensure your wallet is connected.`
    );
  }

  if (!isFhevmWindowType(window, console.log)) {
    notify("sdk-loading");

    // throws an error if failed
    await fhevmLoadSDK();
    throwIfAborted();

    notify("sdk-loaded");
  }

  // notify that state === "sdk-loaded"

  if (!isFhevmInitialized()) {
    notify("sdk-initializing");

    // throws an error if failed
    await fhevmInitSDK();
    throwIfAborted();

    notify("sdk-initialized");
  }

  const relayerSDK = (window as unknown as FhevmWindowType).relayerSDK;

  const aclAddress = relayerSDK.SepoliaConfig.aclContractAddress;
  if (!checkIsAddress(aclAddress)) {
    throw new Error(`Invalid address: ${aclAddress}`);
  }

  const pub = await publicKeyStorageGet(aclAddress);
  throwIfAborted();

  // For Sepolia network, create instance using SepoliaConfig without network parameter
  // The relayer SDK handles network internally for Sepolia
  // Reference: moodchain-fhe uses relayerSDK.createInstance(relayerSDK.SepoliaConfig)
  const config: FhevmInstanceConfig = {
    ...relayerSDK.SepoliaConfig,
    publicKey: pub.publicKey,
    publicParams: pub.publicParams,
    // Note: Do not pass 'network' parameter for Sepolia - relayer SDK handles it internally
  };

  // notify that state === "creating"
  notify("creating");

  const instance = await relayerSDK.createInstance(config);

  // Save the key even if aborted
  await publicKeyStorageSet(
    aclAddress,
    instance.getPublicKey(),
    instance.getPublicParams(2048)
  );

  throwIfAborted();

  return instance;
};

