let activeCookie = 0;

const cookieObj = document.cookie.split('; ').reduce((prev, current) => {
    const [name, ...value] = current.split('=');
    prev[name] = value.join('=');
    return prev;
}, {});

async function loadLibrary() {
    if (sessionStorage.getItem("active")) {
        // Restore the activeCookie
        activeCookie = sessionStorage.getItem("active");
    } else {
        sessionStorage.setItem("active", activeCookie)
    }

    getCookiesForList();

    var cookie = Object.keys(cookieObj)[activeCookie]

    var api = cookieObj[cookie] + "query/library"  //query/library

    let popularHeader = document.getElementById('popularHeader');
    let popularList = document.getElementById('popularList');

    const started = new Date().getTime();

    try {
        const response = await fetch(api);

        if(response.ok) {
            const ended = new Date().getTime();
            const latency = ended - started;

            let data = await response.json();

            let LambdaLatency = data?.Latency;

            popularHeader.textContent = "Popular on GlobalFlix  (Latency: " + LambdaLatency + "ms)";

            if('Items' in data || 'Item' in data) {
                
                let items = [];
                if('Item' in data) {
                    items = [data.Item];
                } else {
                    items = data.Items;
                }
                
                var htmlPrep = '';
                var debugHtml = '';

                if(items) {

                    items.forEach((item) => {

                        htmlPrep += '<a href="./player.html?video=' + item["SK"][Object.keys(item["SK"])[0]] + '&c=' + activeCookie + '"><img src="' + item["thumb"][Object.keys(item["SK"])[0]] + '" alt=""></a>'
                        
                    });

                    popularList.innerHTML = htmlPrep;
                }

            }

        } else {
            popularHeader.textContent = 'Error: HTTP ' + response.status;
            console.log('HTTP-Error: ' + response.status)
        }
        
        
        loadContinue();
    } catch(error) {
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

        popularHeader.textContent = ""
        popularList.innerHTML = ""

        loadContinue();
    }
    
}

async function loadContinue() {
    
     var cookie = Object.keys(cookieObj)[activeCookie]
 
     var api = cookieObj[cookie] + "query/user10"  //query/user100
 
     let continueHeader = document.getElementById('continueHeader');
     let continueList = document.getElementById('continueList');
 
     const started = new Date().getTime();
    
     try {
        const response = await fetch(api);
 
        if(response.ok) {
            const ended = new Date().getTime();
            const latency = ended - started;
    
            let data = await response.json();
    
            let LambdaLatency = data?.Latency;
    
            continueHeader.textContent = "Continue Watching  (Latency: " + LambdaLatency + "ms)";
    
            
    
    
            if('Items' in data || 'Item' in data) {
    
                let items = [];
                if('Item' in data) {
                    items = [data.Item];
                } else {
                    items = data.Items;
                }
    
                var htmlPrep = '';
                var debugHtml = '';
    
                if(items) {
    
                    items.forEach((item) => {
    
                        htmlPrep += '<a href="./player.html?video=' + item["SK"][Object.keys(item["SK"])[0]] + '&c=' + activeCookie + '"><img src="' + atob(item["thumb"][Object.keys(item["SK"])[0]]) + '" alt=""><progress class="progress" value="' + (item["bookmark"][Object.keys(item["SK"])[0]] * 100) + '" max="100"></progress></a>'
                        
                        var_name = document.getElementById("continueHeader").style.display = 'block';
                    });
    
                    continueList.innerHTML = htmlPrep;
                }
    
            }
    
        }
     } catch(error) {
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

        continueHeader.textContent = "Error, unable to load library from " + Object.keys(cookieObj)[activeCookie]
        continueList.innerHTML = "Verify you have the correct API URL and/or Global Table Replica in this region"
    }  
 }



function regionSwitch(cookie) {
    activeCookie = cookie
    sessionStorage.setItem("active", activeCookie)
    
    setButtonColors()
  
    loadLibrary()
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

function getCookiesForList() {

    const list = document.getElementById('list');

    list.innerHTML = '';

    Object.keys(cookieObj).forEach((cookie, index)=>{

        if(cookie !== "") {
            cook = cookieObj[cookie].split('.')[2]
            list.innerHTML += '<buttton id = "' + cook + '" class="regionButton active" onclick="regionSwitch(' + index + ')">' + cook + '</buttton>'
        }
    });

    setButtonColors()
}

function setCookie(value) {
    let days = 1000;
    let expires = "";
    if (days) {
        let date = new Date();
        date.setTime(date.getTime() + (days*24*60*60*1000));
        expires = "; expires=" + date.toUTCString();
    }

    let region = 'us-west-2'; // will be reset

    let amazonDomainPos = value.search('amazonaws.com');
    if(amazonDomainPos > 0) {
        let prefix = value.slice(0, amazonDomainPos-1);

        region = prefix.slice(prefix.lastIndexOf('.') + 1);
    }

    // let cookieName = prompt("API Name", region);
    let cookieName = region;

    if(cookieName && cookieName.length > 0) {
        document.cookie = cookieName + "=" + (value || "")  + expires + "; path=/";
    }

    getCookiesForList();
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

function eraseCookie(name) {
    document.cookie = name+'=; Max-Age=-99999999;';
    getCookiesForList();
}