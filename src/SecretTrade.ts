import { MsgExecuteContract, SecretNetworkClient, TxResponse } from "secretjs";
import { secretAllMarket } from "./SecretMarket";
import { Token } from "./SecretWallet";
import { Route } from "./botlib/Route";
import { Trajet } from "./botlib/Trajet";
import BigNumber from "bignumber.js";
import { log } from "./botlib/Logger";
import { MarketData } from "./botlib/Market";
import { Error } from "./botlib/Error";
import { delay } from "./botlib/utils";



require('dotenv').config();
const gasPrice = Number(process.env.GASPRICE) ?? 0.1;

interface RouterList{
    [index: string]: Router
}

export interface Router{
    contract: string,
    codehash?: string,
}

export var routerList = {} as RouterList
// Router list we should be able to add sienna and secretswap 1 & 2
routerList["shade"] = {contract: "secret1pjhdug87nxzv0esxasmeyfsucaj98pw4334wyc", codehash:"448e3f6d801e453e838b7a5fbaa4dd93b84d0f1011245f0d5745366dadaf3e85"}
routerList["blizzard"] = {contract: "secret1tejwnma86amug6mfy74qhwclsx92zutd9rfquy", codehash:"491656820a20a3034becea7a6ace40de4c79583b0d23b46c482959d6f780d80e"}

const envTokenList = process.env.TOKENLIST ?? ""
const tokenList = JSON.parse(envTokenList)


// Route
/****************************************************************************** */ 
export function getRouteList(tokenIn: Token, tokenOut: Token, maxHop?: number){

    if(!maxHop){
        maxHop=4
    }
    let trajet = new Trajet(tokenIn.contract, tokenOut.contract)
    trajet.loadRoute(maxHop,secretAllMarket)

    return trajet.routeList
}


// Simulate 
/****************************************************************************** */ 
export async function simulateBestSwap(client: SecretNetworkClient, routeList: Route[], amount: number, tokenIn: Token, tokenOut: Token){

    let bestRoute =  {} as Route
    let bestresult: number = 0 
    for(let route of routeList){
        let result = await simulateSwap(client, route, tokenIn, amount)
        log.info("Route: "+route.print() + " expected result = "+result +" "+tokenOut.name )
        if(result > bestresult){
            bestRoute = route
            bestresult = result
        }

    }
    if(bestresult > 0 ){
       return {route: bestRoute ,result: bestresult}
    }
}

async function simulateSwap(client: SecretNetworkClient, route: Route, tokenIn: Token, amount: number): Promise<number> {
    let stepByExchange = groupTradeByExchange(route)

    let lastResult: number = amount
    let lastToken: Token = tokenIn
    for(let action of Object.keys(stepByExchange)){
        let exchange = action.split("-") 

        let tokenTradeOut: Token = getOutToken(stepByExchange[action],lastToken)
        if(exchange[0] === "shade"){
            lastResult = await simulateShadeSwap(client, stepByExchange[action], lastToken, tokenTradeOut, lastResult)
        }
        else if(exchange[0] === "blizzard"){
            lastResult = await simulateBlizzardSwap(client, stepByExchange[action], lastToken, tokenTradeOut, lastResult)
        }
    }

    return lastResult
}


function getOutToken(marketPath: MarketData[], tokenIn: Token){

    let tokenOut = tokenIn
    for(let market of marketPath){
        if(market.base === tokenOut.contract){
            tokenOut =  tokenList.tokens.find( (w: Token) => w.contract === (market.quote))
        }
        else{
            tokenOut =  tokenList.tokens.find( (w: Token) => w.contract === (market.base))
        }
    }
    return tokenOut
}


async function simulateShadeSwap(client: SecretNetworkClient, marketPath: MarketData[], tokenIn: Token, tokenOut: Token, amount: number): Promise<number> {
    
    let path: {addr:string,code_hash:string}[] = []
    for(let step of marketPath){
        path.push({addr: step.contract,code_hash: step.codeHash ?? ""})
    }

    try{

        let quantityIn = new BigNumber(amount).shiftedBy(tokenIn.decimals)
        let query = {
            contract_address: routerList["shade"].contract,
            code_hash: routerList["shade"].codehash,
            query: { 
                swap_simulation: {
                    offer: { 
                        token:  {
                            custom_token: {
                                contract_addr: tokenIn.contract,
                                token_code_hash: tokenIn.codehash,
                            } 
                        }, 
                        amount: quantityIn.toString(), 
                    },
                    path: path
                }
            }
        }
        const info: any = await client.query.compute.queryContract(query)

        let result = new BigNumber(info.swap_simulation.result.return_amount).shiftedBy(-tokenOut.decimals).toNumber()
        return result
    }
    catch(e: any){
        log.info("Exception simulateShadeSwap")
        log.info(e.message)
        return 0
    }
}

async function simulateBlizzardSwap(client: SecretNetworkClient, marketPath: MarketData[], tokenIn: Token, tokenOut: Token, amount: number): Promise<number> {
    
    let path: {pool_id: number, asset_in: string,asset_out: string}[] = []
    let feePath: {pool_id: number, asset_in: string,asset_out: string}[] = []
    let asset_in = tokenIn.contract
    
    for(let step of marketPath){
        let asset_out = step.base === asset_in ? step.quote : step.base
        path.push({pool_id: step.id, asset_in: asset_in,asset_out: asset_out})
        feePath.push({pool_id: step.id, asset_in: asset_out,asset_out: asset_in})
        asset_in = asset_out
    }

    try{

        let quantityIn = new BigNumber(amount).shiftedBy(tokenIn.decimals)
        let query = {
            contract_address: routerList["blizzard"].contract,
            code_hash: routerList["blizzard"].codehash,
            query: { 
                swap: 
                {
                    path: path,
                    fee_path: feePath,
                    amount_in: quantityIn.toString(), 
                },

            }
        }
        
        const info: any = await client.query.compute.queryContract(query)

        let result = new BigNumber(info.swap.amount_out).shiftedBy(-tokenOut.decimals).toNumber()
        return result
    }
    catch(e: any){
        log.info("Exception simulateBlizzardSwap")
        log.info(e.message)
        return 0
    }
}






// Execute 
/****************************************************************************** */ 

export async function executeTrade(client: SecretNetworkClient, route: Route, tokenIn: Token, tokenOut: Token, amountIn: number, minAmount: number): Promise<TxResponse|undefined>{

    let stepByExchange = groupTradeByExchange(route)
    let msgList: MsgExecuteContract<any>[] = []

    let gasLimit: number = 0

    for(let action of Object.keys(stepByExchange)){
        let exchange = action.split("-") 
        // if we use multiple router we need the initial balance foreach of this router
        // todo get the wallet check all needed balance
        if(exchange[0] === "shade"){
            msgList.push(getShadeSwapMsg(stepByExchange[action], client.address, tokenIn, tokenOut, amountIn, minAmount))
            gasLimit += 910_000 + 650_000 * (stepByExchange[action].length)
        }
        else if(exchange[0] === "blizzard"){
            msgList.push(getBlizzardSwapMsg(stepByExchange[action], client.address, tokenIn, tokenOut, amountIn, minAmount))
            gasLimit += 500_000
        }
        
    }
    if(msgList.length > 0){
        try{
      
            let tx = await client.tx.broadcast(msgList, {
                gasLimit: gasLimit,
                gasPriceInFeeDenom: gasPrice,
                feeDenom: "uscrt",
            })

            if(tx.rawLog){
                log.info(JSON.stringify(tx.rawLog))
                if(tx.rawLog.includes("failed to execute")){
                    throw "functionnal error"
                }
            }

            return tx
        }
        catch(e: any){
            log.info("Exception executeTrade")
            log.info(e.message)
            log.info(e.code)

            let error = new Error(e)
            if(error.isKo()){ 
                await delay(2000)
                return await executeTrade(client, route, tokenIn, tokenOut, amountIn, minAmount)
            }            
        }
    }
}


// useful if we must use several router contract
function groupTradeByExchange(route: Route): { [exchange: string]: MarketData[] } {
    const actionsByExchange: { [exchange: string]: MarketData[] } = {}; // tableaux d'actions par exchange
     
    let lastExchange= ""
    let id=0
    let i=0
    for (const step of route.marketPath) {
        if(lastExchange!==step.exchange){
            lastExchange=step.exchange
            id=i
        }
        if(actionsByExchange[lastExchange+"-"+id]){
            actionsByExchange[lastExchange+"-"+id].push(step)
        }
        else{
            actionsByExchange[lastExchange+"-"+id] = []
            actionsByExchange[lastExchange+"-"+id].push(step)
        }            
        
    }
  
    return actionsByExchange;
}


function getShadeSwapMsg(stepList:MarketData[],sender: string, tokenIn: Token, tokenOut: Token, amountIn: number, minAmount: number){

    let pathList: {addr:string,code_hash:string}[] = []
    for(let step of stepList){
        pathList.push({addr: step.contract,code_hash:step.codeHash ?? ""})
    }


    let quantityIn = new BigNumber(amountIn).shiftedBy(tokenIn.decimals).toString()
    let quantityOut = new BigNumber(minAmount).shiftedBy(tokenOut.decimals).toString()
    //expected_return: quantityOut,

    let swapMsg = {
        swap_tokens_for_exact:{
            expected_return: quantityOut,
            path: pathList
        }
    }
    let buf = Buffer.from(JSON.stringify(swapMsg))
    let msg = new MsgExecuteContract({
        sender: sender,
        contract_address: tokenIn.contract,
        code_hash: tokenIn.codehash,
        msg: { 
            send: {
                recipient: routerList['shade'].contract,
                recipient_code_hash: routerList['shade'].codehash,
                amount: quantityIn,
                msg: buf.toString('base64')
            }    
        },
    })
    return msg
}


function getBlizzardSwapMsg(stepList:MarketData[],sender: string, tokenIn: Token, tokenOut: Token, amountIn: number, minAmount: number){


    let path: {pool_id: number, asset_in: string,asset_out: string}[] = []
    let feePath: {pool_id: number, asset_in: string,asset_out: string}[] = []
    let asset_in = tokenIn.contract
    
    for(let step of stepList){
        let asset_out = step.base === asset_in ? step.quote : step.base
        path.push({pool_id: step.id, asset_in: asset_in,asset_out: asset_out})
        feePath.push({pool_id: step.id, asset_in: asset_out,asset_out: asset_in})
        asset_in = asset_out
    }


    let quantityIn = new BigNumber(amountIn).shiftedBy(tokenIn.decimals).toString()
    let quantityOut = new BigNumber(minAmount).shiftedBy(tokenOut.decimals).toString()

    let swapMsg = {
        swap:{
            path: path,
            fee_path: feePath,
            min_amount_out:quantityOut,
        }
    }
    let buf = Buffer.from(JSON.stringify(swapMsg))
    let msg = new MsgExecuteContract({
        sender: sender,
        contract_address: tokenIn.contract,
        code_hash: tokenIn.codehash,
        msg: { 
            send: {
                recipient: routerList['blizzard'].contract,
                recipient_code_hash: routerList['blizzard'].codehash,
                amount: quantityIn,
                msg: buf.toString('base64')
            }    
        },
    })


    return msg
}



