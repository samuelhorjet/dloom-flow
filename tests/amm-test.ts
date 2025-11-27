// FILE: tests/amm-test.ts

import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
// Import the main program type and the specific event types
import {
  DloomFlow,
  AmmPoolCreated,
  AmmLiquidityAdded,
  AmmSwap,
  AmmFeesClaimed,
  AmmLiquidityRemoved,
} from "../target/types/dloom";
import {
  getAssociatedTokenAddressSync,
  createAssociatedTokenAccountInstruction,
  createMint,
  mintTo,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
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

// Helper function to sleep for a specified duration
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("dloom_flow AMM Tests", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.DloomFlow as Program<DloomFlow>;
  const connection = provider.connection;

  // Constants
  const BASIS_POINT_MAX = 10000;
  const FEE_RATE = 25; // 0.25%
  const PROTOCOL_FEE_SHARE = 2000; // 20%
  const REFERRER_FEE_SHARE = 1000; // 10%

  // Wallets & Keypairs
  const user = loadKeypairFromFile("./target/test-wallets/user.json");
  const referrer = loadKeypairFromFile("./target/test-wallets/referrer.json");

  // Mints for various token standards
  let mintA_Token: PublicKey;
  let mintB_Token: PublicKey;
  let mintC_T22: PublicKey;
  let mintD_T22: PublicKey;

  // User Token Accounts for the primary mixed pool
  let userTokenA: PublicKey;
  let userTokenB: PublicKey;
  let userLpTokenAccount: PublicKey;
  let referrerTokenA: PublicKey;

  // PDAs for the primary mixed pool
  let ammPoolPda: PublicKey;
  let lpMintPda: PublicKey;
  let tokenAVaultPda: PublicKey;
  let tokenBVaultPda: PublicKey;
  let protocolFeeVaultAPda: PublicKey;
  let protocolFeeVaultBPda: PublicKey;
  let userPositionPda: PublicKey;

  // Details of the mixed pool used for most tests
  let mintA: PublicKey;
  let mintB: PublicKey;
  let tokenAProgram: PublicKey;
  let tokenBProgram: PublicKey;

  // Helper to create a mint with a specific token program
  const createMintHelper = async (
    tokenProgramId: PublicKey
  ): Promise<PublicKey> => {
    return await createMint(
      connection,
      user,
      user.publicKey,
      null,
      6,
      undefined,
      undefined,
      tokenProgramId
    );
  };

  // Helper to create an ATA for a specific token program
  const createUserAndAssociatedWallet = async (
    mint: PublicKey,
    owner: Keypair,
    amount: bigint,
    tokenProgramId: PublicKey
  ): Promise<PublicKey> => {
    const ata = getAssociatedTokenAddressSync(
      mint,
      owner.publicKey,
      false,
      tokenProgramId
    );
    const tx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        user.publicKey,
        ata,
        owner.publicKey,
        mint,
        tokenProgramId
      )
    );
    await provider.sendAndConfirm(tx, [user]);
    if (amount > 0) {
      await mintTo(
        connection,
        user,
        mint,
        ata,
        user,
        amount,
        [],
        undefined,
        tokenProgramId
      );
    }
    return ata;
  };

  before(async () => {
    console.log(
      `User Wallet (Payer & Authority): ${user.publicKey.toBase58()}`
    );
    console.log(`Referrer Wallet: ${referrer.publicKey.toBase58()}`);

    for (const kp of [user, referrer]) {
      const balance = await connection.getBalance(kp.publicKey);
      if (balance < 1 * LAMPORTS_PER_SOL) {
        await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
        console.log(`Airdropped 2 SOL to ${kp.publicKey.toBase58()}`);
      }
    }

    // Create mints for all test cases
    [mintA_Token, mintB_Token] = await Promise.all([
      createMintHelper(TOKEN_PROGRAM_ID),
      createMintHelper(TOKEN_PROGRAM_ID),
    ]);
    [mintC_T22, mintD_T22] = await Promise.all([
      createMintHelper(TOKEN_2022_PROGRAM_ID),
      createMintHelper(TOKEN_2022_PROGRAM_ID),
    ]);
  });

  describe("Pool Creation Logic", () => {
    it("Creates a new AMM pool (Token / Token)", async () => {
      const [mint1, mint2] = [mintA_Token, mintB_Token].sort((a, b) =>
        a.toBuffer().compare(b.toBuffer())
      );
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("amm_pool"), mint1.toBuffer(), mint2.toBuffer()],
        program.programId
      );

      await program.methods
        .createAmmPool(FEE_RATE, PROTOCOL_FEE_SHARE, REFERRER_FEE_SHARE)
        .accounts({
          payer: user.publicKey,
          authority: user.publicKey,
          tokenAMint: mint1,
          tokenBMint: mint2,
          ammPool: poolPda,
          tokenAProgram: TOKEN_PROGRAM_ID,
          tokenBProgram: TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      const poolAccount = await program.account.ammPool.fetch(poolPda);
      expect(poolAccount.authority.equals(user.publicKey)).to.be.true;
    });

    it("Creates a new AMM pool (Token-2022 / Token-2022)", async () => {
      const [mint1, mint2] = [mintC_T22, mintD_T22].sort((a, b) =>
        a.toBuffer().compare(b.toBuffer())
      );
      const [poolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("amm_pool"), mint1.toBuffer(), mint2.toBuffer()],
        program.programId
      );

      await program.methods
        .createAmmPool(FEE_RATE, PROTOCOL_FEE_SHARE, REFERRER_FEE_SHARE)
        .accounts({
          payer: user.publicKey,
          authority: user.publicKey,
          tokenAMint: mint1,
          tokenBMint: mint2,
          ammPool: poolPda,
          tokenAProgram: TOKEN_2022_PROGRAM_ID,
          tokenBProgram: TOKEN_2022_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      const poolAccount = await program.account.ammPool.fetch(poolPda);
      expect(poolAccount.authority.equals(user.publicKey)).to.be.true;
    });

    it("Creates the primary mixed pool (Token / Token-2022) for subsequent tests", async () => {
      const sortedMints = [
        { mint: mintB_Token, program: TOKEN_PROGRAM_ID },
        { mint: mintD_T22, program: TOKEN_2022_PROGRAM_ID },
      ].sort((a, b) => a.mint.toBuffer().compare(b.mint.toBuffer()));

      mintA = sortedMints[0].mint;
      tokenAProgram = sortedMints[0].program;
      mintB = sortedMints[1].mint;
      tokenBProgram = sortedMints[1].program;

      // Set global PDAs
      [ammPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("amm_pool"), mintA.toBuffer(), mintB.toBuffer()],
        program.programId
      );
      [lpMintPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("lp_mint"), ammPoolPda.toBuffer()],
        program.programId
      );
      [tokenAVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), ammPoolPda.toBuffer(), mintA.toBuffer()],
        program.programId
      );
      [tokenBVaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), ammPoolPda.toBuffer(), mintB.toBuffer()],
        program.programId
      );
      [protocolFeeVaultAPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("protocol_fee_vault"),
          ammPoolPda.toBuffer(),
          mintA.toBuffer(),
        ],
        program.programId
      );
      [protocolFeeVaultBPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("protocol_fee_vault"),
          ammPoolPda.toBuffer(),
          mintB.toBuffer(),
        ],
        program.programId
      );

      const listener = program.addEventListener(
        "ammPoolCreated",
        (event: AmmPoolCreated) => {
          expect(event.poolAddress.equals(ammPoolPda)).to.be.true;
          expect(event.tokenAMint.equals(mintA)).to.be.true;
        }
      );

      await program.methods
        .createAmmPool(FEE_RATE, PROTOCOL_FEE_SHARE, REFERRER_FEE_SHARE)
        .accounts({
          payer: user.publicKey,
          authority: user.publicKey,
          tokenAMint: mintA,
          tokenBMint: mintB,
          ammPool: ammPoolPda,
          lpMint: lpMintPda,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          protocolFeeVaultA: protocolFeeVaultAPda,
          protocolFeeVaultB: protocolFeeVaultBPda,
          systemProgram: SystemProgram.programId,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
          tokenProgram: TOKEN_PROGRAM_ID,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .signers([user])
        .rpc();

      const poolAccount = await program.account.ammPool.fetch(ammPoolPda);
      expect(poolAccount.authority.equals(user.publicKey)).to.be.true;
      program.removeEventListener(listener);
    });

    it("Fails to create a pool with invalid mint order", async () => {
      const [tempPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("amm_pool"), mintB.toBuffer(), mintA.toBuffer()],
        program.programId
      );

      await expect(
        program.methods
          .createAmmPool(FEE_RATE, PROTOCOL_FEE_SHARE, 0)
          .accounts({
            payer: user.publicKey,
            authority: user.publicKey,
            tokenAMint: mintB,
            tokenBMint: mintA,
            ammPool: tempPoolPda,
            tokenAProgram: tokenBProgram,
            tokenBProgram: tokenAProgram,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: anchor.web3.SYSVAR_RENT_PUBKEY,
          })
          .signers([user])
          .rpc()
      ).to.be.rejectedWith(/InvalidMintOrder/);
    });

    it("Fails to create a pool with invalid fee rates", async () => {
      const tempAmmPool = Keypair.generate().publicKey;
      await expect(
        program.methods
          .createAmmPool(BASIS_POINT_MAX + 1, PROTOCOL_FEE_SHARE, 0)
          .accountsPartial({
            payer: user.publicKey,
            authority: user.publicKey,
            tokenAMint: mintA,
            tokenBMint: mintB,
            ammPool: tempAmmPool,
          })
          .signers([user])
          .rpc()
      ).to.be.rejected;
    });
  });

  describe("AMM Operations on Mixed Pool", () => {
    before(async () => {
      expect(mintA).to.exist;
      expect(mintB).to.exist;

      [userTokenA, userTokenB, referrerTokenA] = await Promise.all([
        createUserAndAssociatedWallet(
          mintA,
          user,
          1000n * 1000000n,
          tokenAProgram
        ),
        createUserAndAssociatedWallet(
          mintB,
          user,
          1000n * 1000000n,
          tokenBProgram
        ),
        createUserAndAssociatedWallet(mintA, referrer, 0n, tokenAProgram),
      ]);

      [userPositionPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("amm_position"),
          user.publicKey.toBuffer(),
          ammPoolPda.toBuffer(),
        ],
        program.programId
      );

      await program.methods
        .openAmmPosition({ manualClaim: {} })
        .accounts({
          owner: user.publicKey,
          ammPool: ammPoolPda,
          ammPosition: userPositionPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user])
        .rpc();
    });

    it("Adds initial liquidity", async () => {
      const amountA = new anchor.BN(100 * 10 ** 6);
      const amountB = new anchor.BN(100 * 10 ** 6);
      const minLp = new anchor.BN(99 * 10 ** 6);
      userLpTokenAccount = getAssociatedTokenAddressSync(
        lpMintPda,
        user.publicKey
      );

      const listener = program.addEventListener(
        "ammLiquidityAdded",
        (event: AmmLiquidityAdded) => {
          expect(event.user.equals(user.publicKey)).to.be.true;
          expect(event.lpTokensMinted.gtn(0)).to.be.true;
        }
      );

      const tx = new Transaction().add(
        createAssociatedTokenAccountInstruction(
          user.publicKey,
          userLpTokenAccount,
          user.publicKey,
          lpMintPda
        )
      );
      await provider.sendAndConfirm(tx, [user]);

      await program.methods
        .addAmmLiquidity(amountA, amountB, minLp)
        .accounts({
          owner: user.publicKey,
          ammPool: ammPoolPda,
          ammPosition: userPositionPda,
          lpMint: lpMintPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          userLpTokenAccount: userLpTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const lpAccount = await getAccount(connection, userLpTokenAccount);
      expect(lpAccount.amount > 0n).to.be.true;
      program.removeEventListener(listener);
    });

    it("Fails to add liquidity due to slippage", async () => {
      const amountA = new anchor.BN(10 * 10 ** 6);
      const amountB = new anchor.BN(10 * 10 ** 6);
      const minLpTooHigh = new anchor.BN(100 * 10 ** 6);

      // FIX: Replaced .accountsPartial with a full .accounts call to prevent resolution errors.
      await expect(
        program.methods
          .addAmmLiquidity(amountA, amountB, minLpTooHigh)
          .accounts({
            owner: user.publicKey,
            ammPool: ammPoolPda,
            ammPosition: userPositionPda,
            lpMint: lpMintPda,
            tokenAMint: mintA,
            tokenBMint: mintB,
            tokenAVault: tokenAVaultPda,
            tokenBVault: tokenBVaultPda,
            userTokenAAccount: userTokenA,
            userTokenBAccount: userTokenB,
            userLpTokenAccount: userLpTokenAccount,
            systemProgram: SystemProgram.programId,
            tokenAProgram: tokenAProgram,
            tokenBProgram: tokenBProgram,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          })
          .signers([user])
          .rpc()
      ).to.be.rejectedWith(/SlippageExceeded/);
    });

    it("Performs a swap (A to B)", async () => {
      const amountIn = new anchor.BN(10 * 10 ** 6);
      const minAmountOut = new anchor.BN(1);
      const userBBefore = await getAccount(
        connection,
        userTokenB,
        undefined,
        tokenBProgram
      );

      const listener = program.addEventListener("ammSwap", (event: AmmSwap) => {
        expect(event.trader.equals(user.publicKey)).to.be.true;
        expect(event.inputMint.equals(mintA)).to.be.true;
      });

      await program.methods
        .swapOnAmm(amountIn, minAmountOut)
        .accounts({
          trader: user.publicKey,
          ammPool: ammPoolPda,
          lpMint: lpMintPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          userSourceTokenAccount: userTokenA,
          userDestinationTokenAccount: userTokenB,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          protocolFeeVaultA: protocolFeeVaultAPda,
          protocolFeeVaultB: protocolFeeVaultBPda,
          authority: user.publicKey,
          referrerFeeAccount: null,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
        })
        .signers([user])
        .rpc();

      const userBAfter = await getAccount(
        connection,
        userTokenB,
        undefined,
        tokenBProgram
      );
      expect(userBAfter.amount > userBBefore.amount).to.be.true;
      program.removeEventListener(listener);
    });

    it("Fails to swap due to slippage", async () => {
      const amountIn = new anchor.BN(10 * 10 ** 6);
      const minAmountOutTooHigh = new anchor.BN(100 * 10 ** 6);

      // FIX: Replaced .accountsPartial with a full .accounts call.
      await expect(
        program.methods
          .swapOnAmm(amountIn, minAmountOutTooHigh)
          .accounts({
            trader: user.publicKey,
            ammPool: ammPoolPda,
            lpMint: lpMintPda,
            tokenAMint: mintA,
            tokenBMint: mintB,
            userSourceTokenAccount: userTokenA,
            userDestinationTokenAccount: userTokenB,
            tokenAVault: tokenAVaultPda,
            tokenBVault: tokenBVaultPda,
            protocolFeeVaultA: protocolFeeVaultAPda,
            protocolFeeVaultB: protocolFeeVaultBPda,
            authority: user.publicKey,
            referrerFeeAccount: null,
            tokenAProgram: tokenAProgram,
            tokenBProgram: tokenBProgram,
          })
          .signers([user])
          .rpc()
      ).to.be.rejectedWith(/SlippageExceeded/);
    });

    it("Distributes a referral fee", async () => {
      const referrerBefore = await getAccount(
        connection,
        referrerTokenA,
        undefined,
        tokenAProgram
      );

      // FIX: Replaced .accountsPartial with a full .accounts call.
      await program.methods
        .swapOnAmm(new anchor.BN(5 * 10 ** 6), new anchor.BN(1))
        .accounts({
          trader: user.publicKey,
          ammPool: ammPoolPda,
          lpMint: lpMintPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          userSourceTokenAccount: userTokenA,
          userDestinationTokenAccount: userTokenB,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          protocolFeeVaultA: protocolFeeVaultAPda,
          protocolFeeVaultB: protocolFeeVaultBPda,
          authority: user.publicKey,
          referrerFeeAccount: referrerTokenA,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
        })
        .signers([user])
        .rpc();

      const referrerAfter = await getAccount(
        connection,
        referrerTokenA,
        undefined,
        tokenAProgram
      );
      expect(referrerAfter.amount > referrerBefore.amount).to.be.true;
    });

    it("Manually claims LP fees", async () => {
      // FIX: Use a full .accounts call for the swap that generates fees.
      await program.methods
        .swapOnAmm(new anchor.BN(5 * 10 ** 6), new anchor.BN(1))
        .accounts({
          trader: user.publicKey,
          ammPool: ammPoolPda,
          lpMint: lpMintPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          userSourceTokenAccount: userTokenA,
          userDestinationTokenAccount: userTokenB,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          protocolFeeVaultA: protocolFeeVaultAPda,
          protocolFeeVaultB: protocolFeeVaultBPda,
          authority: user.publicKey,
          referrerFeeAccount: null,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
        })
        .signers([user])
        .rpc();

      const userABefore = await getAccount(
        connection,
        userTokenA,
        undefined,
        tokenAProgram
      );
      const listener = program.addEventListener(
        "ammFeesClaimed",
        (event: AmmFeesClaimed) => {
          expect(event.user.equals(user.publicKey)).to.be.true;
          expect(event.feesClaimedA.gtn(0)).to.be.true;
        }
      );

      await program.methods
        .claimLpFees()
        .accounts({
          owner: user.publicKey,
          ammPool: ammPoolPda,
          ammPosition: userPositionPda,
          lpMint: lpMintPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
        })
        .signers([user])
        .rpc();

      const userAAfter = await getAccount(
        connection,
        userTokenA,
        undefined,
        tokenAProgram
      );
      expect(userAAfter.amount > userABefore.amount).to.be.true;
      program.removeEventListener(listener);
    });

    it("Removes remaining liquidity", async () => {
      const lpAccountBefore = await getAccount(connection, userLpTokenAccount);
      if (lpAccountBefore.amount === 0n) return;

      const lpAmountToBurn = new anchor.BN(lpAccountBefore.amount.toString());
      const userABefore = await getAccount(
        connection,
        userTokenA,
        undefined,
        tokenAProgram
      );

      const listener = program.addEventListener(
        "ammLiquidityRemoved",
        (event: AmmLiquidityRemoved) => {
          expect(event.user.equals(user.publicKey)).to.be.true;
          expect(event.lpTokensBurned.eq(lpAmountToBurn)).to.be.true;
        }
      );

      await program.methods
        .removeAmmLiquidity(lpAmountToBurn, new anchor.BN(1), new anchor.BN(1))
        .accounts({
          owner: user.publicKey,
          ammPool: ammPoolPda,
          ammPosition: userPositionPda,
          lpMint: lpMintPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          userLpTokenAccount: userLpTokenAccount,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const lpAccountAfter = await getAccount(connection, userLpTokenAccount);
      const userAAfter = await getAccount(
        connection,
        userTokenA,
        undefined,
        tokenAProgram
      );

      expect(lpAccountAfter.amount).to.equal(0n);
      expect(userAAfter.amount > userABefore.amount).to.be.true;
      program.removeEventListener(listener);
    });
  });

  describe("Oracle Logic", () => {
    it("Updates oracle cumulative prices after a swap", async () => {
      await program.methods
        .addAmmLiquidity(
          new anchor.BN(50 * 10 ** 6),
          new anchor.BN(50 * 10 ** 6),
          new anchor.BN(1)
        )
        .accounts({
          owner: user.publicKey,
          ammPool: ammPoolPda,
          ammPosition: userPositionPda,
          lpMint: lpMintPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          userTokenAAccount: userTokenA,
          userTokenBAccount: userTokenB,
          userLpTokenAccount: userLpTokenAccount,
          systemProgram: SystemProgram.programId,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        })
        .signers([user])
        .rpc();

      const poolBefore = await program.account.ammPool.fetch(ammPoolPda);
      await sleep(2000); // Wait to ensure a change in timestamp

      // FIX: Replaced .accountsPartial with a full .accounts call.
      await program.methods
        .swapOnAmm(new anchor.BN(1 * 10 ** 6), new anchor.BN(1))
        .accounts({
          trader: user.publicKey,
          ammPool: ammPoolPda,
          lpMint: lpMintPda,
          tokenAMint: mintA,
          tokenBMint: mintB,
          userSourceTokenAccount: userTokenA,
          userDestinationTokenAccount: userTokenB,
          tokenAVault: tokenAVaultPda,
          tokenBVault: tokenBVaultPda,
          protocolFeeVaultA: protocolFeeVaultAPda,
          protocolFeeVaultB: protocolFeeVaultBPda,
          authority: user.publicKey,
          referrerFeeAccount: null,
          tokenAProgram: tokenAProgram,
          tokenBProgram: tokenBProgram,
        })
        .signers([user])
        .rpc();

      const poolAfter = await program.account.ammPool.fetch(ammPoolPda);
      expect(poolAfter.priceACumulative.gt(poolBefore.priceACumulative)).to.be
        .true;
    });
  });
});
