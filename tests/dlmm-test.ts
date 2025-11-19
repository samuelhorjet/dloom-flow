import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import {
  DloomFlow,
  DlmmPoolCreated,
  DlmmPositionOpened,
  DlmmLiquidityUpdate,
  DlmmSwapResult,
  DlmmPositionBurned,
  DlmmLiquidityModified,
} from "../target/types/dloom";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { expect } from "chai";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import * as fs from "fs";

chai.use(chaiAsPromised);

// Helper function to load a Keypair from a JSON file
const loadKeypairFromFile = (filepath: string): Keypair => {
  const secretKeyString = fs.readFileSync(filepath, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
};

describe("dloom_flow DLMM Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.DloomFlow as Program<DloomFlow>;
  const connection = provider.connection;

  // Constants
  const BIN_STEP = 20; // Represents 0.2%
  const FEE_RATE = 30; // 0.3%
  const PROTOCOL_FEE_SHARE = 1500; // 15%
  const REFERRER_FEE_SHARE = 500; // 5%
  const INITIAL_BIN_ID = 0;
  const BASIS_POINT_MAX = 10000;

  // Wallets
  const user = loadKeypairFromFile("./test-wallets/user.json");
  const referrer = loadKeypairFromFile("./test-wallets/referrer.json");

  // Mints
  let mintA: PublicKey;
  let mintB: PublicKey;

  // User Token Accounts
  let userTokenA: PublicKey;
  let userTokenB: PublicKey;
  let referrerTokenB: PublicKey; // For B->A swap referral

  // PDAs
  let dlmmParamsPda: PublicKey;
  let dlmmPoolPda: PublicKey;
  let tokenAVaultPda: PublicKey;
  let tokenBVaultPda: PublicKey;
  let protocolFeeVaultAPda: PublicKey;
  let protocolFeeVaultBPda: PublicKey;
  let transactionBinsPda: PublicKey;

  // Dynamic keys
  let positionOneMint: Keypair;
  let positionOnePda: PublicKey;
  let positionTwoMint: Keypair;
  let positionTwoPda: PublicKey;

  // Helper to create a mint
  const createMintHelper = async (): Promise<PublicKey> => {
    return await createMint(connection, user, user.publicKey, null, 6);
  };

  // Helper to create ATA and mint tokens
  const createUserAndAssociatedWallet = async (
    mint: PublicKey,
    owner: Keypair,
    amount: bigint
  ): Promise<PublicKey> => {
    const ata = getAssociatedTokenAddressSync(mint, owner.publicKey);
    const tx = new anchor.web3.Transaction().add(
      createAssociatedTokenAccountInstruction(
        user.publicKey, // Payer
        ata,
        owner.publicKey,
        mint
      )
    );
    await provider.sendAndConfirm(tx, [user]);
    if (amount > 0) {
      await mintTo(connection, user, mint, ata, user, amount);
    }
    return ata;
  };

  before(async () => {
    console.log(`User Wallet: ${user.publicKey.toBase58()}`);

    // Airdrop SOL if needed
    const userBalance = await connection.getBalance(user.publicKey);
    if (userBalance < 2 * LAMPORTS_PER_SOL) {
      await connection.requestAirdrop(user.publicKey, 2 * LAMPORTS_PER_SOL);
    }

    // Create Mints
    const mints = await Promise.all([createMintHelper(), createMintHelper()]);
    mints.sort((a, b) => a.toBuffer().compare(b.toBuffer()));
    [mintA, mintB] = mints;
    console.log(`Token A Mint: ${mintA.toBase58()}`);
    console.log(`Token B Mint: ${mintB.toBase58()}`);

    // Create Token Accounts
    [userTokenA, userTokenB, referrerTokenB] = await Promise.all([
      createUserAndAssociatedWallet(mintA, user, 5000n * 1000000n),
      createUserAndAssociatedWallet(mintB, user, 5000n * 1000000n),
      createUserAndAssociatedWallet(mintB, referrer, 0n),
    ]);
  });

  describe("DLMM Setup and Pool Creation", () => {
    it("Initializes DLMM parameters", async () => {
      [dlmmParamsPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("dlmm_parameters")],
        program.programId
      );

      const officialParams = [{ binStep: BIN_STEP, feeRate: FEE_RATE }];
      const communityParams = [{ binStep: BIN_STEP, feeRate: FEE_RATE }];

      await program.methods
        .initializeDlmmParameters(officialParams, communityParams)
        .accounts({
          dlmmParameters: dlmmParamsPda,
          authority: user.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();

      const paramsAccount = await program.account.dlmmParameters.fetch(
        dlmmParamsPda
      );
      expect(paramsAccount.authority.equals(user.publicKey)).to.be.true;
      expect(paramsAccount.communityParameters[0].binStep).to.equal(BIN_STEP);
    });

    it("Creates a new Community DLMM pool", async () => {
      [dlmmPoolPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("dlmm_pool"),
          mintA.toBuffer(),
          mintB.toBuffer(),
          new BN(BIN_STEP).toBuffer("le", 2),
        ],
        program.programId
      );
      [tokenAVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), dlmmPoolPda.toBuffer(), mintA.toBuffer()],
        program.programId
      );
      [tokenBVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), dlmmPoolPda.toBuffer(), mintB.toBuffer()],
        program.programId
      );
       [protocolFeeVaultAPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("protocol_fee_vault"), dlmmPoolPda.toBuffer(), mintA.toBuffer()],
        program.programId
      );
       [protocolFeeVaultBPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("protocol_fee_vault"), dlmmPoolPda.toBuffer(), mintB.toBuffer()],
        program.programId
      );


      const listener = program.addEventListener(
        "dlmmPoolCreated",
        (event: DlmmPoolCreated) => {
          expect(event.poolAddress.equals(dlmmPoolPda)).to.be.true;
          expect(event.binStep).to.equal(BIN_STEP);
        }
      );

      await program.methods
        .createDlmmCommunityPool(
          BIN_STEP,
          FEE_RATE,
          PROTOCOL_FEE_SHARE,
          REFERRER_FEE_SHARE,
          INITIAL_BIN_ID
        )
        .accounts({
          payer: user.publicKey,
          authority: user.publicKey,
          dlmmParameters: dlmmParamsPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          dlmmPool: dlmmPoolPda,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          protocolFeeVaultA: protocolFeeVaultAPda,
          protocolFeeVaultB: protocolFeeVaultBPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      const poolAccount = await program.account.dlmmPool.fetch(dlmmPoolPda);
      expect(poolAccount.binStep).to.equal(BIN_STEP);
      expect(poolAccount.activeBinId).to.equal(INITIAL_BIN_ID);

      program.removeEventListener(listener);
    });

     it("Fails to create a pool with non-whitelisted parameters", async () => {
        const invalidBinStep = 999;
        const tempDlmmPoolPda = PublicKey.findProgramAddressSync(
        [
          Buffer.from("dlmm_pool"),
          mintA.toBuffer(),
          mintB.toBuffer(),
          new BN(invalidBinStep).toBuffer("le", 2),
        ],
        program.programId
      )[0];

        await expect(
             program.methods
            .createDlmmCommunityPool(
            invalidBinStep,
            FEE_RATE,
            PROTOCOL_FEE_SHARE,
            REFERRER_FEE_SHARE,
            INITIAL_BIN_ID
            )
            .accountsPartial({
                payer: user.publicKey,
                dlmmParameters: dlmmParamsPda,
                tokenAMint: mintA,
                tokenBMint: mintB,
                dlmmPool: tempDlmmPoolPda,
            })
            .signers([user])
            .rpc()
        ).to.be.rejectedWith(/InvalidParameters/);
    });
  });

  describe("Position and Liquidity Management", () => {
    const lowerBinId = -100; // -10% from center
    const upperBinId = 100;  // +10% from center

    it("Opens a new position", async () => {
      positionOneMint = Keypair.generate();
      [positionOnePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("position"), positionOneMint.publicKey.toBuffer()],
        program.programId
      );

      const listener = program.addEventListener("dlmmPositionOpened", (event: DlmmPositionOpened) => {
          expect(event.owner.equals(user.publicKey)).to.be.true;
          expect(event.positionAddress.equals(positionOnePda)).to.be.true;
          expect(event.lowerBinId).to.equal(lowerBinId);
      });

      // Metaplex PDAs
      const metadataPda = PublicKey.findProgramAddressSync(
          [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), positionOneMint.publicKey.toBuffer()],
          new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
      )[0];
      const masterEditionPda = PublicKey.findProgramAddressSync(
          [Buffer.from("metadata"), new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s").toBuffer(), positionOneMint.publicKey.toBuffer(), Buffer.from("edition")],
           new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")
      )[0];

      await program.methods.dlmmOpenPosition(lowerBinId, upperBinId)
        .accounts({
            owner: user.publicKey,
            dlmmPool: dlmmPoolPda,
            position: positionOnePda,
            positionMint: positionOneMint.publicKey,
            metadataAccount: metadataPda,
            masterEditionAccount: masterEditionPda,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenMetadataProgram: new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"),
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user, positionOneMint])
        .rpc();

        const positionAccount = await program.account.position.fetch(positionOnePda);
        expect(positionAccount.owner.equals(user.publicKey)).to.be.true;
        expect(positionAccount.liquidity.eqn(0)).to.be.true;

        program.removeEventListener(listener);
    });

    it("Adds liquidity to the position", async () => {
      const startBinId = -20;
      const binCount = 3; // Add to bins -20, 0, 20
      const liquidityPerBin = new BN(10 * 10 ** 12); // High precision amount

      // 1. Get the list of bin PDAs we will interact with
      const binPubkeys: PublicKey[] = [];
      const binAccountMetas: anchor.web3.AccountMeta[] = [];
      const createBinInstructions = [];

      for (let i = 0; i < binCount; i++) {
          const binId = startBinId + (i * BIN_STEP);
          const [binPda] = PublicKey.findProgramAddressSync(
              [Buffer.from("bin"), dlmmPoolPda.toBuffer(), new BN(binId).toBuffer("le", 4)],
              program.programId
          );
          binPubkeys.push(binPda);
          binAccountMetas.push({ pubkey: binPda, isSigner: false, isWritable: true });

          // Check if bin exists, if not, create it.
          const binInfo = await connection.getAccountInfo(binPda);
          if (binInfo === null) {
              console.log(`Creating bin account for ID: ${binId}`);
              const ix = await program.account.bin.createInstruction(Keypair.generate(), 8 + 16 + 16 + 16); // Manually calculate space
               // This is a workaround as Anchor doesn't have a built-in way to init zero-copy accounts
              const initIx = SystemProgram.createAccount({
                    fromPubkey: user.publicKey,
                    newAccountPubkey: binPda,
                    lamports: await connection.getMinimumBalanceForRentExemption(8 + 3 * 16),
                    space: 8 + 3 * 16,
                    programId: program.programId,
                });
              createBinInstructions.push(initIx);
          }
      }
      
      if (createBinInstructions.length > 0) {
          const tx = new Transaction().add(...createBinInstructions);
          await provider.sendAndConfirm(tx, [user]);
      }


      // 2. Setup the TransactionBins account
      [transactionBinsPda] = PublicKey.findProgramAddressSync(
          [Buffer.from("transaction_bins"), user.publicKey.toBuffer()],
          program.programId
      );

      await program.methods.setupBins(binPubkeys)
          .accounts({
              owner: user.publicKey,
              transactionBins: transactionBinsPda,
              systemProgram: SystemProgram.programId,
          })
          .signers([user])
          .rpc();
      
      const listener = program.addEventListener("dlmmLiquidityUpdate", (event: DlmmLiquidityUpdate) => {
          expect(event.positionAddress.equals(positionOnePda)).to.be.true;
          expect(event.liquidityAdded.gt(new BN(0))).to.be.true;
      });

      // 3. Add Liquidity
      await program.methods.dlmmAddLiquidity(startBinId, liquidityPerBin)
        .accounts({
            owner: user.publicKey,
            dlmmPool: dlmmPoolPda,
            position: positionOnePda,
            transactionBins: transactionBinsPda,
            tokenAMint: mintA,
            tokenBMint: mintB,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            tokenAVault: tokenAVaultPda,
            tokenBVault: tokenBVaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(binAccountMetas)
        .signers([user])
        .rpc();

        const position = await program.account.position.fetch(positionOnePda);
        const expectedTotalLiq = liquidityPerBin.mul(new BN(binCount));
        expect(position.liquidity.eq(expectedTotalLiq)).to.be.true;

        program.removeEventListener(listener);
    });

    it("Removes some liquidity from the position", async() => {
        const liquidityToRemove = new BN(5 * 10 ** 12); // Remove half from one bin

        const binPubkeys: PublicKey[] = [];
        const binAccountMetas: anchor.web3.AccountMeta[] = [];
        const startBinId = -20;
        const binCount = 3;
         for (let i = 0; i < binCount; i++) {
            const binId = startBinId + (i * BIN_STEP);
            const [binPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bin"), dlmmPoolPda.toBuffer(), new BN(binId).toBuffer("le", 4)],
                program.programId
            );
            binPubkeys.push(binPda);
            binAccountMetas.push({ pubkey: binPda, isSigner: false, isWritable: true });
        }
         await program.methods.setupBins(binPubkeys)
            .accounts({
                owner: user.publicKey,
                transactionBins: transactionBinsPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([user])
            .rpc();

        const positionBefore = await program.account.position.fetch(positionOnePda);
        const userABefore = await getAccount(connection, userTokenA);

        await program.methods.dlmmRemoveLiquidity(liquidityToRemove, new BN(1), new BN(1))
         .accounts({
            owner: user.publicKey,
            dlmmPool: dlmmPoolPda,
            position: positionOnePda,
            transactionBins: transactionBinsPda,
            tokenAMint: mintA,
            tokenBMint: mintB,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            tokenAVault: tokenAVaultPda,
            tokenBVault: tokenBVaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
        })
        .remainingAccounts(binAccountMetas)
        .signers([user])
        .rpc();

        const positionAfter = await program.account.position.fetch(positionOnePda);
        const userAAfter = await getAccount(connection, userTokenA);

        expect(positionAfter.liquidity.lt(positionBefore.liquidity)).to.be.true;
        expect(userAAfter.amount > userABefore.amount).to.be.true;
    });

  });

  describe("DLMM Swapping and Fees", () => {
    it("Performs a swap (A to B) crossing one bin", async () => {
        const amountIn = new BN(1 * 10**6); // 1 token A
        const minAmountOut = new BN(1);
        
        const binIdZero = 0;
        const [binZeroPda] = PublicKey.findProgramAddressSync(
            [Buffer.from("bin"), dlmmPoolPda.toBuffer(), new BN(binIdZero).toBuffer("le", 4)],
            program.programId
        );

        await program.methods.setupBins([binZeroPda])
             .accounts({
                owner: user.publicKey,
                transactionBins: transactionBinsPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([user])
            .rpc();
        
        const poolBefore = await program.account.dlmmPool.fetch(dlmmPoolPda);
        const userBBefore = await getAccount(connection, userTokenB);

        const listener = program.addEventListener("dlmmSwapResult", (event: DlmmSwapResult) => {
            expect(event.trader.equals(user.publicKey)).to.be.true;
            expect(event.finalActiveBinId).to.be.lessThan(poolBefore.activeBinId);
        });
        
        await program.methods.dlmmSwap(amountIn, minAmountOut)
            .accounts({
                owner: user.publicKey,
                dlmmPool: dlmmPoolPda,
                transactionBins: transactionBinsPda,
                tokenAMint: mintA,
                tokenBMint: mintB,
                userSourceTokenAccount: userTokenA,
                userDestinationTokenAccount: userTokenB,
                tokenAVault: tokenAVaultPda,
                tokenBVault: tokenBVaultPda,
                protocolFeeVaultA: protocolFeeVaultAPda,
                protocolFeeVaultB: protocolFeeVaultBPda,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .remainingAccounts([{ pubkey: binZeroPda, isSigner: false, isWritable: true }])
            .signers([user])
            .rpc();

        const poolAfter = await program.account.dlmmPool.fetch(dlmmPoolPda);
        const userBAfter = await getAccount(connection, userTokenB);
        
        expect(poolAfter.activeBinId).to.equal(-1); // Should cross the bin
        expect(userBAfter.amount > userBBefore.amount).to.be.true;

        program.removeEventListener(listener);
    });

     it("Claims fees upon final liquidity removal", async () => {
        const positionBefore = await program.account.position.fetch(positionOnePda);
        const liquidityToRemove = positionBefore.liquidity;
        
        const binPubkeys: PublicKey[] = [];
        const binAccountMetas: anchor.web3.AccountMeta[] = [];
        const startBinId = -20;
        const binCount = 3;
         for (let i = 0; i < binCount; i++) {
            const binId = startBinId + (i * BIN_STEP);
            const [binPda] = PublicKey.findProgramAddressSync(
                [Buffer.from("bin"), dlmmPoolPda.toBuffer(), new BN(binId).toBuffer("le", 4)],
                program.programId
            );
            binPubkeys.push(binPda);
            binAccountMetas.push({ pubkey: binPda, isSigner: false, isWritable: true });
        }
         await program.methods.setupBins(binPubkeys)
            .accounts({
                owner: user.publicKey,
                transactionBins: transactionBinsPda,
                systemProgram: SystemProgram.programId,
            })
            .signers([user])
            .rpc();

        await program.methods.dlmmRemoveLiquidity(liquidityToRemove, new BN(1), new BN(1))
         .accountsPartial({
            owner: user.publicKey,
            dlmmPool: dlmmPoolPda,
            position: positionOnePda,
            transactionBins: transactionBinsPda,
         })
        .remainingAccounts(binAccountMetas)
        .signers([user])
        .rpc();

        const positionAfter = await program.account.position.fetch(positionOnePda);
        expect(positionAfter.liquidity.eqn(0)).to.be.true;
     });

  });

   describe("Position Closing", () => {
    it("Burns an empty position NFT", async () => {
        const positionNftAccount = getAssociatedTokenAddressSync(positionOneMint.publicKey, user.publicKey);
        const listener = program.addEventListener("dlmmPositionBurned", (event: DlmmPositionBurned) => {
            expect(event.positionAddress.equals(positionOnePda)).to.be.true;
        });

        await program.methods.dlmmBurnEmptyPosition()
            .accounts({
                owner: user.publicKey,
                position: positionOnePda,
                positionMint: positionOneMint.publicKey,
                userPositionNftAccount: positionNftAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
            })
            .signers([user])
            .rpc();

        // Check that the position account has been closed
        const closedAccountInfo = await connection.getAccountInfo(positionOnePda);
        expect(closedAccountInfo).to.be.null;

        program.removeEventListener(listener);
    });
   });

});