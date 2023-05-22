import { MsgExecuteContract, SecretNetworkClient, TxResponse } from "secretjs";
import { Wallet as SecretWallet } from 'secretjs';
import { log } from "./botlib/Logger"
import { Error } from "./botlib/Error";
import BigNumber from "bignumber.js";
import { Token } from "./SecretWallet";
require('dotenv').config();

const gasprice = process.env.GASPRICE ?? "0.1"



export async function getStkdPrice(client: SecretNetworkClient):Promise<number>{
    try{
        let now = Math.floor(new Date().getTime() / 1000) 
        const info: any = await client.query.compute.queryContract({
            contract_address: "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4",
            code_hash:"f6be719b3c6feb498d3554ca0398eb6b7e7db262acb33f84a8f12106da6bbb09",
            query: { staking_info: { time: now }}
        })
        let price = new BigNumber(info.staking_info.price).shiftedBy(-6).toNumber()
        return price
    }
    catch(e: any){
        log.info("Exception getStkdPrice : "+ e.message)
        let error = new Error(e)
        if(error.isKo() || error.isNotSure()){
            log.info("Rpc Error or timeout, let's retry the getPrice")
            return await getStkdPrice(client)
        }
        else{
            log.info("Unknown error, perhaps functionnal")
        }
        return 0
    }
}



export async function getStkdInfo(client: SecretNetworkClient, token: Token):Promise<any>{
    try{
        let now = Math.floor(new Date().getTime() / 1000) 
        const info: any = await client.query.compute.queryContract({
            contract_address: "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4",
            code_hash:"f6be719b3c6feb498d3554ca0398eb6b7e7db262acb33f84a8f12106da6bbb09",
            query: { 
                holdings: {
                  address: client.address,
                  key: token.key,
                  time: now,
                }
              }
        })
        let claimable = new BigNumber(info.holdings.claimable_scrt).shiftedBy(-6).toNumber()
        let unbonding = new BigNumber(info.holdings.unbonding_scrt).shiftedBy(-6).toNumber()
        let balance = new BigNumber(info.holdings.token_balance).shiftedBy(-6).toNumber()
        return { claimable: claimable, unbonding: unbonding, balance: balance }
    }
    catch(e: any){
        log.info("Exception getStkdInfo : "+ e.message)
        let error = new Error(e)
        if(error.isKo() || error.isNotSure()){
            log.info("Rpc Error or timeout, let's retry the getStkdInfo")
            return await getStkdInfo(client, token)
        }
        else{
            log.info("Unknown error, perhaps functionnal")
        }
        return { claimable: 0, unbonding: 0, balance: 0 }
    }
}



export async function claimStkdToken(client: SecretNetworkClient):Promise<TxResponse|undefined>{
    try{
        let msg = new MsgExecuteContract({
            sender: client.address,
            contract_address: "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4",
            code_hash:"f6be719b3c6feb498d3554ca0398eb6b7e7db262acb33f84a8f12106da6bbb09",
            msg: { 
                claim: {}    
            },
        })
        let resp = await client.tx.broadcast([msg], {
            gasLimit: 200_000,
            gasPriceInFeeDenom: Number(gasprice),
            feeDenom: "uscrt",
        })
        return resp
    }
    catch(e: any){
        log.info("Exception claimStkdToken : "+ e.message)
        let error = new Error(e)
        if(error.isKo() || error.isNotSure()){
            log.info("Rpc Error or timeout, let's retry the claim ")
            return await claimStkdToken(client)
        }
        else{
            log.info("Unknown error, perhaps functionnal")
        }
    }
}


export async function unbondStkdToken(client: SecretNetworkClient, amount: number):Promise<TxResponse|undefined>{
    try{
        let quantity = new BigNumber(amount).shiftedBy(6).toNumber()
        let msg = new MsgExecuteContract({
            sender: client.address,
            contract_address: "secret1k6u0cy4feepm6pehnz804zmwakuwdapm69tuc4",
            code_hash:"f6be719b3c6feb498d3554ca0398eb6b7e7db262acb33f84a8f12106da6bbb09",
            msg: { 
                unbond: { redeem_amount: quantity}    
            },
        })
        let resp = await client.tx.broadcast([msg], {
            gasLimit: 200_000,
            gasPriceInFeeDenom: Number(gasprice),
            feeDenom: "uscrt",
        })
        return resp
    }
    catch(e: any){
        log.info("Exception unbondStkdToken : "+ e.message)
        let error = new Error(e)
        if(error.isKo() || error.isNotSure()){
            log.info("Rpc Error or timeout, let's retry the unbond ")
            return await unbondStkdToken(client,amount)
        }
        else{
            log.info("Unknown error, perhaps functionnal")
        }
    }
}
