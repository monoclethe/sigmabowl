//Document References
var timerBg = document.getElementById("timerBG");
var timerDisp = document.getElementById("timerDisp");
var timerFill = document.getElementById("timerFill");
var playArea = document.getElementById("playArea");
var actionBar = document.getElementById("actionBar");
var playPause = document.getElementById("playPause");
var skip = document.getElementById("skip");
var buzzSubmit = document.getElementById("buzzSubmit");
var playerGuess = document.getElementById("playerGuess");
var readArea = document.getElementById("readArea");
var statsSettingsArea = document.getElementById("statsSettingsArea");
var playPauseIcon = document.getElementById("playPauseIcon");
var skipIcon = document.getElementById("skipIcon");
var buzzSubmitIcon = document.getElementById("buzzSubmitIcon");
var questionInfo = document.getElementById("questionInfo");
var questionText = document.getElementById("questionText");
var stats = document.getElementById("stats");
var readSpeed = document.getElementById("readSpeed");
var buzzRatFill = document.getElementById("buzzRatFill");
var buzzRatDisp = document.getElementById("buzzRatDisp");
var lit = document.getElementById("lit");
var hist = document.getElementById("hist");
var sci = document.getElementById("sci");
var farts = document.getElementById("farts");
var relig = document.getElementById("relig");
var myth = document.getElementById("myth");
var phil = document.getElementById("phil");
var socsci = document.getElementById("socsci");
var geo = document.getElementById("geo");

//Global Variables
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay));
const mspl = 1000 * ((1000 / (7.7 * 60)) / 4.7);
var readingProgress = 0;
var msplMod = 0.25;
var ans = [];
var playing = false;
var readAgent;
var buzzertimeAgent;
var overtimeAgent;
var buzztime = 75;
var qData;
var overtime = 0;
var valid_answers = [];
var difficultyMap = {
    "0": "Test Set",
    "1": "Middle School",
    "2": "Easy High School",
    "3": "Regular High School",
    "4": "Hard High School",
    "5": "National High School",
    "6": "Easy College",
    "7": "Medium College",
    "8": "Regional College",
    "9": "National College",
    "10": "Open"
};
var paused = false;
var buzzed = false;
var buzzes = 0;
var negs = 0;
var correct = 0;

//On start init
playerGuess.readOnly = true;

function updateStats () {
    stats.innerHTML = "Stats<br><span style=\"color: blue\">" + buzzes + "</span>/<span style=\"color: red\">" + negs + "</span>/<span style=\"color: green\">" + correct + "</span><br>" + ((correct - negs) * 5) + " pts";
    if ((correct === 0) && (negs === 0)) {
        buzzRatFill.style.width = "50%";
        buzzRatDisp.innerHTML = "50.00%";
    } else if (correct === 0) {
        buzzRatFill.style.width = "0%";
        buzzRatDisp.innerHTML = "0.00%";
    } else if (negs === 0) {
        buzzRatFill.style.width = "100%";
        buzzRatDisp.innerHTML = "100.00%";
    } else {
        buzzRatFill.style.width = ((correct * 100) / buzzes) + "%";
        buzzRatDisp.innerHTML = ((correct * 100) / buzzes).toFixed(2) + "%";
    }
}

async function getQuestion () {
    fetch("https://www.qbreader.org/api/random-tossup")
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
            return response.json();
      })
      .then(data => {
        qData = data["tossups"][0];
        navigator.clipboard.writeText(JSON.stringify(qData));
        questionInfo.innerHTML = "ID: " + qData["_id"] + " | " + qData["category"] + " > " + qData["subcategory"] + " | Difficulty: " + difficultyMap[qData["difficulty"]] + " | " + qData["setName"];
        ans = parseAns(qData);
        questionInit();
      })
      .catch(error => {
        console.error('Error:', error);
      });
}

function questionInit () {
    playerGuess.readOnly = true;
    playerGuess.value = "Press buzz or space to buzz.";
    resetTimer();
    readingProgress = 0;
    questionText.innerHTML = "";
    readQuestion();
}

function resetTimer () {
    timerDisp.innerHTML = 7.5;
    timerFill.style.width = "100%";
    timerFill.style.backgroundColor = "lightgreen";
}

function updateSpeed () {
    document.getElementById("rspeed").innerHTML = "Reading speed: " + Math.floor((((1/(readSpeed.value * .001))/4.7)*60));
}

function readQuestion () {
    var readAgent = setInterval(function () {
        if (readingProgress >= qData["question"].length - 1 || !playing) {
            clearInterval(readAgent);
            setOvertime();
        }
        if (!paused && !buzzed && playing) {
            questionText.innerHTML += qData["question"][readingProgress];
            readingProgress++;
        }
    }, readSpeed.value)
}

function setOvertime () {
    overtime = 7.5;
    var overtimeAgent = setInterval(function () {
        if (!paused && !buzzed) {
            timerFill.style.backgroundColor = "lightblue";
            overtime -= 0.05;
            timerFill.style.width = (overtime * 40 / 3) + "%";
            timerDisp.innerHTML = overtime.toFixed(1);
        }
        if (overtime <= 0 || !playing) {
            clearInterval(overtimeAgent);
            resetTimer();
        }
    }, 50)
}

function setBuzzerTime () {
    buzztime = 7.5;
    var buzzertimeAgent = setInterval(function () {
        timerFill.style.backgroundColor = "pink";
        buzztime -= 0.05;
        timerFill.style.width = (buzztime * 40 / 3) + "%";
        timerDisp.innerHTML = buzztime.toFixed(1);
        if (!buzzed || buzztime <= 0 || !playing) {
            resetTimer();
            clearInterval(buzzertimeAgent);
            buzzed = false;
        }
    }, 50)
}

const levenshteinDistance = (s, t) => {
    if (!s.length) return t.length;
    if (!t.length) return s.length;
    const arr = [];
    for (let i = 0; i <= t.length; i++) {
      arr[i] = [i];
      for (let j = 1; j <= s.length; j++) {
        arr[i][j] =
          i === 0
            ? j
            : Math.min(
                arr[i - 1][j] + 1,
                arr[i][j - 1] + 1,
                arr[i - 1][j - 1] + (s[j - 1] === t[i - 1] ? 0 : 1)
              );
      }
    }
    return arr[t.length][s.length];
  };

function parseAns (inData) {
    let upA = inData["formatted_answer"];
    let starts = [];
    let ends = [];
    for (let i = 0; i <= upA.length; i++){
        if (upA[i] + upA[i+1] + upA[i+2] === "<u>") {
            starts.push(i + 3);
        } else if (upA[i] + upA[i+1] + upA[i+2] + upA[i+3] === "</u>") {
            ends.push(i);
        }
    }
    let pA = [];
    for (let i = 0; i < starts.length; i++) {
        pA.push(upA.substring(starts[i], ends[i]));
    }
    return pA;
}

function playPausePress() {
    if (!buzzed && playing) {
        if (!paused) {
            paused = true;
            playPauseIcon.src = "images/pause.png";
        } else if (paused) {
            paused = false;
            playPauseIcon.src = "images/play.png";
        }
    }
    if (!playing) {
        playing = true;
        getQuestion();
    }
}

function buzzSubmitPress() {
    if (!paused) {
        if (!buzzed) {
            buzzed = true;
            buzzes++;
            updateStats();
            buzzSubmitIcon.src = "images/return.png";
            playerGuess.readOnly = false;
            playerGuess.focus()
            playerGuess.value = "";
            setBuzzerTime();
        } else if (buzzed) {
            playerGuess.readOnly = true;
            playerGuess.blur()
            buzzed = false;
            buzzSubmitIcon.src = "images/buzz.png";
            checkAns()
            playerGuess.value = "Press buzz or space to buzz.";
        }
    }
}

function checkAns () {
    console.log(ans);
    alert(ans);
    let playerAns = playerGuess.value;
    let score = 1000;
    for (let i = 0; i < ans.length; i++) {
        if (levenshteinDistance(playerAns, ans[i]) < score) {
            score = levenshteinDistance(playerAns, ans[i]);
        }
    }
    if (score < Math.ceil(playerAns.length / 4)) {
        correct++;
        updateStats();
        finish();
    } else {
        negs++;
        updateStats();
    }

}

function skipPress () {
    if (playing && !paused) {
        finish();
    }
}

function finish () {
    try{clearInterval(buzzertimeAgent)}catch{}
        try{clearInterval(overtimeAgent)}catch{}
        try{clearInterval(readAgent)}catch{}
        resetTimer();
        paused = false;
        buzzed= false;
        readingProgress = 1000000;
        overtime = 0;
        buzzertimeAgent = 0;
        playing = false;
        questionText.innerHTML = qData["question"] + "<br><br>" + qData["formatted_answer"];
}

document.addEventListener("keyup", (event) => {
    if (event.key === "p" && !buzzed) {
        playPausePress();
    } else if ((event.key === " " && !buzzed) || event.key === "Enter") {
        buzzSubmitPress();
    } else if (event.key === "s" && !buzzed) {
        skipPress();
    }
})
playPause.addEventListener("click", function () {playPausePress();});

buzzSubmit.addEventListener("click", function () {buzzSubmitPress();})

skip.addEventListener("click", function () {skipPress();})