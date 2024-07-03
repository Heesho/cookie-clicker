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
    "0x0c09B539BBDE11979235F08454D4923B7303C98e"
  );
  clicker = await ethers.getContractAt(
    "contracts/Clicker.sol:Clicker",
    "0xAa69bB1171510F4d006C7ab0A3fBf0dCbb6296A2"
  );
  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    "0x61d0b4fbB9d507F64112e859523524AA2c548A6C"
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

async function verifyCookie() {
  console.log("Starting Cookie Verification");
  await hre.run("verify:verify", {
    address: cookie.address,
    contract: "contracts/Cookie.sol:Cookie",
    constructorArguments: [],
  });
  console.log("Cookie Verified");
}

async function verifyClicker() {
  console.log("Starting Clicker Verification");
  await hre.run("verify:verify", {
    address: clicker.address,
    contract: "contracts/Clicker.sol:Clicker",
    constructorArguments: [cookie.address],
  });
  console.log("Clicker Verified");
}

async function verifyMulticall() {
  console.log("Starting Multicall Verification");
  await hre.run("verify:verify", {
    address: multicall.address,
    contract: "contracts/Multicall.sol:Multicall",
    constructorArguments: [cookie.address, clicker.address],
  });
  console.log("Clicker Verified");
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

  // await deployCookie();
  // await deployClicker();
  // await deployMulticall();
  // await printDeployment();

  // await verifyCookie();
  // await verifyClicker();
  // await verifyMulticall();

  // await setUpSystem(wallet);
  // await setBuildings(wallet);
  await setLevels(wallet);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
