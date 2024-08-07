import { Cell, toNano } from "@ton/core";
import { hex } from "../build/main.compiled.json";
import { Blockchain, SandboxContract, TreasuryContract } from "@ton/sandbox";
import { MainContract } from "../wrappers/MainContract";
import "@ton/test-utils";

describe("main.fc contract tests", () => {

    let blockchain: Blockchain;
    let myContract: SandboxContract<MainContract>;
    let initWallet: SandboxContract<TreasuryContract>;
    let ownerWallet: SandboxContract<TreasuryContract>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();
        initWallet = await blockchain.treasury("initWallet");
        ownerWallet = await blockchain.treasury("ownerWallet");

        const codeCell = Cell.fromBoc(Buffer.from(hex, "hex"))[0];

        myContract = blockchain.openContract(
            await MainContract.createFromConfig(
              {
                number: 0,
                address: initWallet.address,
                owner_address: ownerWallet.address,
              },
              codeCell
            )
        );
    });
    
    it("should correctly increase the contract counter and return the correct most recent msg-sender", async () => {
        const senderWallet1 = await blockchain.treasury("sender1");
        const senderWallet2 = await blockchain.treasury("sender2");

        const sentMessageResult1 = await myContract.sendIncrement(
            senderWallet1.getSender(),
            toNano("0.05")
        );
        
        expect(sentMessageResult1.transactions).toHaveTransaction({
            from: senderWallet1.address,
            to: myContract.address,
            success: true,
        });
        
        const data1 = await myContract.getData();

        expect(data1.recent_sender.toString()).toBe(senderWallet1.address.toString());
        expect(data1.number).toEqual(1);
      
        const sentMessageResult2 = await myContract.sendIncrement(
            senderWallet2.getSender(),
            toNano("0.05")
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

    it("should successfully deposit funds", async () => {
        const senderWallet1 = await blockchain.treasury("sender1");

        const depositMessageResult = await myContract.sendDeposit(
            senderWallet1.getSender(),
            toNano("5")
        );

        expect(depositMessageResult.transactions).toHaveTransaction({
        from: senderWallet1.address,
        to: myContract.address,
        success: true,
        });

        const balanceRequest = await myContract.getBalance();

        expect(balanceRequest.balance).toBeGreaterThan(toNano("4.99"));        
    });

    it("should return deposit funds as no command is sent", async () => {
        const senderWallet1 = await blockchain.treasury("sender1");
        
        const depositMessageResult = await myContract.sendDepositeNoCode(
            senderWallet1.getSender(),
            toNano("5")
        );

        expect(depositMessageResult.transactions).toHaveTransaction({
            from: senderWallet1.address,
            to: myContract.address,
            success: false,
        });

        const balanceRequest = await myContract.getBalance();

        expect(BigInt(balanceRequest.balance)).toEqual(toNano("0"));
    });

    it("should successfully withdraw funds on behalf of owner", async () => {
        const senderWallet1 = await blockchain.treasury("sender1");

        await myContract.sendDeposit(senderWallet1.getSender(),toNano("5")); //Funding the contract first before withdrawing coins from it.

        const BalanceRequest_initial = (await myContract.getBalance()).balance;

        const withdrawalMessageResult=await myContract.sendWithdrawalRequest(
            ownerWallet.getSender(),
            toNano("0.05"),//gas
            toNano("2")//withdrawal request amount
        );

        expect(withdrawalMessageResult.transactions).toHaveTransaction({
        from: myContract.address,
        to: ownerWallet.address,
        success: true,
        value: toNano("2")
        });

        const balanceRequest = (await myContract.getBalance()).balance;

        expect(balanceRequest).toBeLessThan(BalanceRequest_initial);
    });

    it("fails to withdraw funds on behalf of non-owner", async () => {
        const senderWallet1 = await blockchain.treasury("sender1");

        await myContract.sendDeposit(senderWallet1.getSender(),toNano("5")); //Funding the contract first before withdrawing coins from it.

        const BalanceRequest_initial = (await myContract.getBalance()).balance;

        const withdrawalMessageResult=await myContract.sendWithdrawalRequest(
            senderWallet1.getSender(),
            toNano("0.05"),//gas
            toNano("2")//withdrawal request amount
        );

        expect(withdrawalMessageResult.transactions).toHaveTransaction({
        from: senderWallet1.address,
        to: myContract.address,
        success: false,
        exitCode:101
        });

        const balanceRequest = (await myContract.getBalance()).balance;

        expect(balanceRequest).toBeCloseTo(BalanceRequest_initial);
    });

    it("fails to withdraw funds because lack of balance", async () => {
        const withdrawalMessageResult=await myContract.sendWithdrawalRequest(
            ownerWallet.getSender(),
            toNano("0.05"),//gas
            toNano("2")//withdrawal request amount
        );

        expect(withdrawalMessageResult.transactions).toHaveTransaction({
        from: ownerWallet.address,
        to: myContract.address,
        success: false,
        exitCode:102
        });
    });
});