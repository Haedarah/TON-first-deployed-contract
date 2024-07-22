import { Cell, toNano } from "@ton/core";
// (1): Importing "Cell" data type from "ton/core" library. Our contract after compilation is stored in a Cell. We need to import "Cell"-
//      in order to be able to use our contract in our test script.
// (2): Importing "toNano" from "ton/core" library. A [TON] -> [gram] convertor. toNano("1")=1000000000 | toNano("2.254")=2354000000

import { hex } from "../build/main.compiled.json";
// Importing the HEX representation of our contract's cell, that is stored in "../build/main.compiled.json".

import { Blockchain } from "@ton/sandbox";
// Will be used to run our own instance of a blockchain for tests purposes.

import { MainContract } from "../wrappers/MainContract";

import "@ton/test-utils";

describe("main.fc contract tests", () => {

    it("should correctly increase the contract counter and return the correct most recent msg-sender", async () => {
       
        const blockchain = await Blockchain.create(); //creating a local instance of a blockchain
        const codeCell = Cell.fromBoc(Buffer.from(hex, "hex"))[0]; //restoring the hex of a cell into a real workwith-able cell

        const initAddress = await blockchain.treasury("initWallet") ;

        const myContract = blockchain.openContract(MainContract.createFromConfig({number: 0, address: initAddress.address}, codeCell)); //deploying our contract on the local blockchain we just spinned

        //creating two different users to help in testing
        //blockchain.treasury(string: seed phrase) creates a wallet address depending on the string that you pass to it.
        // furthur-explanation: If I pass my 24-word seed phrase as a string, it will create a wallet that has the same key pair as my wallet.
        const senderWallet1 = await blockchain.treasury("sender1");
        const senderWallet2 = await blockchain.treasury("sender2");

    //////After the above deployment, the contract is still not active. The three below commented lines won't work because it is an attempt to run a get method
    ////// on a non-active contract.    
        // const data0 = await myContract.getData();
        // expect(data0.recent_sender.toString()).toBe(initAddress.address.toString());
        // expect(data0.number).toEqual(0);

        //a message sent from user1 to the contract:
        const sentMessageResult1 = await myContract.sendIncrement(
            senderWallet1.getSender(),
            toNano("0.05"),
            1
        );
        
        //making sure that the message has been sent as intended
        expect(sentMessageResult1.transactions).toHaveTransaction({
            from: senderWallet1.address,
            to: myContract.address,
            success: true,
        });
        
        //reading data from our smart contract.
        const data1 = await myContract.getData();

        //check whether the contract is behaving as intended or not.
        expect(data1.recent_sender.toString()).toBe(senderWallet1.address.toString());
        expect(data1.number).toEqual(1);
      
        //a message sent from user2 to the contract:
        const sentMessageResult2 = await myContract.sendIncrement(
            senderWallet2.getSender(),
            toNano("0.05"),
            1
        );
        
        expect(sentMessageResult2.transactions).toHaveTransaction({
            from: senderWallet2.address,
            to: myContract.address,
            success: true,
        });
    
        const data2 = await myContract.getData();

        expect(data2.recent_sender.toString()).toBe(senderWallet2.address.toString());
        expect(data2.number).toEqual(2);
    });
  });