import { MsgExecuteContract, SecretNetworkClient, TxResultCode } from "secretjs";
import { Wallet as SecretWallet } from 'secretjs';

import { delay, round } from "./botlib/utils";
import { log } from "./botlib/Logger";

import * as BIP39 from "bip39";

import { Vault, liquidatePosition } from "./ShadeLiquidation";
import { Token, getPublicBalance, getUpdatedSecretBalance } from "./SecretWallet";
import { executeTrade, getRouteList, simulateBestSwap } from "./SecretTrade";
import { claimStkdToken, getStkdInfo, getStkdPrice, unbondStkdToken } from "./StkdContract";



const fs = require('fs');
require('dotenv').config();




(async () => {
    log.info("Init stkd-scrt-arb-bot...")
    log.info("===".repeat(20))


    const lcd = process.env.LCD ?? ""
    const mnemonic = process.env.MNEMONICS ?? BIP39.generateMnemonic()

    const envTokenList = process.env.TOKENLIST ?? ""
    const tokenList = JSON.parse(envTokenList)
    const txFee = Number(process.env.TX_FEE) ?? 0.2
    const minPercent = Number(process.env.TX_FEE) ?? 0.03
    const interval = Number(process.env.INTERVAL) ?? 60

    let stkdscrt: Token = tokenList.tokens.find( (w: Token) => w.contract === "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4")
    let sscrt: Token = tokenList.tokens.find( (w: Token) => w.contract === "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek")


    const signer = new SecretWallet( mnemonic ) 
    const secretjs = new SecretNetworkClient({
        url: lcd,
        chainId: "secret-4",
        wallet: signer,
        walletAddress: signer.address,
    })




    log.info("===".repeat(20))

    let scrtBalance = await getPublicBalance(secretjs, 'uscrt')
    log.info("Your address: "+signer.address)
    log.info("scrt: "+scrtBalance)
    if(scrtBalance < 0.5){
        log.info("You need some secret token in your wallet for Gas Fee")
        await delay(2000)
        process.exit(0)
    }


    log.info("===".repeat(20))

    let routeList = getRouteList(sscrt, stkdscrt, 4)
    log.info("we find "+routeList.length+" route(s) to make the trade")

    let stkdprice = await getStkdPrice(secretjs)

    log.info("the price of stkd-scrt is :"+stkdprice)
    
    while(true){


        // checking sscrt balance
        let startAmount = await getUpdatedSecretBalance(secretjs, sscrt)
        log.info("current sscrt balance : "+startAmount)

        if(startAmount >= (sscrt.min_amount ?? 0)){
            log.info("")
            let quantity = startAmount

            // simulate
            let bestTrade = await simulateBestSwap(secretjs, routeList, quantity, sscrt, stkdscrt)
    
            if(bestTrade){
                
                log.info("the trade result would be : "+round(bestTrade.result, 0.0001)+" stkd-scrt")
                let ratio = (bestTrade.result / quantity) * stkdprice
                let win =  stkdprice * bestTrade.result - startAmount - txFee
                log.info("current ratio is : "+ratio+" and the win for "+startAmount+" initial sscrt would be : "+ round(win, 0.0001))
                
                if(win / startAmount > minPercent ){
                    log.info("we can make an arb")
                    // trade
                    let txTrade = await executeTrade(secretjs, bestTrade.route, sscrt, stkdscrt, startAmount, bestTrade.result * 0.999)
                    if(txTrade){
                        log.info("Trade Tx result : "+txTrade.rawLog)
                        
                        if(txTrade.code === 0){
                            log.info("Trade is Ok !!!, let's unbond the token")
                            let stkdInfo = await getStkdInfo(secretjs)
                            let amountToUnbond = 0
                            if(stkdInfo.balance >= bestTrade.result){
                                amountToUnbond = bestTrade.result
                            }
                            else{
                                amountToUnbond = stkdInfo.balance
                            }
                            // unbond
                            let txUnbond = await unbondStkdToken(secretjs, amountToUnbond)
                            if(txUnbond){
                                log.info("Unbonding Tx result : "+txUnbond.rawLog)
                            }
                        }
                    }


                }
            }
        }
        else{
            log.info("Your sscrt balance is too low")
        }
        


        // checking stkd-scrt balance
        log.info("===".repeat(20))
        let stkdInfo = await getStkdInfo(secretjs)
        
        log.info("stck-scrt balance : "+stkdInfo.balance)
        log.info("stck-scrt currently unbonding : "+stkdInfo.unbonding)
        
        
        // checking if stkd-scrt to claim
        log.info("===".repeat(20))
        log.info("stck-scrt claimable : "+stkdInfo.claimable)
        if(stkdInfo.claimable > 0.1){

            log.info("start of the claiming Tx")
            
            let claimTx = await claimStkdToken(secretjs)
            if(claimTx){
                log.info("Claim Tx result : "+claimTx.rawLog)
            }
            
            log.info("===".repeat(20))
        }
        else{
            log.info("Nothing to claim")
            log.info("===".repeat(20))
        }
        

        log.info("Waiting for the next iteration")
        await delay(interval * 1000)       
    }




})().catch(console.error).finally(() => process.exit(0));





