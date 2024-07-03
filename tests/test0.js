const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const pointZeroOne = convert("0.01", 18);
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

    await cookie.setMinter(clicker.address, true);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("User0 mints a clicker", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).mint({ value: pointZeroOne });
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).click(1);
    await clicker.connect(user0).click(1);
    await clicker.connect(user0).click(1);
  });

  it("Owner sets buildings", async function () {
    console.log("******************************************************");
    await clicker
      .connect(owner)
      .setBuilding(
        [
          ethers.utils.parseUnits("0.0000001", 18),
          ethers.utils.parseUnits("0.000001", 18),
          ethers.utils.parseUnits("0.000008", 18),
          ethers.utils.parseUnits("0.000047", 18),
          ethers.utils.parseUnits("0.00026", 18),
          ethers.utils.parseUnits("0.0014", 18),
          ethers.utils.parseUnits("0.0078", 18),
          ethers.utils.parseUnits("0.044", 18),
          ethers.utils.parseUnits("0.26", 18),
          ethers.utils.parseUnits("1.6", 18),
          ethers.utils.parseUnits("10", 18),
          ethers.utils.parseUnits("65", 18),
          ethers.utils.parseUnits("430", 18),
          ethers.utils.parseUnits("2900", 18),
          ethers.utils.parseUnits("21000", 18),
        ],
        [
          ethers.utils.parseUnits("0.000015", 18),
          ethers.utils.parseUnits("0.0001", 18),
          ethers.utils.parseUnits("0.0011", 18),
          ethers.utils.parseUnits("0.012", 18),
          ethers.utils.parseUnits("0.13", 18),
          ethers.utils.parseUnits("1.4", 18),
          ethers.utils.parseUnits("20", 18),
          ethers.utils.parseUnits("330", 18),
          ethers.utils.parseUnits("5100", 18),
          ethers.utils.parseUnits("75000", 18),
          ethers.utils.parseUnits("1000000", 18),
          ethers.utils.parseUnits("14000000", 18),
          ethers.utils.parseUnits("170000000", 18),
          ethers.utils.parseUnits("2100000000", 18),
          ethers.utils.parseUnits("26000000000", 18),
        ],
        [
          1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000,
          1000, 1000, 1000, 1000,
        ]
      );
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).purchaseBuilding(1, 0, 1);
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
    await clicker.connect(user0).purchaseBuilding(1, 0, 5);
  });

  it("Owner sets levels", async function () {
    console.log("******************************************************");
    await clicker
      .connect(owner)
      .setLvl(
        [
          "0",
          "10",
          "50",
          "500",
          "50000",
          "5000000",
          "500000000",
          "500000000000",
          "500000000000000",
          "500000000000000000",
          "500000000000000000000",
        ],
        [0, 1, 5, 25, 50, 100, 150, 200, 250, 300, 350]
      );
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getBakery(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getBuildings(1));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).upgradeBuilding(1, 0);
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).purchaseBuilding(1, 0, 4);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getBakery(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getBuildings(1));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).upgradeBuilding(1, 0);
  });

  it("User0 upgrades clicker", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).upgradeClicker(1);
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getBakery(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getBuildings(1));
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
    console.log(await multicall.getBakery(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getBuildings(1));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).purchaseBuilding(1, 3, 1);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getBakery(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getBuildings(1));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getBakery(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getBuildings(1));
  });

  it("User0 building id 1 costs", async function () {
    console.log("******************************************************");
    console.log(await clicker.getMultipleBuildingCost(0, 10, 15));
    console.log(await multicall.getMultipleBuildingCost(1, 0, 5));
    console.log(await clicker.getMultipleBuildingCost(0, 10, 27));
    console.log(await multicall.getMultipleBuildingCost(1, 0, 17));
  });
});
