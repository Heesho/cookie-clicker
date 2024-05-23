const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const divDec6 = (amount, decimals = 6) => amount / 10 ** decimals;
const { expect } = require("chai");
const { ethers, network } = require("hardhat");
const { execPath } = require("process");

const AddressZero = "0x0000000000000000000000000000000000000000";
const one = convert("1", 18);
const two = convert("2", 18);
const three = convert("3", 18);
const five = convert("5", 18);
const ten = convert("10", 18);
const twenty = convert("20", 18);
const eighty = convert("80", 18);
const ninety = convert("90", 18);
const oneHundred = convert("100", 18);
const twoHundred = convert("200", 18);
const fiveHundred = convert("500", 18);
const sixHundred = convert("600", 18);
const eightHundred = convert("800", 18);
const oneThousand = convert("1000", 18);
const fourThousand = convert("4000", 18);
const tenThousand = convert("10000", 18);
const oneHundredThousand = convert("100000", 18);

let owner, user0, user1, user2;
let cookie, clicker;

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

    await cookie.transferOwnership(clicker.address);
    console.log("- System set up");

    console.log("Initialization Complete");
    console.log();
  });

  it("User0 mints a clicker", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).mintClicker({ value: one });
  });

  it("User0 clicks cookie", async function () {
    console.log("******************************************************");
    await clicker.connect(user0).click(1);
  });
});
