
import * as BIP39 from "bip39";
import { MsgExecuteContract, SecretNetworkClient, Wallet } from "secretjs";
/* import { FEES,  osmosis,getSigningOsmosisClient } from 'osmojs';
;
import { OfflineSigner, GeneratedType, Registry, DirectSecp256k1HdWallet } from "@cosmjs/proto-signing";
import Long = require("long");
import { OsmoTrade } from "./OsmoTrade"; */

require('dotenv').config();


import { log } from "./botlib/Logger";

(async () => {

 const secretAddress = process.env.SECRET ?? ""
 const mnemonic = process.env.MNEMONICS ?? BIP39.generateMnemonic();
 
     const wallet = new Wallet( mnemonic )
    const secretjs = new SecretNetworkClient({
        url: "https://lcd.secret.express",
        chainId: "secret-4",

    }) 
  
/*     
        wallet: wallet,
        walletAddress: wallet.address,
let wallet = await DirectSecp256k1HdWallet.fromMnemonic(mnemonic,{ hdPaths:[stringToPath("m/44'/529'/0'/0/0")] , prefix: 'secret', })
    let client = await Promise.race([SigningStargateClient.connectWithSigner( "https://secret-api.lavenderfive.com:443", wallet), new Promise((resolve, reject) => setTimeout(() => reject(new Error('Timeout')), 3000))]) as SigningStargateClient
     
    log.info(await client.getHeight())
   */
  
    const sSCRT = "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek"
    //
    // Get codeHash using `secretcli q compute contract-hash secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek`
    const sScrtCodeHash = "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e"
    const statomstosmo = "secret1y5ay9sw43rqydyyds6tuam0ugt4rxxu3cmpc79"
    
    //Math.floor(new Date().getTime() / 1000) 
    let now = Math.floor(new Date().getTime() / 1000) 
/*     const info = await secretjs.query.compute.queryContract({
        contract_address: 'secret1pjhdug87nxzv0esxasmeyfsucaj98pw4334wyc',
        code_hash: '448e3f6d801e453e838b7a5fbaa4dd93b84d0f1011245f0d5745366dadaf3e85',
        query: {
          swap_simulation: {
            offer: {
              token: {
                custom_token: {
                  contract_addr: 'secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek',
                  token_code_hash: 'af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e'
                }
              },
              amount: '1000000'
            },
            path: [
              {
                addr: 'secret1y6w45fwg9ln9pxd6qys8ltjlntu9xa4f2de7sp',
                code_hash: 'e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2'
              },
              
            ]
          }
        }
      }
      ) */
      const info: any = await secretjs.query.compute.queryContract({
        contract_address: "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4",
        code_hash:"f6be719b3c6feb498d3554ca0398eb6b7e7db262acb33f84a8f12106da6bbb09",
        query: { 
          holdings: {
            address: wallet.address,
            key: "f250f88ab68c2f5db3190139b65e3877087e1f3febec17456da4e7c0bf42a4e9",
            time: now,
          }
        }
    })
    log.info(info)


/*
const info = await secretjs.query.compute.queryContract({
    contract_address: "secret1pjhdug87nxzv0esxasmeyfsucaj98pw4334wyc",
    code_hash:"448e3f6d801e453e838b7a5fbaa4dd93b84d0f1011245f0d5745366dadaf3e85",
    query: { 
      swap_simulation: {
        offer: { 
          token:  {
            custom_token: {
              contract_addr: "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek",
              token_code_hash: "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e",
            } 
          }, 
          amount: "1000000", 
        },
      }
    }
  })


log.info(info)  5.006876
*/

/*
let swapMsg = {
    swap_tokens:{
        expected_return:"8792",
        offer: { 
            token:  {
              custom_token: {
                contract_addr: "secret19e75l25r6sa6nhdf4lggjmgpw0vmpfvsw5cnpe",
                token_code_hash: "638a3e1d50175fbcb8373cf801565283e3eb23d88a9b7b7f99fcc5eb1e6b561e",
              } 
            },
            amount: "10000", 
        }
    }
}
let buf = Buffer.from(JSON.stringify(swapMsg))

let msg = new MsgExecuteContract({
    sender: secretAddress,
    contract_address: "secret19e75l25r6sa6nhdf4lggjmgpw0vmpfvsw5cnpe",
    code_hash:"638a3e1d50175fbcb8373cf801565283e3eb23d88a9b7b7f99fcc5eb1e6b561e",
    msg: { 
        send: {
            recipient: "secret1a65a9xgqrlsgdszqjtxhz069pgsh8h4a83hwt0",
            recipient_code_hash: "e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2",
            amount: "10000",
            msg: buf.toString('base64')
        }    
    },
})
let resp = await secretjs.tx.broadcast([msg], {
    gasLimit: 650_000,
    gasPriceInFeeDenom: 0.0125,
    feeDenom: "uscrt",
})


log.info(resp)
*/
/*




      


    let swapMsg = {
        swap_tokens_for_exact:{
            expected_return:"473",
            path:[
                {addr:"secret1y6w45fwg9ln9pxd6qys8ltjlntu9xa4f2de7sp",code_hash:"e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"},
                {addr:"secret1qyt4l47yq3x43ezle4nwlh5q0sn6f9sesat7ap",code_hash:"e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"},
                {addr:"secret1wn9tdlvut2nz0cpv28qtv74pqx20p847j8gx3w",code_hash:"e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"}
            ]
        }
    }
    let buf = Buffer.from(JSON.stringify(swapMsg))

    let msg = new MsgExecuteContract({
        sender: secretAddress,
        contract_address: "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek",
        code_hash:"af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e",
        msg: { 
            send: {
                recipient: "secret1pjhdug87nxzv0esxasmeyfsucaj98pw4334wyc",
                recipient_code_hash: "448e3f6d801e453e838b7a5fbaa4dd93b84d0f1011245f0d5745366dadaf3e85",
                amount: "10000",
                msg: buf.toString('base64')
            }    
        },
    })
    let resp = await secretjs.tx.broadcast([msg], {
        gasLimit: 3_000_000,
        gasPriceInFeeDenom: 0.0125,
        feeDenom: "uscrt",
    });  */
    



    
    
     /* const info = await secretjs.tx.compute.executeContract({
        sender: secretAddress,
        contract_address: "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek",
        code_hash:"af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e",
        msg: { 
            send: {
                recipient: "secret1pjhdug87nxzv0esxasmeyfsucaj98pw4334wyc",
                recipient_code_hash: "448e3f6d801e453e838b7a5fbaa4dd93b84d0f1011245f0d5745366dadaf3e85",
                amount: "10000",
                msg: {
                    swap_tokens_for_exact:{
                        expected_return:"477",
                        path:[
                            {addr:"secret1y6w45fwg9ln9pxd6qys8ltjlntu9xa4f2de7sp",code_hash:"e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"},
                            {addr:"secret1qyt4l47yq3x43ezle4nwlh5q0sn6f9sesat7ap",code_hash:"e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"},
                            {addr:"secret1wn9tdlvut2nz0cpv28qtv74pqx20p847j8gx3w",code_hash:"e88165353d5d7e7847f2c84134c3f7871b2eee684ffac9fcf8d99a4da39dc2f2"}
                        ]
                    }
                }
            }    
        },
    }, 
    { 
        memo: "test",
        gasPriceInFeeDenom: 0.0125,
        gasLimit: 1_000_000,
    }) */
    


})().catch(console.error).finally(() => process.exit(0));