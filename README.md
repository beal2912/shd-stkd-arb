# Shade Arbitrage scrt / stkd secret bot 

This typescript bot executes arbitrage between the sscrt / stkd-scrt market on Shade Swap and the price of unbonding in the stkd-scrt derivative contract.
The bot need scrt funds to be able to perform arbitrages.  

## Strategy

The bot start by checking the user scrt balance to see if there is enough funds to pay for tx fees, if there is more than the reserved fund (see .env file). it will wrap the surplus funds so they will be ready for a trade.
After that, the bot will check the market price and the stkd-scrt derivative contract price to see if an arbitrage is available.

It will use the maximum quantity of sscrt available and see if the gain will be over the threshold (tx fees + minimum percentage in the .env file). If it's true, the bot will make the trade to get stkd-scrt with a expected_return parameters to ensure that the arbitrage will be a win. 
If the trade is ok, the bot will directly unbond the stkd-scrt to start again when they will be released.
It will also check if any scrt token are claimable and claim them.

## Development Deepdive

To develop this project I choose a very simple design pattern so the functions and the strategy is easily readable by any developer. 
The main process of the bot is in the index.ts and you have a file for each group of functions, 
* the secret wallet, 
* the trades/simulation on shade swap, 
* the stkd-scrt derivative contract with balance unbounding and claiming.

You have class / interface for more generic function like to calculate a valid swap path using the shade swap pools and managing the rpc errors.
these classes could easily be used for more complex arbitrage bot and other dapps like Sienna and SecretSwap.

while coding this bot I kept in mind to optimize memory / cpu / maintainability : 
* limiting the number of dependencies
* limiting the number and size of classes
* limiting the number of requests on the network

what could be improved in future versions:
* adding Sienna stkd-SCRT pools to add more arbitrage possibilities (stkd-scrt / shd  and the stkd-scrt / sscrt could be interesting)
* adding a more complex strategies to do the arbitrage: the bot could use a limited amount of sscrt and keep some waiting for better price.  


# Prerequis

this bot was tested on Ubuntu 22.04.2 LTS with npm 8.19.3 and Node v19.1.0.
You need to setup your server before the next steps.

this bot need a secret network account with at least 0.5 $scrt to pay for transaction fees.


# Installation

1. clone the repo 

```
cd <your dir>
git clone git@github.com:beal2912/shd-stkd-arb.git .
```

2. install the node dependencies 
```
npm install
```
# Configuration

before running the bot you need to duplicate/rename the .env_example file as .env and setup your info
```
cp .env_example .env
``` 

then in the file, set up your mnemonic, I recommend using Keplr to set up a new address used only by the bot
```
# your mnemonics
MNEMONICS="your 24 words mnemonics ..."
```



and your viewing keys in the TokenList "key" fields
```
TOKENLIST='{ "tokens": [
                { 
                    "name":"sscrt", 
                    "contract": "secret1k0jntykt7e4g3y88ltc60czgjuqdy4c9e8fzek", 
                    "codehash": "af74387e276be8874f07bec3a87023ee49b0e7ebe08178c49d0a49c3c98ed60e",
                    "decimals": 6,
                    "key":"bf2e47b66aafxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
                    "min_amount": 10
                },
                ...
```
The viewing keys can be generated on the shade app by viewing your balance of each token in the portfolio tab
You also can retrieve it in Keplr (Secret Network > setting > tokens list)



# Run it

Run the bot

You can launch it directly without compilation but it's slower and use more memory
```
ts-node src/index.ts
```

You can compile it then run it as javascript
```
tsc -p .
node build/index.js
```
to stop the bot just use ctrl + c in linux or close the terminal

# set up the bot as a service 
this will allow you to run the bot 24/7

create a new file service file /etc/systemd/system/ named shd-stkd-bot.service 
you need to be root to edit the file
```
[Unit]
Description=shd-stkd-bot
[Service]
PIDFile=/tmp/shd-stkd-bot.pid
User=<your linux user>
Group=<your group>
Restart=always
KillSignal=SIGQUIT
WorkingDirectory=<path to your installation>
ExecStart=node <path to your installation>/build/index.js
[Install]
WantedBy=multi-user.target
```

```
# reload the service conf
sudo systemctl daemon-reload

# start the service 
sudo service shd-stkd-bot start
# stop the service
sudo service shd-stkd-bot stop
# restart the service 
sudo service shd-stkd-bot restart

# to follow what the service does with the log 
sudo journalctl -u shd-stkd-bot.service -f

# to debug the log 
sudo journalctl -u shd-stkd-bot.service

# if you want the service to start at boot 
sudo systemctl enable shd-stkd-bot.service

```