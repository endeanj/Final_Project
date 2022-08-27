const seasonRace = {
  2011: [],
  2012: [],
  2013: [],
  2014: [],
  2015: [],
  2016: [],
  2017: [],
  2018: [],
  2019: [],
  2020: [],
  2021: [],
  2022: [],
};

// query slectors for addeventlistener's
const showRaceBtn = document.querySelector(".showrace");
const latestRaceBtn = document.querySelector(".latestRace");
const replayRaceBtn = document.querySelector("#replay");
const pauseRaceBtn = document.querySelector("#pause");
const playRaceBtn = document.querySelector("#play");

// https://ergast.com/api/f1/2022/Last/qualifying.json
const domain = "https://ergast.com/api";
const path = "/f1";
let season = "/current";
let round = "/last";
let queryString = "/qualifying.json";

let queryLimit = 0;
let queryOffset = 0;
let queryTotal = 0;
let parameters = `?limit=${queryLimit}&offset=${queryOffset}`;
let endpoint = domain + path + season + round + queryString;

let borderRight = 36;
let drivers = new Array();
let finishStandings = new Array();
let yPositions = new Array();
let raceLaps = new Array();
let totalLaps = 0;
let eachLapMaxPixels = 0;
let widthMax;

let fetchArray = new Array();
// SAMPLE FETCH ARRAY
//
// let fetchArray = [
//     fetch("https://ergast.com/api/f1/current/last/laps.json?limit=350&offset=0"),
//     fetch("https://ergast.com/api/f1/current/last/laps.json?limit=350&offset=350"),
//     fetch("https://ergast.com/api/f1/current/last/laps.json?limit=350&offset=700"),
//     fetch("https://ergast.com/api/f1/current/last/laps.json?limit=350&offset=1050")
// ];
//
let raceFinished = false;
let racePaused = false;

// on Browser load build the Grid for the latest race taken place.
window.addEventListener("load", () => {
  // Populate the SeasonRace object with the completed races for each season
  getSeasonScedules();

  // load the season drop down
  loadSeasonDropDown();

  // Fetch all the data for the last race in the current calender
  season = "/current";
  round = "/last";
  getAllRequiredData();
});

// Get the screen width and calculate the max width of screen.
const getMaxWidth = () => {
  widthMax = screen.availWidth - (borderRight + 5);
};

// Clear all Arrays for repopulation of data
const initAllArrays = () => {
  drivers.length = 0;

  finishStandings.length = 0;

  yPositions.length = 0;

  raceLaps.length = 0;

  fetchArray.length = 0;
};

// Retrieve data for Season Drop down
const getSeasonScedules = () => {
  for (let season in seasonRace) {
    endpoint = domain + path + "/" + season + ".json";
    fetchData(endpoint, popSeasonRaceArray);
  }
};

// Get todays Date. Check if the scheduled race date for the season is less than today.
// if the date not greater than today. the race has been run. Populate the Race in the seasonRace Array.
const popSeasonRaceArray = (data) => {
  const date = new Date();
  let day = date.getDate();
  let month = date.getMonth() + 1;
  let year = date.getFullYear();
  let currentDate = new Date(`${year}-${month}-${day}`);

  data.MRData.RaceTable.Races.map((races) => {
    let raceDate = new Date(races.date);
    if (raceDate.getTime() < currentDate.getTime()) {
      seasonRace[races.season].push(races.raceName);
    }
  });
};

// Populate the Season Drop Down
const seasonSelect = document.querySelector(".season");
const loadSeasonDropDown = () => {
  for (let season in seasonRace) {
    seasonSelect.options[seasonSelect.options.length] = new Option(season, season);
  }
};

// Load the race Drop Down selection based on the selection of the season Drop Down
const loadRaceDropDown = () => {
  const raceSelect = document.querySelector(".race");
  // empty Races- dropdowns
  raceSelect.length = 1;
  // display correct values
  let race = seasonRace[seasonSelect.value];
  if (race !== undefined) {
    for (var i = 0; i < race.length; i++) {
      raceSelect.options[raceSelect.options.length] = new Option(race[i], i + 1);
    }
  }
};

// Fetch all the data for the Season and Round
const getAllRequiredData = () => {
  // fetch the qualify results for initial grid setup
  queryString = "/qualifying.json";
  endpoint = domain + path + season + round + queryString;
  fetchData(endpoint, startingGrid);

  // fetch the finish results for correcting finish results ie: post race penalties
  queryString = "/results.json";
  endpoint = domain + path + season + round + queryString;
  fetchData(endpoint, finishResults);

  // fetch all the race lap data for use in the simulation
  queryString = "/laps.json";
  queryLimit = 1;
  endpoint = domain + path + season + round + queryString + parameters;
  fetch(endpoint).then(turnResIntoObject).then(totalQueryLaps).then(buildFetchArray).then(raceLapData);
};

// fetch call depending on endpoint and function name supplied.
const fetchData = (endpoint, functionName) => {
  fetch(endpoint)
    .then(turnResIntoObject)
    .then(functionName)
    .catch((error) => {
      console.error(error);
    });
};

// Convert the response into JSON for use later
const turnResIntoObject = (response) => {
  return response.json();
};

const startingGrid = (data) => {
  const targetElement = document.querySelector(".raceTrack");
  const targetDiv = document.querySelector(".raceheading");

  // Get max screen width and size of cars depending on size of field.
  const imgWidth = targetElement.offsetHeight / data.MRData.total;
  borderRight = imgWidth;
  getMaxWidth();

  // Populate the H1 with the Name, season and race
  const { season, round, url, raceName } = data.MRData.RaceTable.Races[0];
  targetDiv.querySelector("h1").innerHTML = `${raceName} - Season:${season} Round:${round}`;
  targetDiv.querySelector("a").href = `${url}`;

  // Populate the HTML, Driver and Yposition array with the data for the starting grid
  targetElement.innerHTML = "";
  const startingGrid = data.MRData.RaceTable.Races[0].QualifyingResults.map((drivers, i) => {
    let html = `
        <div id="${drivers.Driver.driverId}" 
             class="cars" 
             style="line-height:${imgWidth}px; height:${imgWidth}px; width:${imgWidth}px">
          <img id=${i} 
             class="${drivers.Driver.driverId}" 
             src="images/${drivers.Constructor.constructorId}.png" 
             alt="${drivers.Constructor.constructorId}" 
             style="z-index:${i}; width:${imgWidth}px"/>
          <p style="left:${imgWidth + 2}px">${drivers.Constructor.name} - #${drivers.number}-${drivers.Driver.code}</p>
        </div>
        `;
    let driver = {
      id: i,
      driverId: drivers.Driver.driverId,
      lap: 1,
      gridPosition: parseFloat(drivers.position),
      racePosition: parseFloat(drivers.position),
      xPosition: 0,
      yPosition: 0,
      xIncrease: 0, // **Currently not used**
      yIncrease: 0, // **Currently not used**
    };
    addDriverToArray(driver);
    return html;
  });
  targetElement.innerHTML += startingGrid.join("");

  getYPositions();
};

// Add the driver to the drivers array
const addDriverToArray = (driver) => {
  drivers.push(driver);
};

// Establish the initial Y positions for the img on the starting grid
const getYPositions = () => {
  let dynamicPositionY = 0;

  drivers.forEach((driver) => {
    // find DOM node for each driver, get the width and top of the img
    const targetNode = document.querySelector(`#${driver.driverId}`);

    let nodeWidthAsString = getComputedStyle(targetNode).width;
    let nodeWidth = parseFloat(nodeWidthAsString);
    let currentPositionAsString = getComputedStyle(targetNode).top;
    let currentPositionY = parseFloat(currentPositionAsString);

    // Update the drivers array and add Yposiiton to the YPosition array
    if (drivers[0].yPosition === 0) {
      dynamicPositionY += currentPositionY;
      driver.yPosition += currentPositionY;
      targetNode.style.top = dynamicPositionY + "px";

      yPositions.push(dynamicPositionY);
    } else {
      dynamicPositionY += nodeWidth;
      driver.yPosition += dynamicPositionY;
      targetNode.style.top = dynamicPositionY + "px";

      yPositions.push(dynamicPositionY);
    }
  });
};

// Get the finish Results to show the corrected Finish standings if any penalties have been applied.
const finishResults = (data) => {
  totalLaps = 0;
  data.MRData.RaceTable.Races[0].Results.map((drivers) => {
    let driver = {
      finishPosition: drivers.position,
      driverId: drivers.Driver.driverId,
      x: 0, // **Currently not used**
      yPosition: yPositions[drivers.position - 1],
    };
    finishStandings.push(driver);

    if (totalLaps < drivers.laps) {
      totalLaps = parseFloat(drivers.laps);
    }
  });
};

// We need the total number of records to build the fetch array
const totalQueryLaps = (data) => {
  queryTotal = parseFloat(data.MRData.total);
};

// build an array of Fetch calls to retrieve all the lap data.
const buildFetchArray = () => {
  let queryString = "/laps.json";

  // queryLimit and queryOffset used in parameters for API call
  // limit paramter has a default of 30 if not supplied, A max of 1000 can be supplied
  // Hard coded limit of 350 (could be adjusted.)
  queryLimit = 350;
  queryOffset = 0;
  let arrayBuildLoops = Math.ceil(queryTotal / queryLimit);

  // Build an array of Fecth calls using the Domian, Path, season, round and paramters of Limit and offset
  // the fetch array is used in a Promise all in the function "raceLapData"
  for (let i = 0; i < arrayBuildLoops; i++) {
    if (i === 0) {
      parameters = `?limit=${queryLimit}&offset=${queryOffset}`;
      endpoint = domain + path + season + round + queryString + parameters;
      fetchArray.push(fetch(`${endpoint}`));
    } else {
      queryOffset += queryLimit;
      parameters = `?limit=${queryLimit}&offset=${queryOffset}`;
      endpoint = domain + path + season + round + queryString + parameters;
      fetchArray.push(fetch(`${endpoint}`));
    }
  }
};

// Use the Fetch Array to perform Multiple Fetch's and Handle the data all at once.
const raceLapData = () => {
  Promise.all(fetchArray)
    .then((responses) => {
      return Promise.all(
        responses.map((response) => {
          return response.json();
        })
      );
    })
    .then((data) => {
      buildRaceLaps(data);
    })
    .catch((error) => {
      console.log(error);
    });
};

// Build the racelap data, correct for the duplicate race laps due to pagination of data.
const buildRaceLaps = (data) => {
  for (let i = 0; i < data.length; i++) {
    data[i].MRData.RaceTable.Races[0].Laps.map((laps) => {
      if ([i] > 0) {
        let dataLapsLength = data[i - 1].MRData.RaceTable.Races[0].Laps.length - 1;
        if (data[i - 1].MRData.RaceTable.Races[0].Laps[dataLapsLength].number === laps.number) {
          let dupRaceLap = raceLaps.findIndex((lap) => lap.number === laps.number);
          const botHalfRaceLap = laps.Timings;
          for (let i = 0; i < botHalfRaceLap.length; i++) {
            raceLaps[dupRaceLap].Timings.push(botHalfRaceLap[i]);
          }
        } else {
          raceLaps.push(laps);
        }
      } else {
        raceLaps.push(laps);
      }
    });
  }
};

// Let the Fun Begin. Move the cars accross the screen (X values) and adjust positions based on lap postions (Y values).
// Divide the screen into lap sections based on (widthMax / totalLaps)
// For Each driver, For every lap :- Get a Laptime(converted into seconds) and calculate a X value per lap. Used for moving
// accross the screen. Check race posiotn, if it has changed move the car to the Y value of the position.
// Do this until race finished.
//
// Lap Formula
// Screen Width / Nunmber of laps = total (nn px) value per lap.
// ((nn px) / LapTime * 10) = x px movement
// eg (26.8571 / 88.391 * 10) = 3.0384 per tick.
//
const startRace = () => {
  let lapMaxPixels = widthMax / totalLaps;
  eachLapMaxPixels = parseFloat(lapMaxPixels.toFixed(4));

  const raceDrivers = () => {
    drivers.forEach((driver) => {
      const targetNode = document.querySelector(`#${driver.driverId}`);

      const targetNodeP = document.querySelector(`#${driver.driverId} p`);
      const nodeWidthAsString = getComputedStyle(targetNodeP).width;
      const nodeWidth = parseFloat(nodeWidthAsString);
      if (driver.xPosition > nodeWidth) {
        targetNodeP.style.left = -nodeWidth - 2 + "px";
      }

      const lapNumber = raceLaps.findIndex((lap) => lap.number === driver.lap.toString());
      const driverLapTimings = raceLaps[lapNumber].Timings.findIndex(
        (driverName) => driverName.driverId === driver.driverId
      );

      if (driverLapTimings === -1) {
        const driverFinishPosition = finishStandings.findIndex((driverName) => driverName.driverId === driver.driverId);
        driver.racePosition = parseFloat(finishStandings[driverFinishPosition].finishPosition);
        targetNode.style.top = yPositions[driverFinishPosition] + "px";
        // console.log("DNF");
      } else {
        let driverLapTime = raceLaps[lapNumber].Timings[driverLapTimings].time;
        let driverLapPosition = raceLaps[lapNumber].Timings[driverLapTimings].position;

        const pxPerTick = timeConvert(driverLapTime);

        const currentPositionX = driver.xPosition;
        const currentPositionY = driver.yPosition; // Not used, maybe for future development

        if (currentPositionX < widthMax && !raceFinished) {
          if (currentPositionX < eachLapMaxPixels * driver.lap) {
            updateDriverPosiiton(driver, driverLapPosition, pxPerTick, targetNode);
          } else {
            driver.lap += 1;
            updateDriverPosiiton(driver, driverLapPosition, pxPerTick, targetNode);
          }
        } else {
          finishRace();
        }
      }
    });
    if (!raceFinished && !racePaused) {
      sortDriversArray();

      setTimeout(raceDrivers, 75);
    }
  };
  setTimeout(raceDrivers, 1000);
};

// Convert the driver lap time into seconds and return a number of Pixels per tick for the lap
const timeConvert = (driverLapTime) => {
  const minSecMili = driverLapTime;
  const splitTime = minSecMili.split(":");
  const seconds = +splitTime[0] * 60 + +splitTime[1];
  const pxPerTick = (eachLapMaxPixels / seconds) * 10;
  return pxPerTick;
};

//  update the driver X postions and update the Node to reflect the postion.
const updateDriverPosiiton = (driver, driverLapPosition, pxPerTick, targetNode) => {
  driver.racePosition = parseFloat(driverLapPosition);
  driver.xPosition += parseFloat(pxPerTick.toFixed(4));
  driver.yPosition = yPositions[driverLapPosition - 1];
  targetNode.style.left = driver.xPosition + "px";
  targetNode.style.top = driver.yPosition + "px";
};

// Sort the Array of Objects by comparing the string properties of key "position"
const sortDriversArray = () => {
  drivers.sort(function (a, b) {
    let x = a.racePosition;
    let y = b.racePosition;
    if (x < y) {
      return -1;
    }
    if (x > y) {
      return 1;
    }
    return 0;
  });
};

// Set Booleans and Play controls, than start the race
const playRace = () => {
  racePaused = false;
  raceFinished = false;
  replayRaceBtn.style.display = "inline";
  pauseRaceBtn.style.display = "inline";
  playRaceBtn.style.display = "none";

  startRace();
};

// Set race to pasued. Set Play controls
const pausedRace = () => {
  racePaused = true;
  replayRaceBtn.style.display = "inline";
  pauseRaceBtn.style.display = "none";
  playRaceBtn.style.display = "inline";
};

// Set Play controls. Reset Driver data
const replayRace = () => {
  raceFinished = true;
  replayRaceBtn.style.display = "none";
  pauseRaceBtn.style.display = "none";
  playRaceBtn.style.display = "inline";

  // For each driver reset lap, racePosiiotn, XPosition and YPosiiton to start of race values
  drivers.forEach((driver) => {
    const node = document.querySelector(`#${driver.driverId}`);

    const nodeP = document.querySelector(`#${driver.driverId} p`);

    driver.lap = 1;
    driver.racePosition = driver.gridPosition;
    driver.xPosition = 0;
    driver.yPosition = yPositions[driver.gridPosition - 1];

    node.style.left = 0;
    node.style.top = driver.yPosition + "px";

    nodeP.style.left = borderRight + 2 + "px";
  });
  // Sort the drivers array
  sortDriversArray();
};

// when the race is finished, Put the drivers into correct positions. this accounts
// for time penalties DQ and other instances. these are not reflected in single lap data.
const finishRace = () => {
  raceFinished = true;
  pauseRaceBtn.style.display = "none";

  finishStandings.forEach((driver) => {
    const targetNode = document.querySelector(`#${driver.driverId}`);
    targetNode.style.top = driver.yPosition + "px";
  });
};

// Re-Initilize all the arrays and get all the required data for the race simulation
// for the values of the dropdowns.
const loadSelectedRace = (event) => {
  event.preventDefault();

  racePaused = true;

  const seasonDropDown = document.querySelector(".season");
  const raceDropDown = document.querySelector(".race");
  const targetDiv = document.querySelector(".raceheading");

  targetDiv.querySelector("h1").innerHTML = `Loading Season and Race...`;

  replayRaceBtn.style.display = "none";
  pauseRaceBtn.style.display = "none";
  playRaceBtn.style.display = "inline";

  initAllArrays();

  season = "/" + seasonDropDown.value;
  round = "/" + raceDropDown.value;
  getAllRequiredData();
};

// Reset the drop downs, Re-initilize the arrays and get all the data for the current season and last race (Default).
const loadLastRace = (event) => {
  event.preventDefault();

  racePaused = true;

  const seasonDropDown = document.querySelector(".season");
  const targetDiv = document.querySelector(".raceheading");

  targetDiv.querySelector("h1").innerHTML = `Loading Season and Race...`;

  seasonDropDown.selectedIndex = 0;
  loadRaceDropDown();

  replayRaceBtn.style.display = "none";
  pauseRaceBtn.style.display = "none";
  playRaceBtn.style.display = "inline";

  initAllArrays();

  season = "/current";
  round = "/last";
  getAllRequiredData();
};

// Listen for a change of season
seasonSelect.addEventListener("change", loadRaceDropDown);

// Listen for the Show Race button click
showRaceBtn.addEventListener("click", loadSelectedRace);

// Listen for the show Latest Race Button click. will always default to current Season and Last race
latestRaceBtn.addEventListener("click", loadLastRace);

// Listen for play controls. Play, Pause and Replay.
replayRaceBtn.addEventListener("click", replayRace);
pauseRaceBtn.addEventListener("click", pausedRace);
playRaceBtn.addEventListener("click", playRace);
