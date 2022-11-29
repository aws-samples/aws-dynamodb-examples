// Global-Serverless web app code
// This webapp makes HTTP GET calls to API Gateways that you have setup previously, or to demo APIGWs
// There is no AWS code here nor authentication. It's designed as a kind of test harness or playground so you can
//  try out reads and writes to DynamoDB Global Table replicas around the world.
//

let writeStarted = null;

getCookiesForList();

function getColors () {
    return [ 'lavender','papayawhip', 'paleturquoise', 'palegoldenrod', 'pink', 'ivory', 'bisque', 'mintcream',  'cornsilk', 'honeydew', 'oldlace', 'plum', 'palegreen', 'thistle', 'paleturquoise'];

}

function getSampleItemKeys() {
    return({
        'Keys': {
            'PK': 'user100',
            'SK': 'AshlandValley'
        }
    });
}

async function callApi(cookie, api, index) {

    const colorPalette = getColors();
    const color=colorPalette[index];

    const regionCount = document.getElementById('list').rows.length;

    let latencyCell = document.getElementById(cookie + '-latency');
    let totalLatencyCell = document.getElementById(cookie + '-totallatency');

    const started = new Date().getTime();

    // document.getElementById('hg' + index).style.visibility = 'visible';

    const response = await fetch(api);

    if(response.ok) {
        const ended = new Date().getTime();
        const latency = ended - started;

        let data = await response.json();

        let LambdaLatency = data?.Latency;

        latencyCell.innerHTML = '<span class="latency">&nbsp;'
            + (LambdaLatency ?  LambdaLatency.toLocaleString() + ' ms&nbsp;<br/>&nbsp;<span style="color:gray; font-size:smaller">DynamoDB</span>&nbsp;' : '')
            + '</span>';

        totalLatencyCell.innerHTML = '<span class="latency">&nbsp;'
            +  latency.toLocaleString() + ' ms&nbsp;<br/>&nbsp;<span style="color:gray; font-size:smaller">Total</span>&nbsp;'
            + '</span>';


        // const results = document.getElementById('results');

        const resultsBody = document.getElementById('resultsBody');

        const row0 = resultsBody.insertRow(0);

        for(let i=0; i < index; i++) {
            const cell0 = row0.insertCell(-1);
            cell0.className = "resTable";

        }

        const cell1 = row0.insertCell(-1);
        cell1.className = "tablenull";

        let res = document.createElement('table');

        res.className = 'resTable';

        cell1.appendChild(res);

        // container.appendChild(res);

        let readAfterWriteSpan;

        if(writeStarted) {
            const readAfterWriteTime = new Date().getTime();
            readAfterWriteSpan = readAfterWriteTime - writeStarted;
        } else {
            readAfterWriteSpan = null;
        }


        if('Items' in data || 'Item' in data) {  // get-item

            let items = [];
            if('Item' in data) {
                items = [data.Item];
            } else {
                items = data.Items;
            }

            const row0 = res.insertRow(0);

            const cell0 = row0.insertCell(-1);
            cell0.className = "tablenull";
            cell0.innerHTML = '&nbsp;';

            if(items) {

                items.forEach((item) => {

                    let attrs = Object.keys(item);
                    attrs.sort((a,b) => {
                        const aScore = a === 'PK' ? 2 : a === 'SK' ? 1 : 0;
                        const bScore = b === 'PK' ? 2 : b === 'SK' ? 1 : 0;
                        return (bScore - aScore);
                    });

                    const row = res.insertRow(0);


                    attrs.forEach(attr => {
                        const cell1 = row.insertCell(-1);
                        cell1.className = "dataheader";
                        cell1.style="background-color:" + colorPalette[index];
                        cell1.innerHTML = '<div class="databox">' + attr + '<div class="datavalue">' + item[attr][Object.keys(item[attr])[0]] + '</div></div>';

                    });

                    const cellFinal = row.insertCell(-1);
                    cellFinal.className = "cellFinal";
                    if(readAfterWriteSpan && readAfterWriteSpan < 9999) {
                        cellFinal.innerHTML =  Math.round(readAfterWriteSpan/100) / 10 + ' seconds<br/>since update';
                    }

                });

            }
            document.getElementById('clearButton').style.display = 'inline';

        } else {

            if('Attributes' in data && 'Bookmark' in data['Attributes']) {  // update

                writeStarted = new Date().getTime();

                const row0 = res.insertRow(0);
                const row = res.insertRow(0);

                const cell1 = row.insertCell(-1);
                cell1.className = "dataheader";
                cell1.style="background-color:" + colorPalette[index];
                const PK =  data['PK'];
                cell1.innerHTML = '<div>PK<div class="datavalue">' + PK + '</div></div>';

                const cell2 = row.insertCell(-1);
                cell2.className = "dataheader";
                cell2.style="background-color:" + colorPalette[index];
                const SK =  data['SK'];
                cell2.innerHTML = '<div>SK<div class="datavalue">' + SK + '</div></div>';

                const cell3 = row.insertCell(-1);
                cell3.className = "dataheader";
                cell3.style="background-color:" + colorPalette[index];
                const newBookmarkObj =  data['Attributes']['Bookmark'];
                const newBookmark = newBookmarkObj[Object.keys(newBookmarkObj)[0]];

                const incrementAction = api.substring(api.lastIndexOf('/') + 1);
                const oldValue = (Number(newBookmark) + (Number(incrementAction) * -1));

                cell3.innerHTML = '<div>Bookmark <div class="datavaluenew"><span class="datavalueold">' + oldValue + '&nbsp;➡&nbsp;️</span>' + newBookmark + '</div></div>';


                const cellFinal = row.insertCell(-1);
                cellFinal.className = "cellFinal";
                if(readAfterWriteSpan && readAfterWriteSpan < 19999) {
                    cellFinal.innerHTML =  Math.round(readAfterWriteSpan/100) / 10 + ' seconds<br/>since update';
                }

                document.getElementById('clearButton').style.display = 'inline';

            } else {

                if('Error' in data) {
                    console.error(data.Error);
                    latencyCell.innerHTML = '<span class="error">Error</span>';
                } else {

                    // console.log(JSON.stringify(data, null, 2))
                }
            }

        }

    } else {
        latencyCell.innerHTML = '<span class="error">HTTP ' + response.status + '</span>';
        // console.log('HTTP-Error: ' + response.status)
    }

    // document.getElementById('hg' + index).style.visibility = 'hidden';

}


function getCookiesForList() {

    const sampleItem = getSampleItemKeys();

    const demo_item_pk = sampleItem.Keys.PK;
    const demo_item_sk = sampleItem.Keys.SK;

    const cookieObj = document.cookie.split('; ').reduce((prev, current) => {
        const [name, ...value] = current.split('=');
        prev[name] = value.join('=');
        return prev;
    }, {});

    const table = document.getElementById('list');
    const debug = document.getElementById('debug');

    const colorPalette = getColors();

    table.innerHTML = '';

    document.getElementById('resultsHeadRow').innerHTML = null;

        Object.keys(cookieObj).forEach((cookie, index)=>{

            if(cookie !== "") {

                document.getElementById('gf').style.display = 'inline';
                document.getElementById('list').style.display = 'block';
                document.getElementById('results').style.display = 'block';

                const row = table.insertRow(-1);


                let stackRegion = cookieObj[cookie].split('.')[2];

                const cell2 = row.insertCell(-1);
                cell2.className = "tabledata";
                cell2.style="background-color:" + colorPalette[index];

                cell2.innerHTML = '<b>' + stackRegion + '</b><br/>' + cookieObj[cookie].split('.')[0]

                const cell3 = row.insertCell(-1);
                cell3.className = "tabledata";
                cell3.style="background-color:" + colorPalette[index];
                cell3.innerHTML = "<button onClick=eraseCookie('"+cookie+"')>X</button>"

                const cell4 = row.insertCell(-1);
                cell4.className = "tabledata";
                cell4.style="background-color:" + colorPalette[index];
                cell4.innerHTML = "<button class='go' onClick=callApi('" + cookie + "','" + cookieObj[cookie] + "','"+index.toString()+"')>ping API</button>";

                const cell5 = row.insertCell(-1);
                cell5.className = "tabledata";
                cell5.style="background-color:" + colorPalette[index];
                cell5.innerHTML = "<button class='go' onClick=callApi('" + cookie + "','" + cookieObj[cookie] + "get/" + demo_item_pk + "/" + demo_item_sk + "','"+index.toString()+"')>get-item</button>";

                // const cell6 = row.insertCell(-1);
                // cell6.className = "tabledata";
                // cell6.style="background-color:" + colorPalette[index];
                // cell6.innerHTML = "update<br/>bookmark:";

                const cell7 = row.insertCell(-1);
                cell7.className = "tabledataBookmark";
                cell7.style="background-color:" + colorPalette[index];
                cell7.innerHTML = "Update item bookmark:<br/><button class='gobig' onClick=callApi('" + cookie + "','" + cookieObj[cookie] + "update/" + demo_item_pk + "/" + demo_item_sk + "/-1','"+index.toString()+"')>➖</button>&nbsp;<button class='gobig' onClick=callApi('" + cookie + "','" + cookieObj[cookie] + "update/" + demo_item_pk + "/" + demo_item_sk + "/1','"+index.toString()+"')>➕</button>";

                const cell8 = row.insertCell(-1);
                cell8.style="background-color:" + colorPalette[index];
                cell8.id = cookie + '-latency';

                const cell9 = row.insertCell(-1);
                cell9.style="background-color:" + colorPalette[index];
                cell9.id = cookie + '-totallatency';


                const resultsHeadRow = document.getElementById('resultsHeadRow');
                const resultsHeadCell = resultsHeadRow.insertCell(-1);
                resultsHeadCell.style = "min-width:200px;padding:5px;padding-left:10px;padding-right:10px;color:black;font-size:larger;background-color:" + colorPalette[index];
                resultsHeadCell.innerHTML = cookie;

            }

        });




}

function setCookie(value) {

    if(typeof value === 'object' || value.length === 0) {
        console.log('Error: no URL was entered');

    } else {

        let days = 1000;
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }

        let region = 'us-west-2'; // may be reset

        let amazonDomainPos = value.search('amazonaws.com');
        if(amazonDomainPos > 0) {
            let prefix = value.slice(0, amazonDomainPos-1);

            region = prefix.slice(prefix.lastIndexOf('.') + 1);
        }

        let cookieName = region;

        if(cookieName && cookieName.length > 0) {
            document.cookie = cookieName + "=" + (value || "")  + expires + "; path=/";
        }

        getCookiesForList();
    }
}

// function getCookie(name) {
//     let nameEQ = name + "=";
//     let ca = document.cookie.split(';');
//     for(let i=0;i < ca.length;i++) {
//         let c = ca[i];
//         while (c.charAt(0)===' ') c = c.substring(1,c.length);
//         if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length,c.length);
//     }
//     return null;
// }

function eraseCookie(name) {
    document.cookie = name+'=; Max-Age=-99999999; path=/';
    getCookiesForList();
}

function clearResults() {
    document.getElementById('resultsBody').innerHTML = '';
    document.getElementById('clearButton').style.display = 'none';
}
