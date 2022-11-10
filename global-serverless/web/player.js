let userID = 'user10';
let thumb = '';
let videoID = '';
let bookmark = 0;
let activeCookie = 0;
let failCount = 0;

const cookieObj = document.cookie.split('; ').reduce((prev, current) => {
    const [name, ...value] = current.split('=');
    prev[name] = value.join('=');
    return prev;
}, {});

async function loadVideo() {
  if (sessionStorage.getItem("active")) {
      // Restore the activeCookie
      activeCookie = sessionStorage.getItem("active");
  }
  
  const params = new Proxy(new URLSearchParams(window.location.search), {
      get: (searchParams, prop) => searchParams.get(prop),
  });

  videoID = params.video;

  var cookie = Object.keys(cookieObj)[activeCookie]

  var api = cookieObj[cookie] + "get/library/" + videoID  //get/library/id

  const response = await fetch(api);

  if(response.ok) {

      let data = await response.json();

      if('Items' in data || 'Item' in data) {

          let items = [];
          if('Item' in data) {
              items = [data.Item];
          } else {
              items = data.Items;
          }

          var htmlPrep = '';

          if(items) {

              items.forEach((item) => {
  
                  //INITIALIZE VIDEO
                  var video = document.getElementById('video');

                  video.src = item["video"][Object.keys(item["SK"])[0]];
                  video.load()

                  video.addEventListener('loadeddata', function() {

                    // Video is loaded and can be played
                    var cookie = Object.keys(cookieObj)[activeCookie]

                    getBookmark(cookie, true)
                    
                  }, false);

                  thumb = item["thumb"][Object.keys(item["SK"])[0]];
              });
          }
      }
  } 

  getCookiesForList();
}

function regionSwitch(cookie) {
  activeCookie = cookie
  sessionStorage.setItem("active", activeCookie)

  failCount = 0;
  
  setButtonColors()
}

function setButtonColors() {
    //change button colors
    var cookie = Object.keys(cookieObj)[0]
    var cookie2 = Object.keys(cookieObj)[1]
  
    if (typeof cookie !== 'undefined' && typeof cookie2 !== 'undefined') {
      const region0 = document.getElementById(cookie);
      const region1 = document.getElementById(cookie2);
  
      if (activeCookie==0) {
        region0.classList.replace("inactive", "active")
        region1.classList.replace("active", "inactive")
        region1.classList.replace("down", "inactive")
      } else {
        region0.classList.replace("active", "inactive")
        region1.classList.replace("inactive", "active")
        region0.classList.replace("down", "inactive")
      }
      
    }
}

async function getBookmark(cookie, start, region) {
  var api = cookieObj[cookie] + "get/" + userID + "/" + videoID  //get/user/video_id

  //console.log(api)
  try {
    const response = await fetch(api);

    if(response.ok) {

      let data = await response.json();

      const statsBox = document.getElementById('progress'); //temp
      

      if('Items' in data || 'Item' in data) {

        let items = [];
        if('Item' in data) {
            items = [data.Item];
        } else {
            items = data.Items;
        }

        if(items) {
          
          items.forEach((item) => {

            if(item) {
              var date = new Date(0);
              date.setSeconds(parseFloat(item["bookmark"][Object.keys(item["SK"])[0]] * video.duration)); // specify value for SECONDS here
              var timeString = date.toISOString().substring(14, 19);

              if(start) {
                startAtBookmark(item["bookmark"][Object.keys(item["SK"])[0]])
                
                const log = document.getElementById('log');
                log.innerText = "Starting video at " + timeString + " using progress from " + cookie
              } else {

                let LambdaLatency = data?.Latency;

                const regionProgress = document.getElementById('region' + region);
                const regionProgressText = document.getElementById('region' + region + '_text');

                //regionProgress.textContent = parseFloat(item["bookmark"][Object.keys(item["SK"])[0]] * 100).toFixed(1) + '%' // % based progress

                regionProgress.textContent = timeString
                regionProgressText.textContent = cookie + " (" + LambdaLatency + "ms)"
              }
            } else {
              if(start){
                const log = document.getElementById('log');
                log.innerText = "Starting video at 00:00, no bookmark found"

                startAtBookmark(0)
              }
            }
          });
        }
      }
    }
  } catch(error) {
    const log = document.getElementById('logSev');
    log.innerText = "Error reading from " + cookie

    const regionProgress = document.getElementById('region' + region);
    regionProgress.textContent = "Error"
  }
}

function startAtBookmark(bookmark) {

  var date = new Date(0);
  date.setSeconds(parseFloat(bookmark * video.duration)); // specify value for SECONDS here
  var timeString = date.toISOString().substring(14, 19);
  
  const statsBox = document.getElementById('progress'); //temp
  statHtml = timeString
  statsBox.innerHTML = statHtml;

  //Set video progress
  theTime = bookmark * video.duration;
  
  if (isNaN(theTime)) {
    statsBox.innerHTML = video.duration;
  } else {
    video.currentTime = theTime
    startVideo();
  }

  if (typeof timer == "undefined") {
    updateBookmark();
  }
               
}

var timer; 

function updateBookmark() {
    timer = setInterval(function() {
        var currentProgress = video.currentTime / video.duration;

        const statsBox = document.getElementById('progress');

        var date = new Date(0);
        date.setSeconds(currentProgress * video.duration); // specify value for SECONDS here
        var timeString = date.toISOString().substring(14, 19);

        statsBox.innerHTML = timeString;

        if (!video.paused) {
          writeBookmark(currentProgress)

          //Read current bookmark from both regions
          var cookie = Object.keys(cookieObj)[0]
          var cookie2 = Object.keys(cookieObj)[1]

          if (typeof cookie !== 'undefined') {
            getBookmark(cookie, false, 0)
          }

          if (typeof cookie2 !== 'undefined') {
            getBookmark(cookie2, false, 1)
          }
          
        }
    }, 5000);
}

async function writeBookmark(currentProgress) {
  var cookie = Object.keys(cookieObj)[activeCookie]
  var api = cookieObj[cookie] + "update/" + userID + "/" + videoID + "/" + currentProgress.toFixed(3) + "/" + btoa(thumb)  //update/user100/videoID/

  let latencyBox = document.getElementById('latency');

  const started = new Date().getTime();
  // document.getElementById('hg' + index).style.visibility = 'visible';

  try {
    const response = await fetch(api);

    if(response.ok) {
        const ended = new Date().getTime();
        const latency = ended - started;

        let data = await response.json();

        let LambdaLatency = data?.Latency;

        latencyBox.textContent = LambdaLatency + "ms";

        var date = new Date(0);
        date.setSeconds(currentProgress * video.duration); // specify value for SECONDS here
        var timeString = date.toISOString().substring(14, 19);

        const log = document.getElementById('log');
        log.classList.remove("severe")
        log.innerText = "Bookmark " + timeString + " written to " + cookie + " in " + LambdaLatency + "ms"
    } else {
        popularHeader.textContent = 'Error: HTTP ' + response.status;
        console.log('HTTP-Error: ' + response.status)
    }
  } catch(error) {
    const log = document.getElementById('log');
    log.classList.add("severe")
    log.innerText = "Unable to write to " + cookie + ". Failing over to alternate region in 15 seconds if available"

    var cookie = Object.keys(cookieObj)[0]
    var cookie2 = Object.keys(cookieObj)[1]

    if (typeof cookie !== 'undefined' && typeof cookie2 !== 'undefined') {
        const region0 = document.getElementById(cookie);
        const region1 = document.getElementById(cookie2);

        if (activeCookie==0) {
            region0.classList.replace("active", "down")
        } else {
            region1.classList.replace("active", "down")
        }
    }

    failCount += 1;
    if (failCount >= 3) {
      target = activeCookie == 1 ? 1 : 0
      console.log(target)
      regionSwitch(activeCookie == 1 ? 0 : 1)
    }
  } 
}

function getCookiesForList() {
    
  const cookieObj = document.cookie.split('; ').reduce((prev, current) => {
      const [name, ...value] = current.split('=');
      prev[name] = value.join('=');
      return prev;
  }, {});

  const list = document.getElementById('list');
  const region1 = document.getElementById('region0_text');
  const region2 = document.getElementById('region1_text');

  var cookie = Object.keys(cookieObj)[0]
  var cookie2 = Object.keys(cookieObj)[1]

  region1.textContent = cookie
  region2.textContent = cookie2

  list.innerHTML = '';

  Object.keys(cookieObj).forEach((cookie, index)=>{

      if(cookie !== "") {
        cook = cookieObj[cookie].split('.')[2]
        
        list.innerHTML += '<buttton id = "' + cook + '" class="regionButton active" onclick="regionSwitch(' + index + ')">' + cook + '</buttton>'

      }
  });

  setButtonColors()
}

function getCookie(name) {
    let nameEQ = name + "=";
    let ca = document.cookie.split(';');
    for(let i=0;i < ca.length;i++) {
        let c = ca[i];
        while (c.charAt(0)===' ') c = c.substring(1,c.length);
        if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
    }
    return null;
}


/*target elements*/
const player = document.querySelector('.player');
const video = player.querySelector('.viewer');

const progressRange = document.querySelector('.progress-range');
const progressBar = document.querySelector('.progress-bar');
const currentTime = document.querySelector('.time-elapsed');
const duration = document.querySelector('.time-duration');

const playBtn = document.getElementById('play-btn');
const stopBtn = player.querySelector('.stop');

const skipButtons = player.querySelectorAll('[data-skip]');

const speakerIcon = player.querySelector('#speaker_icon');
const ranges = player.querySelectorAll('.player_slider');
/* MUTE button */
const speaker = player.querySelector('.speaker');
const volInput = player.querySelector('input[name="volume"]')
//const speakerIcon = player.querySelector('#speaker_icon'); 

// show play button when paused
function showPlayIcon() {
  playBtn.classList.replace('fa-pause', 'fa-play');
  playBtn.setAttribute('title', 'Play');
}

// toggle between play and pause
function togglePlay() {
  if (video.paused) {
    video.play();
    playBtn.classList.replace('fa-play', 'fa-pause');
    playBtn.setAttribute('title', 'Pause');
  } else {
    video.pause();
    showPlayIcon();
  }
}

// Start video
function startVideo() {
  video.play();
  playBtn.classList.replace('fa-play', 'fa-pause');
  playBtn.setAttribute('title', 'Pause');
}

// Stop video
function stopVideo() {
  video.currentTime = 0;
  video.pause();
}

// not sure, is this for FF and REW?
function skip() {
  video.currentTime += +(this.dataset.skip);
}

// volume functions
function handleRangeUpdate() {
  video[this.name] = this.value;
  (video['volume'] === 0 ? speakerIcon.className = "fa fa-volume-off" :
    speakerIcon.className = "fa fa-volume-up")
}

let muted = false;

function mute() {
  if (!muted) {
    video['volume'] = 0;
    volInput.value = 0;
    speakerIcon.className = "fa fa-volume-off"
    muted = true;
  } else {
    video['volume'] = 1;
    volInput.value = 1;
    muted = false;
    speakerIcon.className = "fa fa-volume-up"
  }
}

// update progress bar as the video plays
function updateProgress() {
  progressBar.style.width = `${(video.currentTime / video.duration) * 100}%`;
  currentTime.textContent = `${displayTime(video.currentTime)} /`;
  duration.textContent = `${displayTime(video.duration)}`;
}

// Calculate display time format
function displayTime(time) {
  const minutes = Math.floor(time / 60);
  let seconds = Math.floor(time % 60);
  seconds = seconds > 9 ? seconds : `0${seconds}`;
  return `${minutes}:${seconds}`;
}

// Click to seek within the video
function setProgress(e) {
  const newTime = e.offsetX / progressRange.offsetWidth;
  progressBar.style.width = `${newTime * 100}%`;
  video.currentTime = newTime * video.duration;
}

function scrub(event) {
  const scrubTime = (event.offsetX / progressRange.offsetWidth) * video.duration;
  video.currentTime = scrubTime;
}

// Spacebar used to play and pause
document.body.onkeyup = function (e) {
  if (e.keyCode == 32) {
    togglePlay();
  }
}

// =======================
video.addEventListener('timeupdate', updateProgress);
video.addEventListener('canplay', updateProgress);
progressRange.addEventListener('click', setProgress);
// ===================
/*functions linked to elements*/
// play, pause, stop
video.addEventListener('click', togglePlay);
video.addEventListener('keydown', (event) => event.keyCode === 32 && togglePlay());
playBtn.addEventListener('click', togglePlay);
stopBtn.addEventListener('click', stopVideo);
// skip forward or backward
skipButtons.forEach(button => button.addEventListener('click', skip));
// volume
ranges.forEach(range => range.addEventListener('change', handleRangeUpdate));
ranges.forEach(range => range.addEventListener('mousemove', handleRangeUpdate));
speaker.addEventListener('click', mute)

// progress bar controls
let mouseDown = false;
progressRange.addEventListener('click', scrub);
progressRange.addEventListener('mousemove', (event) => mouseDown && scrub(event));
progressRange.addEventListener('mousedown', () => mouseDown = true);
progressRange.addEventListener('mouseup', () => mouseDown = false);

//fullscreen mode 
const screen_size = player.querySelector('.screenSize');
const controls = player.querySelector('.player_controls');
const screenSize_icon = player.querySelector('#screenSize_icon');

function changeScreenSize() {
  if (player.mozRequestFullScreen) {

    player.mozRequestFullScreen();
    //change icon
    screenSize_icon.className = "fa fa-compress";
    /*control panel once fullscreen*/
    video.addEventListener('mouseout', () => controls.style.transform = 'translateY(100%) translateX(-5px)');
    video.addEventListener('mouseover', () => controls.style.transform = 'translateY(0)');
    controls.addEventListener('mouseover', () => controls.style.transform = 'translateY(0)');
    screen_size.addEventListener('click', () => {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
        screenSize_icon.className = "fa fa-expand";
      }
    });
  } else if (player.webkitRequestFullScreen) {

    player.webkitRequestFullScreen();

    screenSize_icon.className = "fa fa-compress";

    video.addEventListener('mouseout', () => controls.style.transform = 'translateY(100%) translateX(-5px)');
    video.addEventListener('mouseover', () => controls.style.transform = 'translateY(0)');
    controls.addEventListener('mouseover', () => controls.style.transform = 'translateY(0)');
    screen_size.addEventListener('click', () => {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
        screenSize_icon.className = "fa fa-expand";
      }
    });
  }
}
screen_size.addEventListener('click', changeScreenSize);
/* end full screen */
