const { ethers } = require("hardhat");
const { utils, BigNumber } = require("ethers");
const hre = require("hardhat");

// Constants
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const convert = (amount, decimals) => ethers.utils.parseUnits(amount, decimals);
const divDec = (amount, decimals = 18) => amount / 10 ** decimals;
const pointZeroOne = convert("0.01", 18);

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
    "0xc89CFF765965C76A9775a44775C3f98e5F035a10"
  );
  plugin = await ethers.getContractAt(
    "contracts/QueuePlugin.sol:QueuePlugin",
    "0x0129689005f800000C12cf3C2CDD3955827F85De"
  );
  multicall = await ethers.getContractAt(
    "contracts/Multicall.sol:Multicall",
    "0x2ac86f64936a999275eE4Cf1979c6626B361175b"
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
    pointZeroOne,
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
      pointZeroOne,
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
  // await units.connect(wallet).setMinter(factory.address, true);
  // console.log("factory whitelisted to mint units.");
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
    convert("0.00000015", 18),
    convert("0.000001", 18),
    convert("0.000011", 18),
    convert("0.00012", 18),
    convert("0.0013", 18),
    convert("0.006", 18),
    convert("0.032", 18),
    convert("0.17", 18),
    convert("1", 18),
    convert("6", 18),
    convert("40", 18),
    convert("260", 18),
    convert("1700", 18),
    convert("11000", 18),
    convert("70000", 18),
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
      "15422365251154839863296",
      "17735720038828064374784",
      "20396078044652272353280",
      "23455489751350111109120",
      "26973813214052626726912",
      "31019885196160517799936",
      "35672867975584597147648",
      "41023798171922283364352",
      "47177367897710616641536",
      "54253973082367204524032",
      "62392069044722280169472",
      "71750879401430621356032",
      "82513511311645194846208",
      "94890538008391970717696",
      "109124118709650768003072",
      "125492736516098353004544",
      "144316646993513104277504",
      "165964144042540085018624",
      "190858765648921054150656",
      "219487580496259213950976",
      "252410717570698047389696",
      "290272325206302756175872",
      "333813173987248147791872",
      "383885150085335322984448",
      "441467922598135601299456",
      "507688110987855884451840",
      "583841327636034200010752",
      "671417526781439249481728",
      "772130155798655083216896",
      "887949679168453372542976",
      "1021142131043721304604672",
      "1174313450700279386210304",
      "1350460468305321133080576",
      "1553029538551119061450752",
      "1785983969333786907246592",
      "2053881564733855064129536",
      "2361963799443932813721600",
      "2716258369360522802888704",
      "3123697124764600659607552",
      "3592251693479290946453504",
      "4131089447501184158924800",
      "4750752864626361111674880",
      "5463365794320315412643840",
      "6282870663468361382363136",
      "7225301262988615482343424",
      "8309096452436906838327296",
      "9555460920302443025137664",
      "10988780058347807170363392",
      "12637097067099978031169536",
      "14532661627164973017858048",
      "16712560871239717037801472",
      "19219445001925672768110592",
      "22102361752214526689804288",
      "25417716015046702686797824",
      "29230373417303703365353472",
      "33614929429899261876633600",
      "38657168844384140420710400",
      "44455744171041760410075136",
      "51124105796698022753599488",
      "58792721666202712422744064",
      "67611629916133121004142592",
      "77753374403553083571306496",
      "89416380564086027209146368",
      "102828837648698939021459456",
      "118253163296003765271789568",
      "135991137790404320613629952",
      "156389808458964973859635200",
      "179848279727809711348645888",
      "206825521686981145717112832",
      "237849349940028288368902144",
      "273526752431032490392551424",
      "314555765295687348489551872",
      "361739130090040430147141632",
      "415999999603546456873500672",
      "478399999544078439148421120",
      "550159999475690101941469184",
      "632683999397043541641265152",
      "727586599306600052271611904",
      "836724589202590018880667648",
      "962233277582978301810442240",
      "1106568269220425081441746944",
      "1272553509603488561908154368",
      "1463436536044012176047865856",
      "1682952016450613837528301568",
      "1935394818918205487096791040",
      "2225704041755936241441832960",
      "2559559648019326471499677696",
      "2943493595222225139858931712",
      "3385017634505558580984283136",
      "3892770279681391928327274496",
      "4476685821633600277771714560",
      "5148188694878639632242704384",
      "5920416999110435192250040320",
      "6808479548977001570599174144",
      "7829751481323549772092538880",
      "9004214203522081413272698880",
      "10354846334050393625263603712",
      "11908073284157951239688028160",
      "13694284276781642276373790720",
      "15748426918298889717341487104",
      "18110690956043720316212477952",
      "20827294599450276384523419648",
      "23951388789367817622299607040",
      "27544097107772986967109664768",
      "31675711673938933692762161152",
      "36427068425029768469020672000",
      "41891128688784234838885400576",
      "48174797992101860828820537344",
      "55401017690917133795878502400",
      "63711170344554701666237022208",
      "73267845896237898999688855552",
      "84258022780673580771009626112",
      "96896726197774603812912234496",
      "111431235127440800542114185216",
      "128145920396556900392417361920",
      "147367808456040439849326477312",
      "169472979724446456568604524544",
      "194893926683113423294676598784",
      "224128015685580443825752506368",
      "257747218038417480492899106816",
      "296409300744180130714331643904",
      "340870695855807069397425586176",
      "392001300234178087585792917504",
      "450801495269304807760536272896",
      "518421719559700451518998118400",
      "596184977493655519246847836160",
      "685612724117703688804200611840",
      "788454632735359242124830703616",
      "906722827645663015853564624896",
      "1042731251792512496379096989696",
      "1199140939561389152692854587392",
      "1379012080495597300416801406976",
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

async function setEvolution(wallet) {
  console.log("Starting Evolution Deployment");
  await factory
    .connect(wallet)
    .setEvolution(
      [
        "0",
        "10000000000000000000",
        "100000000000000000000",
        "1000000000000000000000",
        "1000000000000000000000",
        "10000000000000000000000",
        "100000000000000000000000",
        "1000000000000000000000000",
        "10000000000000000000000000",
        "100000000000000000000000000",
      ],
      [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
    );
  console.log("Evolution set");
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
  // await setEvolution(wallet);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
