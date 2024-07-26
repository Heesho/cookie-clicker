const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const hre = require("hardhat");

// Constants
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;

const VOTER_ADDRESS = "0x580ABF764405aA82dC96788b356435474c5956A7";
const WBERA_ADDRESS = "0x7507c1dc16935B82698e4C63f2746A2fCf994dF8"; // WBERA address
const OBERO_ADDRESS = "0x7629668774f918c00Eb4b03AdF5C4e2E53d45f0b";

// Contract Variables
let units, key, factory, plugin, multicall;

/*===================================================================*/
/*===========================  CONTRACT DATA  =======================*/

async function getContracts() {
  units = await ethers.getContractAt(
    "contracts/Units.sol:Units",
    "0xb3aB3C4494a7c3194D5C3F2E8A6766e0FA31BB40"
  );
  key = await ethers.getContractAt(
    "contracts/Key.sol:Key",
    "0x1C3DFeA9D752EBb68555B926546Ae8E349Ec9226"
  );
  factory = await ethers.getContractAt(
    "contracts/Factory.sol:Factory",
    "0x3Cca4bE40E919934B0Eac987d63D9d1A288e9Bb1"
  );
  plugin = await ethers.getContractAt(
    "contracts/QueuePlugin.sol:QueuePlugin",
    "0x9be8e063e9d4fC60819A041420B3a52105673C1a"
  );
  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    "0x8Cca4af21250E86fcb64b9842A454Cf3e36A6695"
  );
  console.log("Contracts Retrieved");
}

/*===========================  END CONTRACT DATA  ===================*/
/*===================================================================*/

async function deployUnits() {
  console.log("Starting Units Deployment");
  const unitsArtifact = await ethers.getContractFactory("Units");
  const unitsContract = await unitsArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  units = await unitsContract.deployed();
  await sleep(5000);
  console.log("Units Deployed at:", units.address);
}

async function deployKey() {
  console.log("Starting Key Deployment");
  const keyArtifact = await ethers.getContractFactory("Key");
  const keyContract = await keyArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  key = await keyContract.deployed();
  await sleep(5000);
  console.log("Key Deployed at:", key.address);
}

async function deployFactory() {
  console.log("Starting Factory Deployment");
  const factoryArtifact = await ethers.getContractFactory("Factory");
  const factoryContract = await factoryArtifact.deploy(
    units.address,
    key.address,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  factory = await factoryContract.deployed();
  await sleep(5000);
  console.log("Factory Deployed at:", factory.address);
}

async function deployPlugin(wallet) {
  console.log("Starting Plugin Deployment");
  const pluginArtifact = await ethers.getContractFactory("QueuePlugin");
  const pluginContract = await pluginArtifact.deploy(
    WBERA_ADDRESS,
    VOTER_ADDRESS,
    [WBERA_ADDRESS],
    [WBERA_ADDRESS],
    wallet.address,
    factory.address,
    units.address,
    key.address,
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
    units.address,
    factory.address,
    key.address,
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
  console.log("Units: ", units.address);
  console.log("Key: ", key.address);
  console.log("Factory: ", factory.address);
  console.log("Plugin: ", plugin.address);
  console.log("Multicall: ", multicall.address);
  console.log("**************************************************************");
}

async function verifyUnits() {
  await hre.run("verify:verify", {
    address: units.address,
    constructorArguments: [],
  });
}

async function verifyKey() {
  await hre.run("verify:verify", {
    address: key.address,
    constructorArguments: [],
  });
}

async function verifyFactory() {
  await hre.run("verify:verify", {
    address: factory.address,
    constructorArguments: [units.address, key.address],
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
      OBERO_ADDRESS,
      factory.address,
      units.address,
      key.address,
    ],
  });
}

async function verifyMulticall() {
  await hre.run("verify:verify", {
    address: multicall.address,
    constructorArguments: [
      units.address,
      factory.address,
      key.address,
      plugin.address,
      OBERO_ADDRESS,
    ],
  });
}

async function setUpSystem(wallet) {
  console.log("Starting System Set Up");
  await units.connect(wallet).setMinter(factory.address, true);
  console.log("factory whitelisted to mint units.");
  await units.connect(wallet).setMinter(plugin.address, true);
  console.log("plugin whitelisted to mint units.");
  console.log("System Initialized");
}

async function setTools(wallet) {
  console.log("Starting Building Deployment");
  const buildingCosts = [
    convert("0.0000001", 18),
    convert("0.000001", 18),
    convert("0.000008", 18),
    convert("0.000047", 18),
    convert("0.00026", 18),
    convert("0.0014", 18),
    convert("0.0078", 18),
    convert("0.044", 18),
    convert("0.26", 18),
    convert("1.6", 18),
    convert("10", 18),
    convert("65", 18),
    convert("430", 18),
    convert("2900", 18),
    convert("21000", 18),
  ];
  const buildingPayouts = [
    convert("0.000015", 18),
    convert("0.0001", 18),
    convert("0.0011", 18),
    convert("0.012", 18),
    convert("0.13", 18),
    convert("0.6", 18),
    convert("3.2", 18),
    convert("17", 18),
    convert("100", 18),
    convert("600", 18),
    convert("4000", 18),
    convert("26000", 18),
    convert("170000", 18),
    convert("1100000", 18),
    convert("7000000", 18),
  ];
  await factory.connect(wallet).setTool(buildingCosts, buildingPayouts);
  console.log("Buildings set");
}

async function setToolMultipliers(wallet) {
  console.log("Starting Multiplier Deployment");
  await factory
    .connect(wallet)
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
  console.log("Multipliers set");
}

async function setLevels(wallet) {
  console.log("Starting Level Deployment");
  await factory
    .connect(wallet)
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
  console.log("Levels set");
}

async function main() {
  const [wallet] = await ethers.getSigners();
  console.log("Using wallet: ", wallet.address);

  await getContracts();

  // await deployUnits();
  // await deployKey();
  // await deployFactory();
  // await deployPlugin(wallet);
  // await deployMulticall();
  // await printDeployment();

  // await verifyUnits();
  // await verifyKey();
  // await verifyFactory();
  // await verifyPlugin();
  // await verifyMulticall();

  // await setUpSystem(wallet);
  // await setTools(wallet);
  // await setToolMultipliers(wallet);
  // await setLevels(wallet);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
