const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const hre = require("hardhat");

// Constants
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;

const VOTER_ADDRESS = "0xd7ea36ECA1cA3E73bC262A6D05DB01E60AE4AD47";
const OBERO_ADDRESS = "0x40A8d9efE6A2C6C9D193Cc0A4476767748E68133";
const WBERA_ADDRESS = "0x6969696969696969696969696969696969696969";
const VAULT_FACTORY_ADDRESS = "0x94Ad6Ac84f6C6FbA8b8CCbD71d9f4f101def52a8";
const BULLAS_ADDRESS = "0x333814f5E16EEE61d0c0B03a5b6ABbD424B381c2";
const DEVELOPER_ADDRESS = "0x2e4c3da66Da4100185Ed0Afdd059865aC1e787C3";
const MULTISIG_ADDRESS = "0x83C0d763Ea742166485688BdC06fd155cba29075";

// Contract Variables
let moola, bullish, factory, plugin, multicall;

/*===================================================================*/
/*===========================  CONTRACT DATA  =======================*/

async function getContracts() {
  moola = await ethers.getContractAt(
    "contracts/Moola.sol:Moola",
    "0x331865bF2eA19E94bBF438Cf4ee590cB6392E5A9"
  );
  bullish = await ethers.getContractAt(
    "contracts/Bullish.sol:Bullish",
    "0xe1d8215F710Da00d9918ebB649DDF1928Ad55896"
  );
  factory = await ethers.getContractAt(
    "contracts/Factory.sol:Factory",
    "0x8d15Db9CeE68beF3beb65c576180e6D83F5c431D"
  );
  plugin = await ethers.getContractAt(
    "contracts/QueuePlugin.sol:QueuePlugin",
    "0xE259A689D13139F413eE693BE27181192319a629"
  );
  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    "0x2972e38A38956148AA93801A8A78459020a34523"
  );
  console.log("Contracts Retrieved");
}

/*===========================  END CONTRACT DATA  ===================*/
/*===================================================================*/

async function deployMoola() {
  console.log("Starting Moola Deployment");
  const moolaArtifact = await ethers.getContractFactory("Moola");
  const moolaContract = await moolaArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  moola = await moolaContract.deployed();
  await sleep(5000);
  console.log("Moola Deployed at:", moola.address);
}

async function deployBullish() {
  console.log("Starting Bullish Deployment");
  const bullishArtifact = await ethers.getContractFactory("Bullish");
  const bullishContract = await bullishArtifact.deploy(
    BULLAS_ADDRESS,
    MULTISIG_ADDRESS,
    DEVELOPER_ADDRESS,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  bullish = await bullishContract.deployed();
  await sleep(5000);
  console.log("Bullish Deployed at:", bullish.address);
}

async function deployFactory() {
  console.log("Starting Factory Deployment");
  const factoryArtifact = await ethers.getContractFactory("Factory");
  const factoryContract = await factoryArtifact.deploy(
    moola.address,
    bullish.address,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  factory = await factoryContract.deployed();
  await sleep(5000);
  console.log("Factory Deployed at:", factory.address);
}

async function deployPlugin() {
  console.log("Starting Plugin Deployment");
  const pluginArtifact = await ethers.getContractFactory("QueuePlugin");
  const pluginContract = await pluginArtifact.deploy(
    WBERA_ADDRESS,
    VOTER_ADDRESS,
    [WBERA_ADDRESS],
    [WBERA_ADDRESS],
    MULTISIG_ADDRESS,
    DEVELOPER_ADDRESS,
    factory.address,
    moola.address,
    bullish.address,
    VAULT_FACTORY_ADDRESS,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  plugin = await pluginContract.deployed();
  await sleep(5000);
  console.log("Plugin Deployed at:", plugin.address);
}

async function deployMulticall() {
  console.log("Starting Multicall Deployment");
  const multicallArtifact = await ethers.getContractFactory("Multicall");
  const multicallContract = await multicallArtifact.deploy(
    WBERA_ADDRESS,
    moola.address,
    factory.address,
    bullish.address,
    plugin.address,
    OBERO_ADDRESS,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  multicall = await multicallContract.deployed();
  console.log("Multicall Deployed at:", multicall.address);
}

async function printDeployment() {
  console.log("**************************************************************");
  console.log("Moola: ", moola.address);
  console.log("Bullish: ", bullish.address);
  console.log("Factory: ", factory.address);
  console.log("Plugin: ", plugin.address);
  console.log("Multicall: ", multicall.address);
  console.log("Reward Vault: ", await plugin.getRewardVault());
  console.log("Vault Token: ", await plugin.getVaultToken());
  console.log("**************************************************************");
}

async function verifyMoola() {
  await hre.run("verify:verify", {
    address: moola.address,
    constructorArguments: [],
  });
}

async function verifyBullish() {
  await hre.run("verify:verify", {
    address: bullish.address,
    constructorArguments: [BULLAS_ADDRESS, MULTISIG_ADDRESS, DEVELOPER_ADDRESS],
  });
}

async function verifyFactory() {
  await hre.run("verify:verify", {
    address: factory.address,
    constructorArguments: [moola.address, bullish.address],
  });
}

async function verifyPlugin() {
  await hre.run("verify:verify", {
    address: plugin.address,
    constructorArguments: [
      WBERA_ADDRESS,
      VOTER_ADDRESS,
      [WBERA_ADDRESS],
      [WBERA_ADDRESS],
      MULTISIG_ADDRESS,
      DEVELOPER_ADDRESS,
      factory.address,
      moola.address,
      bullish.address,
      VAULT_FACTORY_ADDRESS,
    ],
  });
}

async function verifyMulticall() {
  await hre.run("verify:verify", {
    address: multicall.address,
    constructorArguments: [
      WBERA_ADDRESS,
      moola.address,
      factory.address,
      bullish.address,
      plugin.address,
      OBERO_ADDRESS,
    ],
  });
}

async function setUpSystem(wallet) {
  console.log("Starting System Set Up");
  await moola.connect(wallet).setMinter(factory.address, true);
  console.log("factory whitelisted to mint moola.");
  await moola.connect(wallet).setMinter(plugin.address, true);
  console.log("plugin whitelisted to mint moola.");
  console.log("System Initialized");
}

async function setTools(wallet) {
  console.log("Starting Building Deployment");
  const buildingUps = [
    convert("0.0001", 18),
    convert("0.0002", 18),
    convert("0.0003", 18),
    convert("0.0004", 18),
    convert("0.0005", 18),
    convert("0.0006", 18),
    convert("0.0007", 18),
    convert("0.0008", 18),
    convert("0.001", 18),
    convert("0.0027", 18),
    convert("0.005", 18),
    convert("0.0075", 18),
    convert("0.015", 18),
    convert("0.025", 18),
    convert("0.1", 18),
    convert("0.2", 18),
    convert("0.3", 18),
    convert("0.4", 18),
    convert("0.5", 18),
    convert("1", 18),
  ];
  const buildingCost = [
    convert("1", 18),
    convert("2", 18),
    convert("3", 18),
    convert("4", 18),
    convert("5", 18),
    convert("8", 18),
    convert("11", 18),
    convert("15", 18),
    convert("20", 18),
    convert("50", 18),
    convert("100", 18),
    convert("150", 18),
    convert("300", 18),
    convert("500", 18),
    convert("1500", 18),
    convert("5000", 18),
    convert("15000", 18),
    convert("60000", 18),
    convert("250000", 18),
    convert("1000000", 18),
  ];
  await factory.connect(wallet).setTool(buildingUps, buildingCost);
  console.log("Buildings set");
}

async function setToolMultipliers(wallet) {
  console.log("Starting Multiplier Deployment");
  const buildingMultipliers = [
    convert("1", 18),
    convert("1.15", 18),
    convert("1.3225", 18),
    convert("1.520875", 18),
    convert("1.74900625", 18),
    convert("2.011357188", 18),
    convert("2.313060766", 18),
    convert("2.66001988", 18),
    convert("3.059022863", 18),
    convert("3.517876292", 18),
    convert("4.045557736", 18),
    convert("4.652391396", 18),
    convert("5.350250105", 18),
    convert("6.152787621", 18),
    convert("7.075705764", 18),
    convert("8.137061629", 18),
    convert("9.357620874", 18),
    convert("10.761264", 18),
    convert("12.37545361", 18),
    convert("14.23177165", 18),
    convert("16.36653739", 18),
    convert("18.821518", 18),
    convert("21.6447457", 18),
    convert("24.89145756", 18),
    convert("28.62517619", 18),
    convert("32.91895262", 18),
    convert("37.85679551", 18),
    convert("43.53531484", 18),
    convert("50.06561207", 18),
    convert("57.57545388", 18),
    convert("66.21177196", 18),
    convert("76.14353775", 18),
    convert("87.56506841", 18),
    convert("100.6998287", 18),
    convert("115.804803", 18),
    convert("133.1755234", 18),
    convert("153.1518519", 18),
    convert("176.1246297", 18),
    convert("202.5433242", 18),
    convert("232.9248228", 18),
    convert("267.8635462", 18),
    convert("308.0430782", 18),
    convert("354.2495399", 18),
    convert("407.3869709", 18),
    convert("468.4950165", 18),
    convert("538.769269", 18),
    convert("619.5846593", 18),
    convert("712.5223582", 18),
    convert("819.400712", 18),
    convert("942.3108188", 18),
    convert("1083.657442", 18),
    convert("1246.206058", 18),
    convert("1433.136966", 18),
    convert("1648.107511", 18),
    convert("1895.323638", 18),
    convert("2179.622184", 18),
    convert("2506.565512", 18),
    convert("2882.550338", 18),
    convert("3314.932889", 18),
    convert("3812.172822", 18),
    convert("4383.998746", 18),
    convert("5041.598558", 18),
    convert("5797.838341", 18),
    convert("6667.514092", 18),
    convert("7667.641206", 18),
    convert("8817.787387", 18),
    convert("10140.4555", 18),
    convert("11661.52382", 18),
    convert("13410.75239", 18),
    convert("15422.36525", 18),
    convert("17735.72004", 18),
    convert("20396.07804", 18),
    convert("23455.48975", 18),
    convert("26973.81321", 18),
    convert("31019.8852", 18),
    convert("35672.86798", 18),
    convert("41023.79817", 18),
    convert("47177.3679", 18),
    convert("54253.97308", 18),
    convert("62392.06904", 18),
    convert("71750.8794", 18),
    convert("82513.51131", 18),
    convert("94890.53801", 18),
    convert("109124.1187", 18),
    convert("125492.7365", 18),
    convert("144316.647", 18),
    convert("165964.144", 18),
    convert("190858.7656", 18),
    convert("219487.5805", 18),
    convert("252410.7176", 18),
    convert("290272.3252", 18),
    convert("333813.174", 18),
    convert("383885.1501", 18),
    convert("441467.9226", 18),
    convert("507688.111", 18),
    convert("583841.3276", 18),
    convert("671417.5268", 18),
    convert("772130.1558", 18),
    convert("887949.6792", 18),
    convert("1021142.131", 18),
  ];
  await factory.connect(wallet).setToolMultipliers(buildingMultipliers);
  console.log("Multipliers set");
}

async function setLevels(wallet) {
  console.log("Starting Level Deployment");
  await factory
    .connect(wallet)
    .setLvl(
      ["0", "10", "50", "500", "50000", "5000000"],
      [0, 1, 5, 25, 50, 100]
    );
  console.log("Levels set");
}

async function transferOwnership(wallet) {
  await moola.connect(wallet).transferOwnership(MULTISIG_ADDRESS);
  console.log("Moola ownership transferred to multisig");
  await sleep(5000);
  await bullish.connect(wallet).transferOwnership(MULTISIG_ADDRESS);
  console.log("Bullish ownership transferred to multisig");
  await sleep(5000);
  await factory.connect(wallet).transferOwnership(MULTISIG_ADDRESS);
  console.log("Factory ownership transferred to multisig");
  await sleep(5000);
  await plugin.connect(wallet).transferOwnership(MULTISIG_ADDRESS);
  console.log("Plugin ownership transferred to multisig");
}

async function main() {
  const [wallet] = await ethers.getSigners();

  console.log("Using wallet: ", wallet.address);

  await getContracts();

  // await deployMoola();
  // await deployBullish();
  // await deployFactory();
  // await deployPlugin();
  // await deployMulticall();
  // await printDeployment();

  // await verifyMoola();
  // await verifyBullish();
  // await verifyFactory();
  // await verifyPlugin();
  // await verifyMulticall();

  // await setUpSystem(wallet);
  // await setTools(wallet);
  // await setToolMultipliers(wallet);
  // await setLevels(wallet);

  await transferOwnership(wallet);

  // await plugin.setEntryFee("42690000000000000");

  console.log();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
