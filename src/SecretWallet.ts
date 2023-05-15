import { MsgExecuteContract, SecretNetworkClient } from "secretjs";
import { log } from "./botlib/Logger";
import BigNumber from "bignumber.js";
import { delay, floor } from "./botlib/utils";
import { Error } from "./botlib/Error";


export interface Token{
    name: string,
    contract: string, 
    codehash: string,
    decimals: number,
    key: string,
    min_amount?: number,
}

require('dotenv').config();
const gasPrice = Number(process.env.GASPRICE) ?? 0.1;


export async function getPublicBalance(client: SecretNetworkClient, denom: string): Promise<number>{
    try{
        //log.info("query contract - " + denom)
        let info: any = await client.query.bank.balance({
            address: client.address,
            denom: denom
        })
        let result = new BigNumber(info.balance.amount).shiftedBy(-6).toNumber()
        return result
    }
    catch(e: any){
        log.info("Exception updateScrtBalance")
        log.info(e.code)
        log.info(e.message)
        let error = new Error(e)
        if(error.isKo() || error.isNotSure()){
            await delay(3000)
            return await getPublicBalance(client, denom)
        }
    }      
    return 0

}




export async function getUpdatedSecretBalance(client: SecretNetworkClient, token: Token): Promise<number>{
     
    try{
        //log.info("query contract - " + token.contract)
        let info: any = await client.query.compute.queryContract({
            contract_address: token.contract,
            code_hash: token.codehash ?? "",
            query: { 
                balance: {
                    address: client.address,
                    key: token.key,
                }
            }
        })
        let result = new BigNumber(info.balance.amount).shiftedBy(-token.decimals).toNumber()
        return result
    }
    catch(e: any){
        log.info("Exception updateScrtBalance")
        log.info(e.code)
        log.info(e.message)
        let error = new Error(e)
        if(error.isKo() || error.isNotSure()){
            await delay(3000)
            return await getUpdatedSecretBalance(client, token)
        }
    }      
    return 0
}




export async function wrapScrt(client: SecretNetworkClient, amount: number){

    let quantity = new BigNumber(floor(amount,0.0001)).shiftedBy(6).toString()

    let message = {deposit: {}}
    let funds = [{
        amount: quantity,
        denom: "uscrt"
    }]
    let msg = new MsgExecuteContract({
        sender: client.address,
        contract_address: "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek",
        code_hash: "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e",
        msg: message,
        sent_funds: funds
    })
    let resp = await client.tx.broadcast([msg], {
        gasLimit: 60_000,
        gasPriceInFeeDenom: gasPrice,
        feeDenom: "uscrt"
    })



}