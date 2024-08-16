const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const pointZeroOne = convert("0.01", 18);
const one = convert("1", 18);

let owner, treasury, user0, user1, user2;
let base, voter;
let units, key, factory, plugin, multicall;

describe("local: test0", function () {
  before("Initial set up", async function () {
    console.log("Begin Initialization");

    [owner, treasury, user0, user1, user2] = await ethers.getSigners();

    const baseArtifact = await ethers.getContractFactory("Base");
    base = await baseArtifact.deploy();
    console.log("- BASE Initialized");

    const voterArtifact = await ethers.getContractFactory("Voter");
    voter = await voterArtifact.deploy();
    console.log("- Voter Initialized");

    const keyArtifact = await ethers.getContractFactory("Key");
    key = await keyArtifact.deploy();
    console.log("- Key Initialized");

    const unitsArtifact = await ethers.getContractFactory("Units");
    units = await unitsArtifact.deploy();
    console.log("- Units Initialized");

    const factoryArtifact = await ethers.getContractFactory("Factory");
    factory = await factoryArtifact.deploy(units.address, key.address);
    console.log("- Factory Initialized");

    const pluginArtifact = await ethers.getContractFactory("QueuePlugin");
    plugin = await pluginArtifact.deploy(
      base.address,
      voter.address,
      [base.address],
      [base.address],
      treasury.address,
      factory.address,
      units.address,
      key.address,
      pointZeroOne
    );
    console.log("- Plugin Initialized");

    const multicallArtifact = await ethers.getContractFactory("Multicall");
    multicall = await multicallArtifact.deploy(
      units.address,
      factory.address,
      key.address,
      plugin.address,
      AddressZero
    );
    console.log("- Multicall Initialized");

    await units.setMinter(factory.address, true);
    await units.setMinter(plugin.address, true);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("User0 mints a clicker", async function () {
    console.log("******************************************************");
    await key.connect(user0).mint();
    await key.connect(user1).mint();
    await key.connect(user2).mint();
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();

    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();

    console.log(res);
    await expect(
      plugin
        .connect(user0)
        .click(1, res.epochId, 1923762447, pointZeroOne, "this is a message", {
          value: pointZeroOne,
        })
    ).to.be.revertedWith("Plugin__ExceedsMaxPayment");
    console.log(res);
    await expect(
      plugin
        .connect(user0)
        .click(1, res.epochId, 1923762447, price, "this is a message", {
          value: pointZeroOne,
        })
    ).to.be.revertedWith("Plugin__InvalidPayment");

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));

    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));

    await expect(
      plugin
        .connect(user0)
        .click(1, res.epochId, 1923762447, price, "this is a message", {
          value: price,
        })
    ).to.be.revertedWith("Plugin__EpochIdMismatch");

    res = await plugin.getAuction();

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));

    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
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
        ]
      );
  });

  it("Owner sets tool multipliers", async function () {
    console.log("******************************************************");
    await factory
      .connect(owner)
      .setToolMultipliers([
        "1000000000000000000",
        "1150000000000000000",
        "1322500000000000000",
        "1520875000000000000",
        "1749006250000000000",
        "2011357187500000000",
        "2313060768750000000",
        "2660019884062500000",
        "3059022867265625000",
        "3517876297355468750",
        "4045557736969289062",
        "4652391392514672421",
        "5350250105891873285",
        "6152787621674654277",
        "7075705764925852415",
        "8137061629665738723",
        "9357620874116591137",
        "10761264009734079868",
        "12375453609734181844",
        "14231771647954150830",
        "16366537393147273455",
        "18821517902019348493",
        "21644745787322255767",
        "24891457556820594132",
        "28625176193143683252",
        "32918952612105216229",
        "37856795515121028664",
        "43535314841394182944",
        "50065612067598320385",
        "57575453877633198463",
        "66211771960298198222",
        "76143537754252997955",
        "87565068417320947649",
        "10069982869941708939",
        "11580480300432965283",
        "13317552345497960076",
        "15315185197222654087",
        "17612462976706053100",
        "20254332423211961060",
        "23292482286663755219",
        "26786354629563386402",
        "30804307823997894363",
        "35424953998547578427",
        "40738697098379715291",
        "46849501663136672535",
        "53876926912607173406",
        "61958465929798249316",
        "71252235819267986714",
        "81940071292158184721",
        "94231081886081832429",
        "10836574416999335555",
        "12462060579549233808",
        "14331369666481623980",
        "16481075166353877597",
        "18953236344506959186",
        "21796221830265903064",
        "25065655184705788524",
        "28825503362461656603",
        "33149328872230990093",
        "38121728203064738607",
        "43839987483524387828",
        "50415985506053045913",
        "57978383871960902700",
        "66675140952765438105",
        "76676412093680261321",
        "88177873807732200519",
        "10140455477989193059",
        "11661523849617504018",
        "13410752326730129621",
      ]);
  });

  it("Owner sets evolution", async function () {
    console.log("******************************************************");
    await factory
      .connect(owner)
      .setEvolution([
        "1000000000000000000",
        "2000000000000000000",
        "3000000000000000000",
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

  it("User0 claims units", async function () {
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
    console.log(await key.tokenOfOwnerByIndex(user0.address, 0));
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

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 20);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 1);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 10);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 10);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 10);
  });

  it("User0 purchases building0", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 0, 8);
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
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
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
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 600 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [100]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
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
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
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
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 2 hour", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [7200]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 500 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [500]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });
  });

  it("Forward 700 seconds", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [700]);
    await network.provider.send("evm_mine");
  });

  it("everyone clicks cookie", async function () {
    console.log("******************************************************");
    let price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    let res = await plugin.getAuction();
    await plugin
      .connect(user0)
      .click(1, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user1)
      .click(2, res.epochId, 1923762447, price, "this is a message", {
        value: price,
      });

    price = await plugin.getPrice();
    console.log("Click Price: ", divDec(price));
    res = await plugin.getAuction();
    await plugin
      .connect(user2)
      .click(3, res.epochId, 1923762447, price, "this is a message", {
        value: price,
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

  it("User0 evolves", async function () {
    console.log("******************************************************");
    await factory.connect(user0).evolve(1);
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
    await factory.connect(user0).purchaseTool(1, 0, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 1, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 2, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 3, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 4, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 5, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 6, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 7, 1);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 7, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
    await network.provider.send("evm_increaseTime", [8 * 3600]);
    await network.provider.send("evm_mine");
  });

  it("User0 purchases tool", async function () {
    console.log("******************************************************");
    await factory.connect(user0).purchaseTool(1, 7, 5);
  });

  it("Forward time 8 hours", async function () {
    console.log("******************************************************");
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
    await factory.connect(user0).upgradeTool(1, 0);
    await factory.connect(user0).upgradeTool(1, 1);
    await factory.connect(user0).upgradeTool(1, 2);
    await factory.connect(user0).upgradeTool(1, 3);
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });

  it("User0 evolves", async function () {
    console.log("******************************************************");
    await factory.connect(user0).evolve(1);
  });

  it("User0 state", async function () {
    console.log("******************************************************");
    console.log("USER0 STATE");
    console.log(await multicall.getFactory(1));
    console.log(await multicall.getUpgrades(1));
    console.log(await multicall.getTools(1));
  });
});
