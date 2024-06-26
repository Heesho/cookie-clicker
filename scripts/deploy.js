const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const hre = require("hardhat");

// Constants
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;

// Contract Variables
let cookie, clicker, multicall;

/*===================================================================*/
/*===========================  CONTRACT DATA  =======================*/

async function getContracts() {
  cookie = await ethers.getContractAt(
    "contracts/Cookie.sol:Cookie",
    "0x03eDf18C2048F3b7612ceD1147100FaBA4f02e25"
  );
  clicker = await ethers.getContractAt(
    "contracts/Clicker.sol:Clicker",
    "0xE193d11579bc052b0359a61A83FdC852CAE0FB79"
  );
  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    "0x5Db084766Eea0dFC017e89Aa99bea3690bCA3B8e"
  );
  console.log("Contracts Retrieved");
}

/*===========================  END CONTRACT DATA  ===================*/
/*===================================================================*/

async function deployCookie() {
  console.log("Starting Cookie Deployment");
  const cookieArtifact = await ethers.getContractFactory("Cookie");
  const cookieContract = await cookieArtifact.deploy({
    gasPrice: ethers.gasPrice,
  });
  cookie = await cookieContract.deployed();
  await sleep(5000);
  console.log("Cookie Deployed at:", cookie.address);
}

async function deployClicker() {
  console.log("Starting Clicker Deployment");
  const clickerArtifact = await ethers.getContractFactory("Clicker");
  const clickerContract = await clickerArtifact.deploy(cookie.address, {
    gasPrice: ethers.gasPrice,
  });
  clicker = await clickerContract.deployed();
  await sleep(5000);
  console.log("Clicker Deployed at:", clicker.address);
}

async function deployMulticall() {
  console.log("Starting Multicall Deployment");
  const multicallArtifact = await ethers.getContractFactory("Multicall");
  const multicallContract = await multicallArtifact.deploy(
    cookie.address,
    clicker.address,
    {
      gasPrice: ethers.gasPrice,
    }
  );
  multicall = await multicallContract.deployed();
  console.log("Multicall Deployed at:", multicall.address);
}

async function printDeployment() {
  console.log("**************************************************************");
  console.log("Cookie: ", cookie.address);
  console.log("Clicker: ", clicker.address);
  console.log("Multicall: ", multicall.address);
  console.log("**************************************************************");
}

async function setUpSystem(wallet) {
  console.log("Starting System Set Up");
  await cookie.connect(wallet).setMinter(clicker.address, true);
  console.log("System Initialized");
}

async function setBuildings(wallet) {
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
  const buildingAmounts = [
    1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000,
    1000, 1000, 1000,
  ];
  await clicker
    .connect(wallet)
    .setBuilding(buildingCosts, buildingPayouts, buildingAmounts);
  console.log("Buildings set");
}

async function setLevels(wallet) {
  console.log("Starting Level Deployment");
  await clicker
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

  //   await deployCookie();
  //   await deployClicker();
  //   await deployMulticall();
  //   await printDeployment();

  //   await setUpSystem(wallet);
  //   await setBuildings(wallet);
  //   await setLevels(wallet);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
