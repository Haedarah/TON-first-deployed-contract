import { Address, beginCell, Cell, Contract, contractAddress, ContractProvider, Sender, SendMode } from "@ton/core";

export class MainContract implements Contract {
    //MainContract class is implementing Contract interface.
    //A contract interface on TON has 3 values:
    // 1. address: the address of the smart contract.
    // 2. init: the initial data of the contract. This includes its FunC code, along with what's going to be in the storgae part of the contract, once it is deployed. (mandatory)
    //          This part of the contract decides its address. An address on TON is deterministic. We can figure out the address of a contract even before it is deployed. (optional)
    // 3. abi: the contract code ABI. (optional)
    //In this interface we are building, we care about the address of the contract and the init code & data.
    constructor(readonly address: Address, readonly init?: { code: Cell; data: Cell }) {}
    

    static createFromConfig(config: any, code: Cell, workchain = 0) {
        const data = beginCell().endCell();
        const init = { code, data };
        const address = contractAddress(workchain, init);

        return new MainContract(address, init);
    }

    async sendInternalMessage(provider: ContractProvider, sender: Sender, value: bigint) {
        await provider.internal(sender, {
            value,
            sendMode: SendMode.PAY_GAS_SEPARATELY,
            body: beginCell().endCell(),
        });
    }

    async getData(provider: ContractProvider) {
        const { stack } = await provider.get("get__latest_sender", []);
        return {recent_sender: stack.readAddress()};
    }
}

/////////////////////////////////////////////((EXPLANATION))////////////////////////////////////////////

// In this code, we are basically creating an *interface* for our smart contract.
// It *wraps* our FunC smart contract and makes it easier to interact with in the test script.
// In this example, "MainContract.ts" is a wrapper of "main.fc" contract.