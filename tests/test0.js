const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const pointZeroOne = convert("0.01", 18);
const price = convert("0.04269", 18);
const price2 = convert("0.08538", 18);
const price10 = convert("0.4269", 18);
const price100 = convert("4.269", 18);
const gamePrice = convert("0.69", 18);

let owner, treasury, user0, user1, user2, user3, developer;
let base, voter;
let moola, bullas, bullish, factory, plugin, multicall, vaultFactory;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [owner, treasury, user0, user1, user2, user3, developer] =
      await ethers.getSigners();

    const vaultFactoryArtifact = await ethers.getContractFactory(
      "BerachainRewardsVaultFactory"
    );
    vaultFactory = await vaultFactoryArtifact.deploy();
    console.log("- Vault Factory Initialized");

    const baseArtifact = await ethers.getContractFactory("Base");
    base = await baseArtifact.deploy();
    console.log("- BASE Initialized");

    const voterArtifact = await ethers.getContractFactory("Voter");
    voter = await voterArtifact.deploy();
    console.log("- Voter Initialized");

    const bullasArtifact = await ethers.getContractFactory("Bullas");
    bullas = await bullasArtifact.deploy();
    console.log("- Bullas Initialized");

    const bullishArtifact = await ethers.getContractFactory("Bullish");
    bullish = await bullishArtifact.deploy(
      bullas.address,
      treasury.address,
      developer.address
    );
    console.log("- Bullish Initialized");

    const moolaArtifact = await ethers.getContractFactory("Moola");
    moola = await moolaArtifact.deploy();
    console.log("- Moola Initialized");

    const factoryArtifact = await ethers.getContractFactory("Factory");
    factory = await factoryArtifact.deploy(moola.address, bullish.address);
    console.log("- Factory Initialized");

    const pluginArtifact = await ethers.getContractFactory("QueuePlugin");
    plugin = await pluginArtifact.deploy(
      base.address,
      voter.address,
      [base.address],
      [base.address],
      treasury.address,
      developer.address,
      factory.address,
      moola.address,
      bullish.address,
      vaultFactory.address
    );
    console.log("- Plugin Initialized");

    const multicallArtifact = await ethers.getContractFactory("Multicall");
    multicall = await multicallArtifact.deploy(
      base.address,
      moola.address,
      factory.address,
      bullish.address,
      plugin.address,
      AddressZero
    );
    console.log("- Multicall Initialized");

    await moola.setMinter(factory.address, true);
    await moola.setMinter(plugin.address, true);
    await voter.setPlugin(plugin.address);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("User0 mints a clicker", async function () {
    console.log("******************************************************");
    await expect(bullish.connect(user0).claim(1)).to.be.reverted;
    await bullas.connect(user1).mint();
    await expect(bullish.connect(user0).claim(1)).to.be.revertedWith(
      "Bullish__NotBullasOwner"
    );
    await bullas.connect(user0).mint();
    await expect(bullish.connect(user0).claim(1)).to.be.revertedWith(
      "Bullish__NotBullasOwner"
    );
    await bullish.connect(user0).claim(2);
    await expect(bullish.connect(user0).claim(2)).to.be.revertedWith(
      "Bullish__AlreadyClaimed"
    );
  });

  it("User0 mints a clicker", async function () {
    console.log("******************************************************");
    console.log(
      "Bullish Balance: ",
      await ethers.provider.getBalance(bullish.address)
    );
    await bullish.connect(user1).mint({ value: gamePrice });
    await bullish.connect(owner).mintBatch(owner.address, 2);
    await bullish.connect(owner).transferFrom(owner.address, user2.address, 3);
    await bullish.connect(owner).transferFrom(owner.address, user3.address, 4);
    console.log(
      "Bullish Balance: ",
      await ethers.provider.getBalance(bullish.address)
    );
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 1, "this is a message", {
      value: price,
    });

    await expect(
      multicall.connect(user0).click(1, 1, "this is a message", {
        value: pointZeroOne,
      })
    ).to.be.reverted;

    await multicall.connect(user0).click(1, 1, "this is a message", {
      value: price,
    });

    await multicall.connect(user0).click(1, 2, "this is a message", {
      value: price2,
    });
  });

  it("Owner sets tools", async function () {
    console.log("******************************************************");
    await factory
      .connect(owner)
      .setTool(
        [
          ethers.utils.parseUnits("0.0000001", 18),
          ethers.utils.parseUnits("0.000001", 18),
          ethers.utils.parseUnits("0.000008", 18),
          ethers.utils.parseUnits("0.000047", 18),
          ethers.utils.parseUnits("0.00026", 18),
          ethers.utils.parseUnits("0.0014", 18),
        ],
        [
          ethers.utils.parseUnits("0.000015", 18),
          ethers.utils.parseUnits("0.0001", 18),
          ethers.utils.parseUnits("0.0011", 18),
          ethers.utils.parseUnits("0.012", 18),
          ethers.utils.parseUnits("0.13", 18),
          ethers.utils.parseUnits("1.4", 18),
        ]
      );
  });

  it("Owner sets tool multipliers", async function () {
    console.log("******************************************************");
    await factory.connect(owner).setToolMultipliers([
      "1000000000000000000", // 1
      "1150000000000000000", // 2
      "1322500000000000000", // 3
      "1520875000000000000", // 4
      "1749006250000000000", // 5
      "2011357187500000000", // 6
      "2313060768750000000", // 7
      "2660019884062500000", // 8
      "3059022867265625000", // 9
      "3517876297355468750", // 10
      "4045557736969289062",
      "4652391392514672421",
      "5350250105891873285",
      "6152787621674654277",
      "7075705764925852415",
      "8137061629665738723",
      "9357620874116591137",
      "10761264009734079868",
      "12375453609734181844",
      "14231771647954150830", // 20
      "16366537393147273455",
      "18821517902019348493",
      "21644745787322255767",
      "24891457556820594132",
      "28625176193143683252",
      "32918952612105216229",
      "37856795515121028664",
      "43535314841394182944",
      "50065612067598320385",
      "57575453877633198463", // 30
      "66211771960298198222",
      "76143537754252997955",
      "87565068417320947649",
      "10069982869941708939",
      "11580480300432965283",
      "13317552345497960076",
      "15315185197222654087",
      "17612462976706053100",
      "20254332423211961060",
      "23292482286663755219", // 40
    ]);
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 1);
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 claims moola", async function () {
    console.log("******************************************************");
    await factory.connect(user0).claim(1);
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 5);
  });

  it("Owner sets levels", async function () {
    console.log("******************************************************");
    await factory
      .connect(owner)
      .setLvl(["0", "10", "50", "500"], [0, 1, 5, 25]);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradeTool(1, 0);
  });

  it("User0 purchases building", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 4);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradeTool(1, 0);
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("Get id of owner", async function () {
    console.log("******************************************************");
    console.log(await bullish.tokenOfOwnerByIndex(user0.address, 0));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 3, 1);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 building id 1 costs", async function () {
    console.log("******************************************************");
    console.log(await factory.getMultipleToolCost(0, 10, 15));
    console.log(await multicall.getMultipleToolCost(1, 0, 5));
    console.log(await factory.getMultipleToolCost(0, 10, 27));
    console.log(await multicall.getMultipleToolCost(1, 0, 17));
  });

  it("Forward 8 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
    await network.provider.send("evm_mine");
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building1", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 1, 10);
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building2", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 2, 10);
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building3", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 3, 9);
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building4", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 4, 10);
  });

  it("Forward Time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
  });

  it("User0 purchases building5", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 5, 10);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 20);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 1, 10);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 1, 10);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 2, 8);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("Forward 8 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [4 * 7200]);
    await network.provider.send("evm_mine");
  });

  it("User0 bakery state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 1, "this is a message", {
      value: price,
    });

    await multicall.connect(user0).click(1, 1, "this is a message", {
      value: price,
    });

    await multicall.connect(user0).click(1, 1, "this is a message", {
      value: price,
    });
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 2, "this is a message", {
      value: price2,
    });

    await multicall.connect(user0).click(1, 2, "this is a message", {
      value: price2,
    });

    await multicall.connect(user0).click(1, 2, "this is a message", {
      value: price2,
    });
  });

  it("Forward 100 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [100]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    await multicall.connect(user3).click(1, 10, "this is a message", {
      value: price10,
    });

    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });

    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("View Queue", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueue());
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Count: ", await plugin.count());
  });

  it("Queue Data 2", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueueSize());
  });

  it("Queue Data 3", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueueFragment(0, 10));
  });

  it("Claim and distro from plugin", async function () {
    console.log("******************************************************");
    console.log("Treasury Balance: ", await base.balanceOf(treasury.address));
    await plugin.claimAndDistribute();
    console.log("Treasury Balance: ", await base.balanceOf(treasury.address));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 2, 12);
    await factory.connect(user0).purchaseTool(1, 3, 20);
    await factory.connect(user0).purchaseTool(1, 4, 20);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 5, 20);
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getTools(1));
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("claim", async function () {
    console.log("******************************************************");
    await factory.claim(1);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("claim", async function () {
    console.log("******************************************************");
    await factory.claim(1);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 building1 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 10);
    await factory.connect(user0).purchaseTool(1, 1, 10);
    await factory.connect(user0).purchaseTool(1, 2, 10);
    await factory.connect(user0).purchaseTool(1, 3, 10);
    await factory.connect(user0).purchaseTool(1, 4, 10);
    await factory.connect(user0).purchaseTool(1, 5, 10);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 4, 5)
    ).to.be.revertedWith("Factory__AmountMaxed");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 5, 5)
    ).to.be.revertedWith("Factory__AmountMaxed");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 6, 5)
    ).to.be.revertedWith("Factory__ToolDoesNotExist");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 7, 1)
    ).to.be.revertedWith("Factory__ToolDoesNotExist");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 7, 5)
    ).to.be.revertedWith("Factory__ToolDoesNotExist");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await expect(
      factory.connect(user0).purchaseTool(1, 7, 5)
    ).to.be.revertedWith("Factory__ToolDoesNotExist");
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await factory.claim(1);
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).upgradeTool(1, 0);
    await factory.connect(user0).upgradeTool(1, 1);
    await factory.connect(user0).upgradeTool(1, 2);
    await factory.connect(user0).upgradeTool(1, 3);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await expect(factory.connect(user0).upgradeTool(1, 0)).to.be.revertedWith(
      "Factory__LevelMaxed"
    );
    await factory.connect(user0).upgradeTool(1, 1);
    await factory.connect(user0).upgradeTool(1, 2);
    await factory.connect(user0).upgradeTool(1, 3);
  });

  it("User0 upgrades building0", async function () {
    console.log("******************************************************");
    await expect(factory.connect(user0).upgradeTool(1, 0)).to.be.revertedWith(
      "Factory__LevelMaxed"
    );
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 100, "this is a message", {
      value: price100,
    });

    await multicall.connect(user0).click(1, 100, "this is a message", {
      value: price100,
    });

    await multicall.connect(user0).click(1, 100, "this is a message", {
      value: price100,
    });
  });

  it("Queue Data 2", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueueSize());
  });

  it("Forward 5 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [5 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 100, "this is a message", {
      value: price100,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user1).click(2, 100, "this is a message", {
      value: price100,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user2).click(3, 100, "this is a message", {
      value: price100,
    });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 100, "this is a message", {
      value: price100,
    });
  });

  // queue data
  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user1).click(2, 100, "this is a message", {
      value: price100,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user2).click(3, 100, "this is a message", {
      value: price100,
    });
  });

  it("Queue Data 2", async function () {
    console.log("******************************************************");
    console.log(await plugin.getQueueSize());
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 1, "this is a message", {
      value: price,
    });
    await multicall.connect(user1).click(2, 1, "this is a message", {
      value: price,
    });
    await multicall.connect(user2).click(3, 1, "this is a message", {
      value: price,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");

    await multicall.connect(user0).click(1, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user1).click(2, 10, "this is a message", {
      value: price10,
    });
    await multicall.connect(user2).click(3, 10, "this is a message", {
      value: price10,
    });
  });

  it("Queue Data", async function () {
    console.log("******************************************************");
    console.log("Head: ", await plugin.head());
    console.log("Tail: ", await plugin.tail());
    console.log("Size: ", await plugin.count());
  });

  it("Bullish Testing", async function () {
    console.log("******************************************************");
    await expect(bullish.connect(user0).setTreasury(user0.address)).to.be
      .reverted;
    await bullish.connect(owner).setTreasury(user0.address);
    await bullish.connect(owner).setTreasury(treasury.address);
    await expect(
      bullish.connect(owner).setDeveloper(user0.address)
    ).to.be.revertedWith("Bullish__NotAuthorized");
    await bullish.connect(developer).setDeveloper(user0.address);
    await expect(
      bullish.connect(developer).setDeveloper(developer.address)
    ).to.be.revertedWith("Bullish__NotAuthorized");
    await bullish.connect(user0).setDeveloper(developer.address);
    await expect(
      bullish.connect(user0).mint({ value: price2 })
    ).to.be.revertedWith("Bullish__InsufficientFunds");
    await expect(bullish.connect(developer).setPrice(0)).to.be.reverted;
    await bullish.connect(owner).setPrice(price);
    console.log(
      "Bullish Balance: ",
      await ethers.provider.getBalance(bullish.address)
    );
    await expect(
      bullish.connect(user0).mint({ value: price2 })
    ).to.be.revertedWith("Bullish__InsufficientFunds");
    await bullish.connect(user0).mint({ value: price });
    await bullish.connect(user1).mint({ value: price });
    await bullish.connect(user2).mint({ value: price });
    console.log(
      "Bullish Balance: ",
      await ethers.provider.getBalance(bullish.address)
    );
    await bullish.connect(owner).setBaseTokenURI("https://www.google.com");
    console.log(await bullish.tokenURI(1));
    console.log(await bullish.tokenURI(2));
    console.log(await bullish.tokenURI(3));
    await expect(bullish.connect(developer).mintBatch(user0.address, 10)).to.be
      .reverted;
    await bullish.connect(owner).mintBatch(user0.address, 10);
    console.log(
      "Bullish Balance: ",
      await ethers.provider.getBalance(bullish.address)
    );
    console.log(
      "Treasury Balance: ",
      await ethers.provider.getBalance(treasury.address)
    );
    console.log(
      "Developer Balance: ",
      await ethers.provider.getBalance(developer.address)
    );
    await bullish.connect(owner).withdraw();
    console.log(
      "Bullish Balance: ",
      await ethers.provider.getBalance(bullish.address)
    );
    console.log(
      "Treasury Balance: ",
      await ethers.provider.getBalance(treasury.address)
    );
    console.log(
      "Developer Balance: ",
      await ethers.provider.getBalance(developer.address)
    );
  });
});
