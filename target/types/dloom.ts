import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// This is a reference to the original IDL structure.
export type DloomFlow = {
  address: "8VryDeNca4LCF7ivjQ5mNwMik6ugTtmwfTrg6Qfta23X";
  metadata: {
    name: "dloom_flow";
    version: "0.1.0";
    spec: "0.1.0";
    description: "Created with Anchor";
  };
  instructions: [
    {
      name: "addAmmLiquidity";
      discriminator: [16, 132, 176, 27, 113, 242, 171, 240];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: ["ammPosition", "userTokenAAccount", "userTokenBAccount"];
        },
        {
          name: "ammPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "amm_pool.token_a_mint";
                account: "ammPool";
              },
              {
                kind: "account";
                path: "amm_pool.token_b_mint";
                account: "ammPool";
              }
            ];
          };
        },
        {
          name: "ammPosition";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "account";
                path: "ammPool";
              }
            ];
          };
        },
        {
          name: "lpMint";
          writable: true;
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "tokenAVault";
          writable: true;
        },
        {
          name: "tokenBVault";
          writable: true;
        },
        {
          name: "userTokenAAccount";
          writable: true;
        },
        {
          name: "userTokenBAccount";
          writable: true;
        },
        {
          name: "userLpTokenAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "lpMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        }
      ];
      args: [
        {
          name: "amountADesired";
          type: "u64";
        },
        {
          name: "amountBDesired";
          type: "u64";
        },
        {
          name: "minLpTokensToMint";
          type: "u64";
        }
      ];
    },
    {
      name: "claimLpFees";
      discriminator: [72, 86, 212, 142, 60, 38, 74, 75];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: ["ammPosition", "userTokenAAccount", "userTokenBAccount"];
        },
        {
          name: "ammPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "amm_pool.token_a_mint";
                account: "ammPool";
              },
              {
                kind: "account";
                path: "amm_pool.token_b_mint";
                account: "ammPool";
              }
            ];
          };
        },
        {
          name: "ammPosition";
          writable: true;
        },
        {
          name: "lpMint";
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "tokenAVault";
          writable: true;
        },
        {
          name: "tokenBVault";
          writable: true;
        },
        {
          name: "userTokenAAccount";
          writable: true;
        },
        {
          name: "userTokenBAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [];
    },
    {
      name: "createAmmPool";
      discriminator: [24, 66, 208, 114, 198, 59, 237, 192];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "authority";
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "ammPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "tokenAMint";
              },
              {
                kind: "account";
                path: "tokenBMint";
              }
            ];
          };
        },
        {
          name: "lpMint";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [108, 112, 95, 109, 105, 110, 116];
              },
              {
                kind: "account";
                path: "ammPool";
              }
            ];
          };
        },
        {
          name: "tokenAVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "ammPool";
              },
              {
                kind: "account";
                path: "tokenAMint";
              }
            ];
          };
        },
        {
          name: "tokenBVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "ammPool";
              },
              {
                kind: "account";
                path: "tokenBMint";
              }
            ];
          };
        },
        {
          name: "protocolFeeVaultA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "ammPool";
              },
              {
                kind: "account";
                path: "tokenAMint";
              }
            ];
          };
        },
        {
          name: "protocolFeeVaultB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "ammPool";
              },
              {
                kind: "account";
                path: "tokenBMint";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "feeRate";
          type: "u16";
        },
        {
          name: "protocolFeeShare";
          type: "u16";
        },
        {
          name: "referrerFeeShare";
          type: "u16";
        }
      ];
    },
    {
      name: "createDlmmCommunityPool";
      discriminator: [214, 140, 125, 54, 100, 148, 97, 105];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "authority";
        },
        {
          name: "dlmmParameters";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  100,
                  108,
                  109,
                  109,
                  95,
                  112,
                  97,
                  114,
                  97,
                  109,
                  101,
                  116,
                  101,
                  114,
                  115
                ];
              }
            ];
          };
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "dlmmPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 108, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "tokenAMint";
              },
              {
                kind: "account";
                path: "tokenBMint";
              },
              {
                kind: "arg";
                path: "binStep";
              }
            ];
          };
        },
        {
          name: "tokenAVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "dlmmPool";
              },
              {
                kind: "account";
                path: "tokenAMint";
              }
            ];
          };
        },
        {
          name: "tokenBVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "dlmmPool";
              },
              {
                kind: "account";
                path: "tokenBMint";
              }
            ];
          };
        },
        {
          name: "protocolFeeVaultA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "dlmmPool";
              },
              {
                kind: "account";
                path: "tokenAMint";
              }
            ];
          };
        },
        {
          name: "protocolFeeVaultB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "dlmmPool";
              },
              {
                kind: "account";
                path: "tokenBMint";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "binStep";
          type: "u16";
        },
        {
          name: "feeRate";
          type: "u16";
        },
        {
          name: "protocolFeeShare";
          type: "u16";
        },
        {
          name: "referrerFeeShare";
          type: "u16";
        },
        {
          name: "initialBinId";
          type: "i32";
        }
      ];
    },
    {
      name: "createDlmmPool";
      discriminator: [179, 32, 226, 218, 182, 118, 23, 42];
      accounts: [
        {
          name: "payer";
          writable: true;
          signer: true;
        },
        {
          name: "authority";
          signer: true;
          relations: ["protocolConfig"];
        },
        {
          name: "protocolConfig";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ];
              }
            ];
          };
        },
        {
          name: "dlmmParameters";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  100,
                  108,
                  109,
                  109,
                  95,
                  112,
                  97,
                  114,
                  97,
                  109,
                  101,
                  116,
                  101,
                  114,
                  115
                ];
              }
            ];
          };
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "dlmmPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 108, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "tokenAMint";
              },
              {
                kind: "account";
                path: "tokenBMint";
              },
              {
                kind: "arg";
                path: "binStep";
              }
            ];
          };
        },
        {
          name: "tokenAVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "dlmmPool";
              },
              {
                kind: "account";
                path: "tokenAMint";
              }
            ];
          };
        },
        {
          name: "tokenBVault";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [118, 97, 117, 108, 116];
              },
              {
                kind: "account";
                path: "dlmmPool";
              },
              {
                kind: "account";
                path: "tokenBMint";
              }
            ];
          };
        },
        {
          name: "protocolFeeVaultA";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "dlmmPool";
              },
              {
                kind: "account";
                path: "tokenAMint";
              }
            ];
          };
        },
        {
          name: "protocolFeeVaultB";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  102,
                  101,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ];
              },
              {
                kind: "account";
                path: "dlmmPool";
              },
              {
                kind: "account";
                path: "tokenBMint";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "binStep";
          type: "u16";
        },
        {
          name: "feeRate";
          type: "u16";
        },
        {
          name: "protocolFeeShare";
          type: "u16";
        },
        {
          name: "referrerFeeShare";
          type: "u16";
        },
        {
          name: "initialBinId";
          type: "i32";
        }
      ];
    },
    {
      name: "dlmmAddLiquidity";
      discriminator: [107, 95, 217, 93, 54, 116, 29, 166];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: [
            "position",
            "transactionBins",
            "userTokenAAccount",
            "userTokenBAccount"
          ];
        },
        {
          name: "dlmmPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 108, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "dlmm_pool.token_a_mint";
                account: "dlmmPool";
              },
              {
                kind: "account";
                path: "dlmm_pool.token_b_mint";
                account: "dlmmPool";
              },
              {
                kind: "account";
                path: "dlmm_pool.bin_step";
                account: "dlmmPool";
              }
            ];
          };
        },
        {
          name: "position";
          writable: true;
        },
        {
          name: "transactionBins";
          docs: [
            "The temporary account that holds the pubkeys of the bins being modified."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  116,
                  114,
                  97,
                  110,
                  115,
                  97,
                  99,
                  116,
                  105,
                  111,
                  110,
                  95,
                  98,
                  105,
                  110,
                  115
                ];
              },
              {
                kind: "account";
                path: "owner";
              }
            ];
          };
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "userTokenAAccount";
          writable: true;
        },
        {
          name: "userTokenBAccount";
          writable: true;
        },
        {
          name: "tokenAVault";
          writable: true;
        },
        {
          name: "tokenBVault";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "startBinId";
          type: "i32";
        },
        {
          name: "liquidityPerBin";
          type: "u128";
        }
      ];
    },
    {
      name: "dlmmBurnEmptyPosition";
      discriminator: [48, 110, 167, 53, 22, 136, 160, 117];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: ["position", "userPositionNftAccount"];
        },
        {
          name: "position";
          writable: true;
        },
        {
          name: "positionMint";
          writable: true;
        },
        {
          name: "userPositionNftAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [];
    },
    {
      name: "dlmmModifyLiquidity";
      discriminator: [172, 116, 107, 104, 20, 51, 199, 13];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: [
            "oldPosition",
            "newPosition",
            "transactionBins",
            "userTokenAAccount",
            "userTokenBAccount"
          ];
        },
        {
          name: "dlmmPool";
          writable: true;
        },
        {
          name: "oldPosition";
          writable: true;
        },
        {
          name: "newPosition";
          writable: true;
        },
        {
          name: "transactionBins";
          docs: [
            "The temporary account holding the pubkeys of all bins for both old and new positions."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  116,
                  114,
                  97,
                  110,
                  115,
                  97,
                  99,
                  116,
                  105,
                  111,
                  110,
                  95,
                  98,
                  105,
                  110,
                  115
                ];
              },
              {
                kind: "account";
                path: "owner";
              }
            ];
          };
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "userTokenAAccount";
          writable: true;
        },
        {
          name: "userTokenBAccount";
          writable: true;
        },
        {
          name: "tokenAVault";
          writable: true;
        },
        {
          name: "tokenBVault";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "minSurplusAOut";
          type: "u64";
        },
        {
          name: "minSurplusBOut";
          type: "u64";
        }
      ];
    },
    {
      name: "dlmmOpenPosition";
      discriminator: [232, 71, 108, 254, 20, 136, 242, 52];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "dlmmPool";
        },
        {
          name: "position";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [112, 111, 115, 105, 116, 105, 111, 110];
              },
              {
                kind: "account";
                path: "positionMint";
              }
            ];
          };
        },
        {
          name: "positionMint";
          writable: true;
          signer: true;
        },
        {
          name: "userPositionNftAccount";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "const";
                value: [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ];
              },
              {
                kind: "account";
                path: "positionMint";
              }
            ];
            program: {
              kind: "const";
              value: [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ];
            };
          };
        },
        {
          name: "metadataAccount";
          writable: true;
        },
        {
          name: "masterEditionAccount";
          writable: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        },
        {
          name: "tokenProgram";
        },
        {
          name: "associatedTokenProgram";
          address: "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL";
        },
        {
          name: "tokenMetadataProgram";
          address: "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s";
        },
        {
          name: "rent";
          address: "SysvarRent111111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "lowerBinId";
          type: "i32";
        },
        {
          name: "upperBinId";
          type: "i32";
        }
      ];
    },
    {
      name: "dlmmRemoveLiquidity";
      discriminator: [7, 218, 255, 144, 171, 241, 218, 122];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: [
            "position",
            "transactionBins",
            "userTokenAAccount",
            "userTokenBAccount"
          ];
        },
        {
          name: "dlmmPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 108, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "dlmm_pool.token_a_mint";
                account: "dlmmPool";
              },
              {
                kind: "account";
                path: "dlmm_pool.token_b_mint";
                account: "dlmmPool";
              },
              {
                kind: "account";
                path: "dlmm_pool.bin_step";
                account: "dlmmPool";
              }
            ];
          };
        },
        {
          name: "position";
          writable: true;
        },
        {
          name: "transactionBins";
          docs: [
            "The temporary account that holds the pubkeys of the bins being read for fee calculations."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  116,
                  114,
                  97,
                  110,
                  115,
                  97,
                  99,
                  116,
                  105,
                  111,
                  110,
                  95,
                  98,
                  105,
                  110,
                  115
                ];
              },
              {
                kind: "account";
                path: "owner";
              }
            ];
          };
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "userTokenAAccount";
          writable: true;
        },
        {
          name: "userTokenBAccount";
          writable: true;
        },
        {
          name: "tokenAVault";
          writable: true;
        },
        {
          name: "tokenBVault";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "liquidityToRemove";
          type: "u128";
        },
        {
          name: "minAmountA";
          type: "u64";
        },
        {
          name: "minAmountB";
          type: "u64";
        }
      ];
    },
    {
      name: "dlmmSwap";
      discriminator: [16, 217, 101, 223, 4, 0, 193, 110];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: [
            "transactionBins",
            "userSourceTokenAccount",
            "userDestinationTokenAccount"
          ];
        },
        {
          name: "dlmmPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [100, 108, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "dlmm_pool.token_a_mint";
                account: "dlmmPool";
              },
              {
                kind: "account";
                path: "dlmm_pool.token_b_mint";
                account: "dlmmPool";
              },
              {
                kind: "account";
                path: "dlmm_pool.bin_step";
                account: "dlmmPool";
              }
            ];
          };
        },
        {
          name: "transactionBins";
          docs: [
            "The temporary account that holds the pubkeys of the bins needed for the swap.",
            "This account is created and closed in the same transaction."
          ];
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  116,
                  114,
                  97,
                  110,
                  115,
                  97,
                  99,
                  116,
                  105,
                  111,
                  110,
                  95,
                  98,
                  105,
                  110,
                  115
                ];
              },
              {
                kind: "account";
                path: "owner";
              }
            ];
          };
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "userSourceTokenAccount";
          writable: true;
        },
        {
          name: "userDestinationTokenAccount";
          writable: true;
        },
        {
          name: "tokenAVault";
          writable: true;
        },
        {
          name: "tokenBVault";
          writable: true;
        },
        {
          name: "protocolFeeVaultA";
          writable: true;
        },
        {
          name: "protocolFeeVaultB";
          writable: true;
        },
        {
          name: "referrerFeeAccount";
          writable: true;
          optional: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "amountIn";
          type: "u64";
        },
        {
          name: "minAmountOut";
          type: "u64";
        }
      ];
    },
    {
      name: "initializeDlmmParameters";
      discriminator: [82, 177, 158, 87, 118, 208, 21, 231];
      accounts: [
        {
          name: "dlmmParameters";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  100,
                  108,
                  109,
                  109,
                  95,
                  112,
                  97,
                  114,
                  97,
                  109,
                  101,
                  116,
                  101,
                  114,
                  115
                ];
              }
            ];
          };
        },
        {
          name: "authority";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "officialParams";
          type: {
            vec: {
              defined: {
                name: "dlmmParameter";
              };
            };
          };
        },
        {
          name: "communityParams";
          type: {
            vec: {
              defined: {
                name: "dlmmParameter";
              };
            };
          };
        }
      ];
    },
    {
      name: "initializeProtocol";
      discriminator: [188, 233, 252, 106, 134, 146, 202, 91];
      accounts: [
        {
          name: "protocolConfig";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ];
              }
            ];
          };
        },
        {
          name: "authority";
          writable: true;
          signer: true;
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [];
    },
    {
      name: "openAmmPosition";
      discriminator: [174, 42, 234, 46, 95, 197, 144, 106];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
        },
        {
          name: "ammPool";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "amm_pool.token_a_mint";
                account: "ammPool";
              },
              {
                kind: "account";
                path: "amm_pool.token_b_mint";
                account: "ammPool";
              }
            ];
          };
        },
        {
          name: "ammPosition";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "account";
                path: "ammPool";
              }
            ];
          };
        },
        {
          name: "systemProgram";
          address: "11111111111111111111111111111111";
        }
      ];
      args: [
        {
          name: "feePreference";
          type: {
            defined: {
              name: "feePreference";
            };
          };
        }
      ];
    },
    {
      name: "reinvestLpFees";
      discriminator: [32, 2, 0, 88, 189, 0, 206, 118];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: ["ammPosition"];
        },
        {
          name: "ammPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "amm_pool.token_a_mint";
                account: "ammPool";
              },
              {
                kind: "account";
                path: "amm_pool.token_b_mint";
                account: "ammPool";
              }
            ];
          };
        },
        {
          name: "ammPosition";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "account";
                path: "ammPool";
              }
            ];
          };
        },
        {
          name: "lpMint";
          writable: true;
        },
        {
          name: "userLpTokenAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [];
    },
    {
      name: "removeAmmLiquidity";
      discriminator: [33, 99, 106, 31, 118, 174, 20, 72];
      accounts: [
        {
          name: "owner";
          writable: true;
          signer: true;
          relations: [
            "ammPosition",
            "userLpTokenAccount",
            "userTokenAAccount",
            "userTokenBAccount"
          ];
        },
        {
          name: "ammPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "amm_pool.token_a_mint";
                account: "ammPool";
              },
              {
                kind: "account";
                path: "amm_pool.token_b_mint";
                account: "ammPool";
              }
            ];
          };
        },
        {
          name: "ammPosition";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "account";
                path: "ammPool";
              }
            ];
          };
        },
        {
          name: "lpMint";
          writable: true;
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "tokenAVault";
          writable: true;
        },
        {
          name: "tokenBVault";
          writable: true;
        },
        {
          name: "userLpTokenAccount";
          writable: true;
        },
        {
          name: "userTokenAAccount";
          writable: true;
        },
        {
          name: "userTokenBAccount";
          writable: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "lpTokensToBurn";
          type: "u64";
        },
        {
          name: "minAmountAToReceive";
          type: "u64";
        },
        {
          name: "minAmountBToReceive";
          type: "u64";
        }
      ];
    },
    {
      name: "swapOnAmm";
      discriminator: [189, 141, 82, 220, 104, 206, 51, 166];
      accounts: [
        {
          name: "trader";
          writable: true;
          signer: true;
        },
        {
          name: "ammPool";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [97, 109, 109, 95, 112, 111, 111, 108];
              },
              {
                kind: "account";
                path: "amm_pool.token_a_mint";
                account: "ammPool";
              },
              {
                kind: "account";
                path: "amm_pool.token_b_mint";
                account: "ammPool";
              }
            ];
          };
        },
        {
          name: "lpMint";
          writable: true;
        },
        {
          name: "tokenAMint";
        },
        {
          name: "tokenBMint";
        },
        {
          name: "userSourceTokenAccount";
          writable: true;
        },
        {
          name: "userDestinationTokenAccount";
          writable: true;
        },
        {
          name: "tokenAVault";
          writable: true;
        },
        {
          name: "tokenBVault";
          writable: true;
        },
        {
          name: "protocolFeeVaultA";
          writable: true;
        },
        {
          name: "protocolFeeVaultB";
          writable: true;
        },
        {
          name: "authority";
        },
        {
          name: "referrerFeeAccount";
          docs: [
            "The client is responsible for passing the correct token account for the input token."
          ];
          writable: true;
          optional: true;
        },
        {
          name: "tokenProgram";
        }
      ];
      args: [
        {
          name: "amountIn";
          type: "u64";
        },
        {
          name: "minAmountOut";
          type: "u64";
        }
      ];
    },
    {
      name: "updateAmmFees";
      discriminator: [206, 176, 100, 42, 92, 237, 128, 175];
      accounts: [
        {
          name: "authority";
          signer: true;
          relations: ["protocolConfig"];
        },
        {
          name: "protocolConfig";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ];
              }
            ];
          };
        },
        {
          name: "ammPool";
          writable: true;
        }
      ];
      args: [
        {
          name: "newFeeRate";
          type: {
            option: "u16";
          };
        }
      ];
    },
    {
      name: "updateDlmmFees";
      discriminator: [108, 63, 173, 147, 84, 230, 130, 119];
      accounts: [
        {
          name: "authority";
          docs: ["The authority must sign for any fee update."];
          signer: true;
          relations: ["protocolConfig"];
        },
        {
          name: "protocolConfig";
          docs: [
            "The protocol config, to verify the signer is the true master authority."
          ];
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ];
              }
            ];
          };
        },
        {
          name: "dlmmPool";
          writable: true;
        }
      ];
      args: [
        {
          name: "newFeeRate";
          type: {
            option: "u16";
          };
        }
      ];
    },
    {
      name: "updateDlmmParameters";
      discriminator: [23, 30, 1, 158, 151, 192, 230, 19];
      accounts: [
        {
          name: "authority";
          signer: true;
          relations: ["protocolConfig", "dlmmParameters"];
        },
        {
          name: "protocolConfig";
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  112,
                  114,
                  111,
                  116,
                  111,
                  99,
                  111,
                  108,
                  95,
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ];
              }
            ];
          };
        },
        {
          name: "dlmmParameters";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  100,
                  108,
                  109,
                  109,
                  95,
                  112,
                  97,
                  114,
                  97,
                  109,
                  101,
                  116,
                  101,
                  114,
                  115
                ];
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "list";
          type: {
            defined: {
              name: "parameterList";
            };
          };
        },
        {
          name: "action";
          type: {
            defined: {
              name: "parameterAction";
            };
          };
        },
        {
          name: "binStep";
          type: "u16";
        },
        {
          name: "feeRate";
          type: "u16";
        }
      ];
    },
    {
      name: "updateFeePreference";
      discriminator: [15, 131, 77, 242, 55, 2, 103, 183];
      accounts: [
        {
          name: "owner";
          signer: true;
          relations: ["ammPosition"];
        },
        {
          name: "ammPool";
        },
        {
          name: "ammPosition";
          writable: true;
          pda: {
            seeds: [
              {
                kind: "const";
                value: [
                  97,
                  109,
                  109,
                  95,
                  112,
                  111,
                  115,
                  105,
                  116,
                  105,
                  111,
                  110
                ];
              },
              {
                kind: "account";
                path: "owner";
              },
              {
                kind: "account";
                path: "ammPool";
              }
            ];
          };
        }
      ];
      args: [
        {
          name: "newPreference";
          type: {
            defined: {
              name: "feePreference";
            };
          };
        }
      ];
    }
  ];
  accounts: [
    {
      name: "ammPool";
      discriminator: [54, 82, 185, 138, 179, 191, 211, 169];
    },
    {
      name: "ammPosition";
      discriminator: [34, 97, 105, 74, 17, 226, 212, 0];
    },
    {
      name: "dlmmParameters";
      discriminator: [247, 51, 235, 110, 201, 150, 166, 30];
    },
    {
      name: "dlmmPool";
      discriminator: [230, 48, 216, 140, 238, 134, 184, 148];
    },
    {
      name: "position";
      discriminator: [170, 188, 143, 228, 122, 64, 247, 208];
    },
    {
      name: "protocolConfig";
      discriminator: [207, 91, 250, 28, 152, 179, 215, 209];
    },
    {
      name: "transactionBins";
      discriminator: [126, 118, 90, 214, 59, 253, 66, 116];
    }
  ];
  events: [
    {
      name: "ammFeesClaimed";
      discriminator: [12, 219, 229, 0, 55, 144, 80, 252];
    },
    {
      name: "ammFeesUpdated";
      discriminator: [110, 217, 20, 48, 137, 212, 60, 171];
    },
    {
      name: "ammLiquidityAdded";
      discriminator: [117, 31, 3, 11, 254, 188, 137, 15];
    },
    {
      name: "ammLiquidityRemoved";
      discriminator: [229, 250, 223, 203, 101, 86, 252, 94];
    },
    {
      name: "ammPoolCreated";
      discriminator: [70, 233, 16, 79, 176, 79, 239, 9];
    },
    {
      name: "ammSwap";
      discriminator: [88, 80, 97, 127, 10, 159, 241, 55];
    },
    {
      name: "dlmmFeesUpdated";
      discriminator: [185, 174, 237, 94, 164, 88, 228, 217];
    },
    {
      name: "dlmmLiquidityModified";
      discriminator: [255, 164, 236, 132, 247, 214, 167, 22];
    },
    {
      name: "dlmmLiquidityUpdate";
      discriminator: [122, 219, 142, 128, 132, 86, 81, 68];
    },
    {
      name: "dlmmParametersUpdated";
      discriminator: [92, 213, 172, 136, 1, 116, 140, 227];
    },
    {
      name: "dlmmPoolCreated";
      discriminator: [71, 121, 55, 63, 135, 253, 60, 213];
    },
    {
      name: "dlmmPositionBurned";
      discriminator: [164, 95, 141, 121, 189, 11, 78, 55];
    },
    {
      name: "dlmmPositionOpened";
      discriminator: [224, 219, 33, 140, 187, 190, 104, 83];
    },
    {
      name: "dlmmSwapResult";
      discriminator: [34, 147, 196, 223, 36, 128, 227, 113];
    }
  ];
  errors: [
    {
      code: 6000;
      name: "invalidFeeRates";
      msg: "The provided fee rates are invalid.";
    },
    {
      code: 6001;
      name: "invalidParameters";
      msg: "The provided fee and bin_step parameters are not on the whitelist.";
    },
    {
      code: 6002;
      name: "invalidMintOrder";
      msg: "The mint addresses are not in the correct canonical order. Token A must be less than Token B.";
    },
    {
      code: 6003;
      name: "invalidMint";
      msg: "The provided mint does not match the pool's mint.";
    },
    {
      code: 6004;
      name: "invalidBinRange";
      msg: "The lower bin ID must be less than the upper bin ID.";
    },
    {
      code: 6005;
      name: "zeroLiquidity";
      msg: "Liquidity to deposit must be greater than zero.";
    },
    {
      code: 6006;
      name: "slippageExceeded";
      msg: "The market price moved unfavorably, exceeding your slippage tolerance.";
    },
    {
      code: 6007;
      name: "unauthorized";
      msg: "The signer is not the authorized owner of this position.";
    },
    {
      code: 6008;
      name: "insufficientLiquidity";
      msg: "The amount of liquidity to remove exceeds the amount in the position.";
    },
    {
      code: 6009;
      name: "positionNotEmpty";
      msg: "Cannot operate on a position that has no liquidity.";
    },
    {
      code: 6010;
      name: "zeroAmount";
      msg: "Input amount for a swap must be greater than zero.";
    },
    {
      code: 6011;
      name: "invalidVault";
      msg: "The provided vault account does not match the pool's vault.";
    },
    {
      code: 6012;
      name: "invalidBinId";
      msg: "The provided bin IDs must be a multiple of the pool's bin_step.";
    },
    {
      code: 6013;
      name: "rangeTooWide";
      msg: "The specified bin range is wider than the allowed maximum.";
    },
    {
      code: 6014;
      name: "mathOverflow";
      msg: "Math operation overflowed or underflowed.";
    },
    {
      code: 6015;
      name: "invalidBinStep";
      msg: "The provided bin step value is invalid (e.g., zero).";
    },
    {
      code: 6016;
      name: "insufficientLiquidityForSwap";
      msg: "Not enough liquidity in the pool to complete the swap.";
    },
    {
      code: 6017;
      name: "invalidBinCount";
      msg: "The number of bins provided does not match the position's range.";
    },
    {
      code: 6018;
      name: "invalidBinAccount";
      msg: "A provided bin account does not have the expected address.";
    },
    {
      code: 6019;
      name: "invalidPool";
      msg: "The provided position account does not belong to the specified pool.";
    },
    {
      code: 6020;
      name: "binCacheMismatch";
      msg: "The list of provided bin accounts does not match the cached list in the TransactionBins account.";
    },
    {
      code: 6021;
      name: "updateNotNeeded";
      msg: "The last update was too recent. Please wait before triggering another update.";
    },
    {
      code: 6022;
      name: "invalidFeePreference";
      msg: "The selected fee preference does not permit this action.";
    },
    {
      code: 6023;
      name: "feeShareExceedsTotal";
      msg: "The sum of protocol and referrer fee shares cannot exceed 100%.";
    },
    {
      code: 6024;
      name: "referrerIsTrader";
      msg: "The trader cannot be the referrer.";
    }
  ];
  types: [
    {
      name: "ammFeesClaimed";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "user";
            type: "pubkey";
          },
          {
            name: "feesClaimedA";
            type: "u64";
          },
          {
            name: "feesClaimedB";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "ammFeesUpdated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "newFeeRate";
            type: "u16";
          }
        ];
      };
    },
    {
      name: "ammLiquidityAdded";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "user";
            type: "pubkey";
          },
          {
            name: "lpTokensMinted";
            type: "u64";
          },
          {
            name: "amountADeposited";
            type: "u64";
          },
          {
            name: "amountBDeposited";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "ammLiquidityRemoved";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "user";
            type: "pubkey";
          },
          {
            name: "lpTokensBurned";
            type: "u64";
          },
          {
            name: "amountAReceived";
            type: "u64";
          },
          {
            name: "amountBReceived";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "ammPool";
      docs: [
        "State for a permissionless, constant-product AMM pool.",
        "",
        "Follows the x * y = k model."
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            docs: ["The PDA bump."];
            type: "u8";
          },
          {
            name: "authority";
            docs: [
              "The authority that can update protocol fees or other admin-only parameters.",
              "Can be a multi-sig or DAO."
            ];
            type: "pubkey";
          },
          {
            name: "tokenAMint";
            type: "pubkey";
          },
          {
            name: "tokenBMint";
            type: "pubkey";
          },
          {
            name: "tokenAVault";
            type: "pubkey";
          },
          {
            name: "tokenBVault";
            type: "pubkey";
          },
          {
            name: "lpMint";
            type: "pubkey";
          },
          {
            name: "feeRate";
            type: "u16";
          },
          {
            name: "protocolFeeShare";
            type: "u16";
          },
          {
            name: "referrerFeeShare";
            type: "u16";
          },
          {
            name: "protocolFeeVaultA";
            type: "pubkey";
          },
          {
            name: "protocolFeeVaultB";
            type: "pubkey";
          },
          {
            name: "reservesA";
            type: "u64";
          },
          {
            name: "reservesB";
            type: "u64";
          },
          {
            name: "feeGrowthPerLpTokenA";
            docs: ["Total fees of token A accrued per LP token."];
            type: "u128";
          },
          {
            name: "feeGrowthPerLpTokenB";
            docs: ["Total fees of token B accrued per LP token."];
            type: "u128";
          },
          {
            name: "priceACumulative";
            docs: ["The cumulative price of token A in terms of token B."];
            type: "u128";
          },
          {
            name: "priceBCumulative";
            docs: ["The cumulative price of token B in terms of token A."];
            type: "u128";
          },
          {
            name: "lastUpdateTimestamp";
            docs: [
              "The timestamp of the last update to the reserves and oracle."
            ];
            type: "i64";
          },
          {
            name: "lastFeeUpdateTimestamp";
            type: "i64";
          },
          {
            name: "priceACumulativeLastFeeUpdate";
            docs: [
              "Snapshot of the cumulative price at the last fee update, used for volatility calculation."
            ];
            type: "u128";
          }
        ];
      };
    },
    {
      name: "ammPoolCreated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "tokenAMint";
            type: "pubkey";
          },
          {
            name: "tokenBMint";
            type: "pubkey";
          },
          {
            name: "lpMint";
            type: "pubkey";
          },
          {
            name: "feeRate";
            type: "u16";
          }
        ];
      };
    },
    {
      name: "ammPosition";
      docs: ["Represents a user's liquidity position in a specific AMM pool."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "pool";
            docs: ["The AMM pool this position belongs to."];
            type: "pubkey";
          },
          {
            name: "owner";
            docs: ["The owner of this position."];
            type: "pubkey";
          },
          {
            name: "lpTokenAmount";
            docs: ["The number of LP tokens this position represents."];
            type: "u64";
          },
          {
            name: "feeGrowthSnapshotA";
            docs: [
              "Snapshot of the pool's fee growth per LP token for token A."
            ];
            type: "u128";
          },
          {
            name: "feeGrowthSnapshotB";
            docs: [
              "Snapshot of the pool's fee growth per LP token for token B."
            ];
            type: "u128";
          },
          {
            name: "feePreference";
            docs: ["The user's chosen strategy for handling accrued fees."];
            type: {
              defined: {
                name: "feePreference";
              };
            };
          }
        ];
      };
    },
    {
      name: "ammSwap";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "trader";
            type: "pubkey";
          },
          {
            name: "inputMint";
            type: "pubkey";
          },
          {
            name: "outputMint";
            type: "pubkey";
          },
          {
            name: "amountIn";
            type: "u64";
          },
          {
            name: "amountOut";
            type: "u64";
          },
          {
            name: "protocolFee";
            type: "u64";
          },
          {
            name: "lpFee";
            type: "u64";
          },
          {
            name: "referrer";
            type: {
              option: "pubkey";
            };
          }
        ];
      };
    },
    {
      name: "dlmmFeesUpdated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "newFeeRate";
            type: "u16";
          }
        ];
      };
    },
    {
      name: "dlmmLiquidityModified";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "oldPositionAddress";
            type: "pubkey";
          },
          {
            name: "newPositionAddress";
            type: "pubkey";
          },
          {
            name: "liquidityToMove";
            type: "u128";
          },
          {
            name: "surplusAOut";
            type: "u64";
          },
          {
            name: "surplusBOut";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "dlmmLiquidityUpdate";
      type: {
        kind: "struct";
        fields: [
          {
            name: "positionAddress";
            type: "pubkey";
          },
          {
            name: "liquidityAdded";
            type: "i128";
          },
          {
            name: "amountA";
            type: "u64";
          },
          {
            name: "amountB";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "dlmmParameter";
      docs: [
        "A struct to hold a single valid (bin_step, fee_rate) pair.",
        "Using a struct makes the code cleaner and more extensible."
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "binStep";
            type: "u16";
          },
          {
            name: "feeRate";
            type: "u16";
          }
        ];
      };
    },
    {
      name: "dlmmParameters";
      docs: [
        "A singleton account that holds the whitelisted parameters for creating DLMM pools."
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            docs: ["The authority that can update these parameters."];
            type: "pubkey";
          },
          {
            name: "officialParameters";
            docs: [
              'Whitelisted parameters for "Official" pools created by the protocol authority.'
            ];
            type: {
              vec: {
                defined: {
                  name: "dlmmParameter";
                };
              };
            };
          },
          {
            name: "communityParameters";
            docs: [
              'Whitelisted parameters for "Community" pools created by anyone.'
            ];
            type: {
              vec: {
                defined: {
                  name: "dlmmParameter";
                };
              };
            };
          }
        ];
      };
    },
    {
      name: "dlmmParametersUpdated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "list";
            type: {
              defined: {
                name: "parameterList";
              };
            };
          },
          {
            name: "action";
            type: {
              defined: {
                name: "parameterAction";
              };
            };
          },
          {
            name: "binStep";
            type: "u16";
          },
          {
            name: "feeRate";
            type: "u16";
          }
        ];
      };
    },
    {
      name: "dlmmPool";
      docs: ["State for a Discretized Liquidity Market Maker (DLMM) pool."];
      type: {
        kind: "struct";
        fields: [
          {
            name: "bump";
            docs: ["The PDA bump."];
            type: "u8";
          },
          {
            name: "authority";
            docs: [
              "The protocol authority that created this pool. For community pools, this is the creator."
            ];
            type: "pubkey";
          },
          {
            name: "poolType";
            docs: [
              "Distinguishes the type of the pool (Official or Community)."
            ];
            type: {
              defined: {
                name: "poolType";
              };
            };
          },
          {
            name: "tokenAMint";
            type: "pubkey";
          },
          {
            name: "tokenBMint";
            type: "pubkey";
          },
          {
            name: "tokenAVault";
            type: "pubkey";
          },
          {
            name: "tokenBVault";
            type: "pubkey";
          },
          {
            name: "activeBinId";
            type: "i32";
          },
          {
            name: "binStep";
            type: "u16";
          },
          {
            name: "feeRate";
            type: "u16";
          },
          {
            name: "protocolFeeShare";
            type: "u16";
          },
          {
            name: "referrerFeeShare";
            type: "u16";
          },
          {
            name: "protocolFeeVaultA";
            type: "pubkey";
          },
          {
            name: "protocolFeeVaultB";
            type: "pubkey";
          },
          {
            name: "volatilityAccumulator";
            docs: [
              "Accumulator for market volatility, based on bins crossed during swaps."
            ];
            type: "u64";
          },
          {
            name: "lastFeeUpdateTimestamp";
            docs: ["The timestamp of the last dynamic fee update."];
            type: "i64";
          },
          {
            name: "reservesA";
            type: "u64";
          },
          {
            name: "reservesB";
            type: "u64";
          }
        ];
      };
    },
    {
      name: "dlmmPoolCreated";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "tokenAMint";
            type: "pubkey";
          },
          {
            name: "tokenBMint";
            type: "pubkey";
          },
          {
            name: "binStep";
            type: "u16";
          },
          {
            name: "feeRate";
            type: "u16";
          }
        ];
      };
    },
    {
      name: "dlmmPositionBurned";
      type: {
        kind: "struct";
        fields: [
          {
            name: "positionAddress";
            type: "pubkey";
          },
          {
            name: "owner";
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "dlmmPositionOpened";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "positionAddress";
            type: "pubkey";
          },
          {
            name: "positionMint";
            type: "pubkey";
          },
          {
            name: "lowerBinId";
            type: "i32";
          },
          {
            name: "upperBinId";
            type: "i32";
          }
        ];
      };
    },
    {
      name: "dlmmSwapResult";
      type: {
        kind: "struct";
        fields: [
          {
            name: "poolAddress";
            type: "pubkey";
          },
          {
            name: "trader";
            type: "pubkey";
          },
          {
            name: "inputMint";
            type: "pubkey";
          },
          {
            name: "outputMint";
            type: "pubkey";
          },
          {
            name: "amountIn";
            type: "u64";
          },
          {
            name: "amountOut";
            type: "u64";
          },
          {
            name: "protocolFee";
            type: "u64";
          },
          {
            name: "finalActiveBinId";
            type: "i32";
          },
          {
            name: "referrer";
            type: {
              option: "pubkey";
            };
          }
        ];
      };
    },
    {
      name: "feePreference";
      docs: ["The user's choice for how their LP fees should be handled."];
      type: {
        kind: "enum";
        variants: [
          {
            name: "manualClaim";
          },
          {
            name: "autoCompound";
          }
        ];
      };
    },
    {
      name: "parameterAction";
      type: {
        kind: "enum";
        variants: [
          {
            name: "add";
          },
          {
            name: "remove";
          }
        ];
      };
    },
    {
      name: "parameterList";
      type: {
        kind: "enum";
        variants: [
          {
            name: "official";
          },
          {
            name: "community";
          }
        ];
      };
    },
    {
      name: "poolType";
      docs: ["Distinguishes between official and community-created pools."];
      type: {
        kind: "enum";
        variants: [
          {
            name: "official";
          },
          {
            name: "community";
          }
        ];
      };
    },
    {
      name: "position";
      type: {
        kind: "struct";
        fields: [
          {
            name: "pool";
            type: "pubkey";
          },
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "lowerBinId";
            type: "i32";
          },
          {
            name: "upperBinId";
            type: "i32";
          },
          {
            name: "liquidity";
            type: "u128";
          },
          {
            name: "positionMint";
            type: "pubkey";
          },
          {
            name: "feeGrowthSnapshotA";
            type: "u128";
          },
          {
            name: "feeGrowthSnapshotB";
            type: "u128";
          }
        ];
      };
    },
    {
      name: "protocolConfig";
      docs: [
        "A singleton account that holds the protocol-wide configuration,",
        "including the master authority key."
      ];
      type: {
        kind: "struct";
        fields: [
          {
            name: "authority";
            docs: [
              "The master authority that can perform admin actions, like creating",
              "official pools or updating protocol-level parameters."
            ];
            type: "pubkey";
          }
        ];
      };
    },
    {
      name: "transactionBins";
      type: {
        kind: "struct";
        fields: [
          {
            name: "owner";
            type: "pubkey";
          },
          {
            name: "bins";
            type: {
              vec: "pubkey";
            };
          }
        ];
      };
    }
  ];
};

// =================================================================================
// ACCOUNTS
// =================================================================================

export type AmmPool = {
  bump: number;
  authority: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  lpMint: PublicKey;
  feeRate: number;
  protocolFeeShare: number;
  referrerFeeShare: number;
  protocolFeeVaultA: PublicKey;
  protocolFeeVaultB: PublicKey;
  reservesA: BN;
  reservesB: BN;
  feeGrowthPerLpTokenA: BN;
  feeGrowthPerLpTokenB: BN;
  priceACumulative: BN;
  priceBCumulative: BN;
  lastUpdateTimestamp: BN;
  lastFeeUpdateTimestamp: BN;
  priceACumulativeLastFeeUpdate: BN;
};

export type AmmPosition = {
  pool: PublicKey;
  owner: PublicKey;
  lpTokenAmount: BN;
  feeGrowthSnapshotA: BN;
  feeGrowthSnapshotB: BN;
  feePreference: FeePreference;
};

export type DlmmParameters = {
  authority: PublicKey;
  officialParameters: DlmmParameter[];
  communityParameters: DlmmParameter[];
};

export type DlmmPool = {
  bump: number;
  authority: PublicKey;
  poolType: PoolType;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  tokenAVault: PublicKey;
  tokenBVault: PublicKey;
  activeBinId: number;
  binStep: number;
  feeRate: number;
  protocolFeeShare: number;
  referrerFeeShare: number;
  protocolFeeVaultA: PublicKey;
  protocolFeeVaultB: PublicKey;
  volatilityAccumulator: BN;
  lastFeeUpdateTimestamp: BN;
  reservesA: BN;
  reservesB: BN;
};

export type Position = {
  pool: PublicKey;
  owner: PublicKey;
  lowerBinId: number;
  upperBinId: number;
  liquidity: BN;
  positionMint: PublicKey;
  feeGrowthSnapshotA: BN;
  feeGrowthSnapshotB: BN;
};

export type ProtocolConfig = {
  authority: PublicKey;
};

export type TransactionBins = {
  owner: PublicKey;
  bins: PublicKey[];
};

// =================================================================================
// EVENTS
// =================================================================================

export type AmmFeesClaimed = {
  poolAddress: PublicKey;
  user: PublicKey;
  feesClaimedA: BN;
  feesClaimedB: BN;
};

export type AmmFeesUpdated = {
  poolAddress: PublicKey;
  newFeeRate: number;
};

export type AmmLiquidityAdded = {
  poolAddress: PublicKey;
  user: PublicKey;
  lpTokensMinted: BN;
  amountADeposited: BN;
  amountBDeposited: BN;
};

export type AmmLiquidityRemoved = {
  poolAddress: PublicKey;
  user: PublicKey;
  lpTokensBurned: BN;
  amountAReceived: BN;
  amountBReceived: BN;
};

export type AmmPoolCreated = {
  poolAddress: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  lpMint: PublicKey;
  feeRate: number;
};

export type AmmSwap = {
  poolAddress: PublicKey;
  trader: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  amountIn: BN;
  amountOut: BN;
  protocolFee: BN;
  lpFee: BN;
  referrer: PublicKey | null;
};

export type DlmmFeesUpdated = {
  poolAddress: PublicKey;
  newFeeRate: number;
};

export type DlmmLiquidityModified = {
  owner: PublicKey;
  poolAddress: PublicKey;
  oldPositionAddress: PublicKey;
  newPositionAddress: PublicKey;
  liquidityToMove: BN;
  surplusAOut: BN;
  surplusBOut: BN;
};

export type DlmmLiquidityUpdate = {
  positionAddress: PublicKey;
  liquidityAdded: BN; // i128 can be represented by BN
  amountA: BN;
  amountB: BN;
};

export type DlmmParametersUpdated = {
  list: ParameterList;
  action: ParameterAction;
  binStep: number;
  feeRate: number;
};

export type DlmmPoolCreated = {
  poolAddress: PublicKey;
  tokenAMint: PublicKey;
  tokenBMint: PublicKey;
  binStep: number;
  feeRate: number;
};

export type DlmmPositionBurned = {
  positionAddress: PublicKey;
  owner: PublicKey;
};

export type DlmmPositionOpened = {
  poolAddress: PublicKey;
  owner: PublicKey;
  positionAddress: PublicKey;
  positionMint: PublicKey;
  lowerBinId: number;
  upperBinId: number;
};

export type DlmmSwapResult = {
  poolAddress: PublicKey;
  trader: PublicKey;
  inputMint: PublicKey;
  outputMint: PublicKey;
  amountIn: BN;
  amountOut: BN;
  protocolFee: BN;
  finalActiveBinId: number;
  referrer: PublicKey | null;
};

// =================================================================================
// CUSTOM TYPES
// =================================================================================

export type DlmmParameter = {
  binStep: number;
  feeRate: number;
};

export type FeePreference = { manualClaim: {} } | { autoCompound: {} };
export const FeePreference = {
  ManualClaim: { manualClaim: {} } as FeePreference,
  AutoCompound: { autoCompound: {} } as FeePreference,
};

export type ParameterAction = { add: {} } | { remove: {} };
export const ParameterAction = {
  Add: { add: {} } as ParameterAction,
  Remove: { remove: {} } as ParameterAction,
};

export type ParameterList = { official: {} } | { community: {} };
export const ParameterList = {
  Official: { official: {} } as ParameterList,
  Community: { community: {} } as ParameterList,
};

export type PoolType = { official: {} } | { community: {} };
export const PoolType = {
  Official: { official: {} } as PoolType,
  Community: { community: {} } as PoolType,
};
