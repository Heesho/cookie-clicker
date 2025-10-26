const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";

let owner, multisig, treasury, user0, user1, user2, user3;
let weth, cookie, bakery, factory, rewarder, multicall;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [owner, multisig, treasury, user0, user1, user2, user3] =
      await ethers.getSigners();

    const baseArtifact = await ethers.getContractFactory("Base");
    weth = await baseArtifact.deploy();
    console.log("- WETH Initialized");

    const cookieArtifact = await ethers.getContractFactory("Cookie");
    cookie = await cookieArtifact.deploy();
    console.log("- Cookie Initialized");

    const bakeryArtifact = await ethers.getContractFactory("Bakery");
    bakery = await bakeryArtifact.deploy(cookie.address, weth.address);
    console.log("- Bakery Initialized");

    const factoryArtifact = await ethers.getContractFactory("Factory");
    factory = await factoryArtifact.deploy(cookie.address);
    console.log("- Factory Initialized");

    const rewarderArtifact = await ethers.getContractFactory("Rewarder");
    rewarder = await rewarderArtifact.deploy(factory.address);
    console.log("- Rewarder Initialized");

    const multicallArtifact = await ethers.getContractFactory("Multicall");
    multicall = await multicallArtifact.deploy(
      cookie.address,
      weth.address,
      bakery.address,
      factory.address,
      rewarder.address
    );
    console.log("- Multicall Initialized");

    await factory
      .connect(owner)
      .setTool(
        [
          ethers.utils.parseUnits("1", 18),
          ethers.utils.parseUnits("10", 18),
          ethers.utils.parseUnits("100", 18),
        ],
        [
          ethers.utils.parseUnits("1", 18),
          ethers.utils.parseUnits("10", 18),
          ethers.utils.parseUnits("100", 18),
        ]
      );
    console.log("- Tools set");

    await factory
      .connect(owner)
      .setToolMultipliers([
        ethers.utils.parseUnits("1", 18),
        ethers.utils.parseUnits("2", 18),
        ethers.utils.parseUnits("3", 18),
        ethers.utils.parseUnits("4", 18),
        ethers.utils.parseUnits("5", 18),
        ethers.utils.parseUnits("6", 18),
        ethers.utils.parseUnits("7", 18),
        ethers.utils.parseUnits("8", 18),
        ethers.utils.parseUnits("9", 18),
        ethers.utils.parseUnits("10", 18),
      ]);
    console.log("- Tool multipliers set");

    await factory
      .connect(owner)
      .setLvl(["0", "10", "50", "500"], [0, 1, 5, 10]);
    console.log("- Lvl set");

    await bakery.connect(owner).initialize(factory.address);
    await factory.connect(owner).initialize(rewarder.address);
    await cookie.connect(owner).setMinter(bakery.address, true);
    await rewarder.connect(owner).addReward(cookie.address);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("Bakery state", async function () {
    console.log("******************************************************");
    const bakeryState = await multicall.getBakery();
    console.log(bakeryState);
  });

  it("User0 clicks", async function () {
    console.log("******************************************************");
    let res = await multicall.getBakery();
    await multicall.click(res.epochId, 1861439882, res.price, {
      value: res.price,
    });
  });
});
