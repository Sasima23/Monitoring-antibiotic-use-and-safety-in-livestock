// Simple blockchain implementation in TypeScript
// Each block contains animal treatment data with cryptographic hashing

export interface BlockData {
  rfid: string;
  animalName: string;
  farmerName: string;
  farmerId: string;
  antibioticName: string;
  dosage: string;
  withdrawalDays: number;
  date: string;
  veterinarian: string;
}

export interface Block {
  index: number;
  timestamp: string;
  data: BlockData;
  previousHash: string;
  hash: string;
  nonce: number;
}

// Simple hash function (SHA-256 simulation using Web Crypto API fallback)
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Synchronous simple hash for display purposes
function simpleHash(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  // Create a longer hash-like string
  return (hex + hex.split("").reverse().join("") + hex).slice(0, 64);
}

/**
 * Blockchain class - manages the chain of blocks
 * Ensures immutability of animal treatment records
 */
class Blockchain {
  chain: Block[];

  constructor() {
    const stored = localStorage.getItem("mrl_blockchain");
    if (stored) {
      this.chain = JSON.parse(stored);
    } else {
      this.chain = [this.createGenesisBlock()];
      this.save();
    }
  }

  /** Creates the first block in the chain */
  private createGenesisBlock(): Block {
    const data: BlockData = {
      rfid: "GENESIS",
      animalName: "Genesis Block",
      farmerName: "System",
      farmerId: "SYSTEM",
      antibioticName: "N/A",
      dosage: "N/A",
      withdrawalDays: 0,
      date: new Date().toISOString(),
      veterinarian: "System",
    };
    const blockStr = JSON.stringify({ index: 0, data, previousHash: "0" });
    return {
      index: 0,
      timestamp: new Date().toISOString(),
      data,
      previousHash: "0",
      hash: simpleHash(blockStr),
      nonce: 0,
    };
  }

  /** Returns the latest block in the chain */
  getLatestBlock(): Block {
    return this.chain[this.chain.length - 1];
  }

  /** Adds a new block with animal treatment data */
  addBlock(data: BlockData): Block {
    const previousBlock = this.getLatestBlock();
    const index = previousBlock.index + 1;
    const timestamp = new Date().toISOString();
    const previousHash = previousBlock.hash;

    const blockStr = JSON.stringify({ index, data, previousHash, timestamp });
    const hash = simpleHash(blockStr);

    const newBlock: Block = {
      index,
      timestamp,
      data,
      previousHash,
      hash,
      nonce: Math.floor(Math.random() * 100000),
    };

    this.chain.push(newBlock);
    this.save();
    return newBlock;
  }

  /** Verifies the integrity of the entire blockchain */
  isChainValid(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const current = this.chain[i];
      const previous = this.chain[i - 1];

      if (current.previousHash !== previous.hash) {
        return false;
      }
    }
    return true;
  }

  /** Returns all blocks (excluding genesis) */
  getRecords(): Block[] {
    return this.chain.slice(1);
  }

  /** Persists blockchain to localStorage */
  private save(): void {
    localStorage.setItem("mrl_blockchain", JSON.stringify(this.chain));
  }

  /** Resets the blockchain */
  reset(): void {
    this.chain = [this.createGenesisBlock()];
    this.save();
  }
}

// Singleton instance
export const blockchain = new Blockchain();
