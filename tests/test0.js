const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const pointOne = convert("0.1", 18);
const one = convert("1", 18);
const eight = convert("8", 18);
const fifteen = convert("15", 18);
const fourtySeven = convert("47", 18);
const oneHundred = convert("100", 18);
const oneThousandOneHundred = convert("1100", 18);
const twelveThousand = convert("12000", 18);

let owner, user0, user1, user2;
let cookie, clicker, multicall;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [owner, multisig, treasury, user0, user1, user2] =
      await ethers.getSigners();

    const cookieArtifact = await ethers.getContractFactory("Cookie");
    cookie = await cookieArtifact.deploy();
    console.log("- Cookie Initialized");

    const clickerArtifact = await ethers.getContractFactory("Clicker");
    clicker = await clickerArtifact.deploy(cookie.address);
    console.log("- Clicker Initialized");

    const multicallArtifact = await ethers.getContractFactory("Multicall");
    multicall = await multicallArtifact.deploy(cookie.address, clicker.address);
    console.log("- Multicall Initialized");

    await cookie.transferOwnership(clicker.address);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("User0 mints a clicker", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).mint({ value: one });
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).click(1);
  });

  it("Owner sets buildings", async function () {
    console.log("******************************************************");
    await clicker
      .connect(owner)
      .setBuilding(
        [pointOne, one, eight, fourtySeven],
        [fifteen, oneHundred, oneThousandOneHundred, twelveThousand],
        [1, 1, 1, 1]
      );
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building0 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 0);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).purchaseBuilding(1, 0);
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building0 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 0);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 claims cookies", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).claim(1);
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await expect(
      clicker.connect(user0).purchaseBuilding(1, 0)
    ).to.be.revertedWith("Clicker__AmountMaxed");
  });

  it("Owner sets building0 max amount to 10", async function () {
    console.log("******************************************************");
    await clicker.connect(owner).setBuildingMaxAmount([0], [10]);
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).purchaseBuilding(1, 0);
    await clicker.connect(user0).purchaseBuilding(1, 0);
    await clicker.connect(user0).purchaseBuilding(1, 0);
    await clicker.connect(user0).purchaseBuilding(1, 0);
    await clicker.connect(user0).purchaseBuilding(1, 0);
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building0 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 0);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("Owner sets building0 levels", async function () {
    console.log("******************************************************");
    await clicker.connect(owner).setBuildingLvl(0, [0, oneHundred, oneHundred]);
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building0 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 0);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).upgradeBuilding(1, 0);
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building0 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 0);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).purchaseBuilding(1, 0);
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building0 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 0);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).upgradeBuilding(1, 0);
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).purchaseBuilding(1, 0);
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building0 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 0);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("Owner sets clciker levels", async function () {
    console.log("******************************************************");
    await clicker.connect(owner).setClickerLvl([0, oneHundred, oneHundred]);
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building0 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 0);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 upgrades clicker", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).upgradeClicker(1);
  });

  it("User0 clicker state", async function () {
    console.log("******************************************************");
    let res = await clicker.getClicker(1);
    console.log("USER0 STATE");
    console.log("Name: ", res.name);
    console.log("CpC: ", divDec(res.cpc));
    console.log("CpS: ", divDec(res.cps));
    console.log("Last Claimed: ", res.last);
    console.log("Clicker Level: ", res.lvl);
    console.log("Upgrade Cost: ", divDec(res.cost));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 1);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 2);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 3);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    let res = await clicker.getBuilding(1, 4);
    console.log("USER0 BUILDING0 STATE");
    console.log("Amount: ", res.amount);
    console.log("Level: ", res.lvl);
    console.log("CpS per Unit: ", divDec(res.cpsPerUnit));
    console.log("Total CpS: ", divDec(res.totalCps));
    console.log("Purchase Cost: ", divDec(res.purchaseCost));
    console.log("Upgrade Cost: ", divDec(res.upgradeCost));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getClickerState(1));
    console.log(await multicall.getBuildingState(1));
  });

  it("Owner sets buildings", async function () {
    console.log("******************************************************");
    await clicker
      .connect(owner)
      .setBuilding(
        [pointOne, one, eight, fourtySeven],
        [fifteen, oneHundred, oneThousandOneHundred, twelveThousand],
        [1, 1, 1, 1]
      );
  });

  it("Get id of owner", async function () {
    console.log("******************************************************");
    console.log(await clicker.tokenOfOwnerByIndex(user0.address, 0));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getClickerState(1));
    console.log(await multicall.getBuildingState(1));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).purchaseBuilding(1, 3);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getClickerState(1));
    console.log(await multicall.getBuildingState(1));
  });
});
