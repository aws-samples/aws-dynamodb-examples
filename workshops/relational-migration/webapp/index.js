
const dateConversionType = 'string'; // int

const sqlSamples = getSqlSamples();

function setCookie(value) {

    if(typeof value === 'object' || value.length === 0) {
        const apiTitle = document.getElementById('apiTitle');
        // const navtable = document.getElementById('navtable');

        document.cookie.split(";").forEach(function(c) { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); });

        apiTitle.style.visibility = 'hidden';
        // console.log('Error: no URL was entered');
    } else {
        let days = 1000;
        let expires = "";
        if (days) {
            let date = new Date();
            date.setTime(date.getTime() + (days*24*60*60*1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = "API1" + "=" + (value || "")  + expires + "; path=/";
    }
    document.getElementById('clearCookie').style.visibility = 'visible';
    renderNav();
}
function clearCookie() {
    setCookie('');
    document.getElementById('clearCookie').style.visibility = 'hidden';
}

async function renderNav() {

    const apiTitle = document.getElementById('apiTitle');
    const bodycontent = document.getElementById('bodycontent');
    const clearCookie = document.getElementById('clearCookie');

    if(document.cookie) {
        apiTitle.style.visibility = 'visible';
        cookieVal = document.cookie.split('=')[1]

        apiTitle.innerHTML = cookieVal;
        bodycontent.style.visibility = 'visible';
        clearCookie.style.visibility = 'visible';

    } else {
        apiTitle.style.visibility = 'hidden';
        bodycontent.style.visibility = 'hidden';
        clearCookie.style.visibility = 'hidden';
        return;
    }

    const rootTest = await callApi('/'); // smoke test to ensure API responds with {"engine":"xyz"}
    const engine = rootTest['engine'];
    const stage = rootTest['stage'];
    document.getElementById('engine').value = engine;
    document.getElementById('stage').value = stage;
    document.getElementById('pageTitle').innerHTML = engine + ' App';
    document.title = engine + ' App';
    if(stage !== 'dynamodb') {
        document.getElementById('pageTitle').style.color = 'darkred';
    }

}

function openTab(tabName) {
    clear('grid1');
    clear('grid_queryresult');
    document.getElementById('tableCrudButtons').innerHTML = '';
    document.getElementById('tab').value = tabName;
    document.getElementById('fkGrid').style.display = 'none';

    let x = document.getElementsByClassName("tab");
    for (let i = 0; i < x.length; i++) {
        x[i].style.display = "none";
    }
    document.getElementById(tabName).style.display = "block";

    let tabs = document.getElementById("tabs").children;
    for(let i=0; i < tabs.length; i++) {
        if(tabs[i].innerHTML === tabName) {
            tabs[i].className = 'tabActive';
        } else {
            tabs[i].className = 'tabInactive';
        }
    }
    if(tabName === 'CRUD') {
        const tableName = document.getElementById('tableName').value;
        if(tableName) {
            descTableClick(tableName);
        }
    }
    if(tabName === 'Querying') {
        descIndexesClick(document.getElementById('tableName').value);
        if(document.getElementById('stage').value === 'dynamodb') {
            document.getElementById('sqlPanel').style.display = 'none';
        }
    }

}

async function listTables() {
    clear('grid1');
    clear('grid_queryresult');
    clear('tblForm');

    document.getElementById('tableCrudButtons').innerHTML = '';
    document.getElementById('generateDiv').className = 'GenHidden';
    document.getElementById('tableName').value = '';
    document.getElementById('fkGrid').style.display = 'none';
    setTableTitle(); // clear it

    let tableListTable = document.getElementById("leftNavTable");

    tableListTable.innerHTML = null;

    const listResult = await callApi('/list_tables');
    const tables = listResult['Tables'];

    if(tables.length === 0) {
        const row = tableListTable.insertRow(-1);
        const cell1 = row.insertCell();
        cell1.innerHTML = 'no tables found';
    }

    tables.forEach((item, index) => {
        const row = tableListTable.insertRow(-1);
        const cell1 = row.insertCell();

        const newButton = document.createElement('button');

        newButton.id = 'btn' + item;

        newButton.className = "tableButton";
        newButton.onclick = () => tableClickHandler(item);

        // let dotPosition = item.indexOf('.');
        // if(dotPosition === -1) {
        newButton.textContent = item;
        newButton.className = "tableButton";
        // } else {
        //     newButton.textContent = item.substring(dotPosition+1);
        //     newButton.className = "tableButtonIndex";
        // }

        cell1.appendChild(newButton);

    });
}
async function tableClickHandler(table) {
    clear('grid1');
    clear('grid_queryresult');

    document.getElementById('tablePanel').className = 'tablePanel';
    document.getElementById('fkGrid').style.display = 'none';

    setTableTitle(table);

    const resetButtons = document.getElementsByClassName('tableButtonActive');
    if(resetButtons.length>0) {
        // resetButton[0].className = 'tableButton';

        let buttonText = resetButtons[0].textContent || resetButtons[0].innerText;

        if(buttonText.indexOf('.') === -1 ) {
            resetButtons[0].className = 'tableButton';
        } else {
            resetButtons[0].className = 'tableButtonIndex';
        }

    }

    const clickedButton = document.getElementById('btn' + table);
    clickedButton.className = 'tableButtonActive';

    if(document.getElementById('tab').value === 'Querying') {
        if(table) {
            await descIndexesClick(table);
        }

    } else {
        await descTableClick(table);
    }
}

async function descTableClick(table) {

    let indexName = null;
    let tableName = null;
    let currentIndex = null;
    let dotPosition = table.indexOf('.');

    if(dotPosition > -1) {
        indexName = table.substring(dotPosition+1);
        tableName = table.substring(0, dotPosition);
    } else {
        tableName = table;
    }

    clear('tblForm');

    document.getElementById('dataset').value = null;
    let tableMetadata = null;

    const descTableResult = await callApi('/desc_table/' + tableName);

    if(Array.isArray(descTableResult)) {
        tableMetadata = formatMetadata(descTableResult, table); // Relational SQL
    } else {
        tableMetadata = {'Table': descTableResult}; // DynamoDB
    }

    document.getElementById('tableName').value = table;
    if(indexName) {
        document.getElementById('indexName').value = indexName;
        currentIndex = tableMetadata['Table']['GlobalSecondaryIndexes'].filter((i) => i['IndexName'] === indexName)[0];
    } else {
        currentIndex = tableMetadata['Table'];
    }
    document.getElementById('tableMetadata').value = JSON.stringify(tableMetadata);
    // console.log('tableMetadata ***');
    // console.log(JSON.stringify(tableMetadata, null, 2));

    const ADs = tableMetadata['Table']['AttributeDefinitions'];

    const Ks = currentIndex['KeySchema'];
    // console.log('currentIndex');
    // console.log(JSON.stringify(currentIndex, null, 2));
    const FKs = tableMetadata['Table']['ForeignKeys'];

    const keyList = Ks.map((key) => key['AttributeName']);
    // console.log(keyList);

    let AdTypes = {};
    ADs.map((ad) => {
        AdTypes[ad['AttributeName']] = ad['AttributeType'];
    });

    const tableCrudButtons = document.getElementById('tableCrudButtons');
    tableCrudButtons.innerHTML = '';

    const row = tableCrudButtons.insertRow(-1);
    const cell1 = row.insertCell(-1);
    const btn1 = document.createElement('button');
    btn1.textContent = 'SCAN';
    btn1.className = "findButton";
    btn1.id = 'btnScan' + table;
    btn1.onclick = () => scanTable(table);
    cell1.appendChild(btn1);

    const cell3 = row.insertCell(-1);
    cell3.rowSpan=2;
    cell3.className = "getFormCell";

    const getTable = document.createElement('table');

    const getRowPk = getTable.insertRow(-1);
    const getCellPkLabel = getRowPk.insertCell(-1);

    getCellPkLabel.appendChild(document.createTextNode(keyList[0]));
    const getCellPkInput = getRowPk.insertCell(-1);

    const input1 = document.createElement('input');
    input1.type = 'text';
    input1.name = keyList[0];
    input1.className = 'pkFindBox';
    getCellPkInput.appendChild(input1);

    const getCellPkButton = getRowPk.insertCell(-1);
    if(keyList.length > 1) {
        getCellPkButton.rowSpan = 2;
    }

    const btnGet = document.createElement('button');
    btnGet.textContent = 'GET ITEM';
    btnGet.className = "tableButton";
    btnGet.id = 'btnGet' + table;

    btnGet.onclick = () => getItem(table, 'formQuery');

    getCellPkButton.appendChild(btnGet);

    if(keyList.length > 1) {
        const getRowSk = getTable.insertRow(-1);
        const getCellSkLabel = getRowSk.insertCell(-1);

        getCellSkLabel.appendChild(document.createTextNode(keyList[1]));
        const getCellSkInput = getRowSk.insertCell(-1);

        const input2 = document.createElement('input');
        input2.type = 'text';
        input2.name = keyList[1];
        input2.className = 'pkFindBox';
        getCellSkInput.appendChild(input2);
    }

    cell3.appendChild(getTable);

    const row2 = tableCrudButtons.insertRow(-1);
    const cell2 = row2.insertCell(-1);
    const btn2 = document.createElement('button');
    btn2.textContent = 'INSERT';
    btn2.className = "findButton";
    btn2.id = 'btnInsert' + table;
    btn2.onclick = () => insertRowForm(table);
    cell2.appendChild(btn2);

    tableSchemaGrid(tableMetadata, 'grid1');
    if(document.getElementById('stage').value !== 'dynamodb') {
        document.getElementById('generateDiv').className = 'GenVisible';
        document.getElementById('generateType').innerHTML = 'DynamoDB Table Definition';
    }

}

async function descIndexesClick(table) {
    clear('indexSummary');
    clear('tblForm');
    clear('indexSummaryList');
    document.getElementById('generateIndexResults').style = null;
    document.getElementById('generateIndexResults').className = 'GenHidden';
    document.getElementById('dataset').value = null;

    const viewListResult = await callApi('/list_tables');
    const viewList = viewListResult['Views'];

    if(table) {

        const descTableResult = await callApi('/desc_table/' + table);

        let tableMetadata = formatMetadata(descTableResult, table);

        if(document.getElementById('stage').value !== 'dynamodb') {
            const FKs = tableMetadata['Table']['ForeignKeys'] || null;
            const fkCount = FKs ? FKs.length : 0;

            if(fkCount === 0) {
                document.getElementById('FKs').style = 'visibility:hidden;';
                document.getElementById('foreignKey').style = 'display:none;';

            } else {
                document.getElementById('foreignKey').style = 'display:block';
                document.getElementById('FKs').style = 'visibility:visible';
            }
        }
        // console.log('tmd');
        // console.log(JSON.stringify(tableMetadata, null, 2));

        document.getElementById('tableMetadata').value = JSON.stringify(tableMetadata);

        setTableTitle(table);

        const ADs = tableMetadata['Table']['AttributeDefinitions'];
        const Ks = tableMetadata['Table']['KeySchema'];
        const keyList = Ks.map((key) => key['AttributeName']);
        let AdTypes = {};
        ADs.map((ad) => {
            AdTypes[ad['AttributeName']] = ad['AttributeType'];
        });

        tableMetadata = JSON.stringify(tableMetadata);

        const idxTable = document.getElementById('indexSummary');

        let indexMetadata = [];
        let secondaryIndexCount = 0;

        if (tableMetadata) {
            indexMetadata = JSON.parse(tableMetadata)['Table']['GlobalSecondaryIndexes'];
            if(indexMetadata) {
                secondaryIndexCount = indexMetadata.length;
            } else {
                indexMetadata = [];
            }

            indexMetadata.unshift({
                "IndexName": "PRIMARY",
                "KeySchema": Ks
            });

            indexMetadata.forEach((idxCol, idx) => {

                if(idx === 0) {
                    const row0 = idxTable.insertRow(-1);
                    const cell0 = row0.insertCell();
                    cell0.innerHTML = 'Base Table : ';
                    cell0.style = "padding-top:10px;";
                    cell0.colSpan = 2;
                }
                if(idx === 1) {
                    const row0 = idxTable.insertRow(-1);
                    const cell0 = row0.insertCell();

                    cell0.innerHTML = indexMetadata.length > 2  ? 'Secondary Indexes : ' : 'Secondary Index : ';
                    cell0.colSpan = 2;
                }

                let ksLength = idxCol['KeySchema'].length;
                const stylePk = "background-color: SkyBlue;";
                const styleSk = "background-color: LightGreen;";

                idxCol['KeySchema'].forEach((key, idxKey) => {

                    const row = idxTable.insertRow(-1);
                    const cellIndent = row.insertCell();
                    cellIndent.innerHTML = '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';

                    if(idxKey === 0) {
                        const cell1 = row.insertCell();
                        cell1.className = "gridDataFinal";
                        cell1.style = "border-top-left-radius:5px;border-bottom-left-radius:5px;padding-bottom:10px;padding-top:10px;";
                        cell1.innerHTML = idxCol['IndexName'];
                        cell1.rowSpan = ksLength;
                    }

                    const cell2 = row.insertCell();
                    cell2.className = idxKey === ksLength - 1 ? "gridDataFinal" : "gridData";
                    cell2.innerHTML = idxCol['KeySchema'][idxKey]['AttributeName'];
                    cell2.style = (idxKey === 0 ? stylePk : styleSk);

                    const cell3 = row.insertCell();
                    cell3.className = idxKey === ksLength - 1 ? "gridDataFinal" : "gridData";
                    cell3.innerHTML = AdTypes[idxCol['KeySchema'][idxKey]['AttributeName']] || '-';
                    cell3.style = (idxKey === 0 ? stylePk : styleSk);

                    const cell4 = row.insertCell();
                    cell4.className = "gridData";
                    const inputBox = document.createElement('input');
                    inputBox.id = 'isBox' + idx + '#' + idxKey;
                    inputBox.style = 'width:100px;';
                    inputBox.value = '';
                    cell4.appendChild(inputBox);

                    const cell5 = row.insertCell();
                    cell5.className = "gridData";
                    const indexSearchButton = document.createElement('button');
                    indexSearchButton.id = 'isBtn' + idx + '#' + idxKey;
                    indexSearchButton.innerText = 'GO';
                    indexSearchButton.onclick = () => {

                        let qr = {'queryRequest': {'queryConditions': {}}};
                        qr['queryRequest']['index'] = idxCol['IndexName'];

                        for (let i =0; i <= idxKey; i++) {
                            qr['queryRequest']['queryConditions'][idxCol['KeySchema'][i]['AttributeName']] = document.getElementById('isBox' + idx + '#' + i).value;
                        }
                        let sql = 'SELECT *\nFROM ' + table + '\nWHERE ';
                        Object.keys(qr['queryRequest']['queryConditions']).forEach((key, idxCondition) => {
                            sql += key + '="' + qr['queryRequest']['queryConditions'][key] + '"';
                            if(Object.keys(qr['queryRequest']['queryConditions']).length - 1 > idxCondition) {
                                sql += '\n  AND ';
                            }
                        });
                        updateSQL(sql);  // update but call runQuery() and not runsql()
                        // console.log('query on table ' + table);
                        // console.log(JSON.stringify(qr, null, 2));

                        runQuery(table, qr);
                    };
                    cell5.appendChild(indexSearchButton);

                    if(ksLength - 1 === idxKey) {
                        const rowSpacer = idxTable.insertRow(-1);
                        const cellSpacer = rowSpacer.insertCell();
                        cellSpacer.innerHTML = '&nbsp;';
                    }
                });
            });

            if(document.getElementById('stage').value !== 'dynamodb' && secondaryIndexCount > 0) {
                document.getElementById('generateIndexDiv').className = 'GenVisible';
            } else {
                document.getElementById('generateIndexDiv').className = 'GenHidden';
            }
        }
    }

    const sampleButtonsSpan = document.getElementById('sampleButtons');
    const viewListDiv = document.getElementById('viewListDiv');

    let i = 0;

    sampleButtonsSpan.innerHTML = null;
    sqlSamples.forEach((sample) => {

        const newButton = document.createElement('button');

        if(sample.length === 0) {
            sampleButtonsSpan.appendChild(document.createTextNode(" - - - "));
        } else {
            i += 1;
            newButton.textContent = 'S ' + i;
            newButton.onclick = () => updateSQL(sample);
            sampleButtonsSpan.appendChild(newButton);
        }
    });

    viewListDiv.innerHTML = null;

    if(document.getElementById('stage').value !== 'dynamodb') {
        viewList.forEach((view) => {
            // const newButtonCode = document.createElement('button');
            const newButtonTest = document.createElement('button');
            // newButtonCode.textContent = 'SQL';
            newButtonTest.textContent = view;
            // let viewSQL = "SELECT VIEW_DEFINITION FROM INFORMATION_SCHEMA.VIEWS\n";
            // viewSQL += "WHERE TABLE_NAME = '" + view + "'";
            let viewSQL = "SELECT * FROM " + view;

            // newButton.onclick = () => updateSQL("SELECT * FROM " + view);

            // newButtonCode.onclick = async () => {
            //     const viewCode = await callApi('/desc_view/' + view);
            //     const viewCodeFormatted = viewCode['VIEW_DEFINITION'];
            //
            //     updateSQL('CREATE OR REPLACE VIEW ' + view + ' AS\n\n' + viewCodeFormatted);
            // }
            newButtonTest.onclick = async () => {

                updateSQL('SELECT *\nFROM ' + view);
                runsql()
            }
            // const viewButtonDiv = document.createElement("span");

            // viewButtonDiv.appendChild(newButtonCode);
            viewListDiv.appendChild(newButtonTest);
            // viewButtonDiv.appendChild(document.createTextNode(view));

            // viewListDiv.appendChild(viewButtonDiv);

            // viewListDiv.appendChild(document.createElement("br"));
        });
    }

}

function updateSQL(sql) {
    document.getElementById('sqlText').value = sql;
}
async function scanTable(table) {

    clear('tblForm');
    log(null);

    const scanData = await callApi('/scan_table/' + table);

    // console.log(JSON.stringify(scanData, null, 2));

    document.getElementById('dataset').value = JSON.stringify(scanData);

    const tableMetadata = document.getElementById('tableMetadata').value;

    if(scanData) {
        fillGrid(scanData, 'grid1', table, tableMetadata);
    }

    document.getElementById('generateType').innerHTML = 'Dataset as DynamoDB JSON';

}
async function getItem(table, formName) {
    clear('grid1');
    clear('grid_queryresult');
    clear('tblForm');

    const formItem = document.getElementById(formName);
    const formValues = formItem.querySelectorAll( "input" );
    let formValuesJSON = {};

    formValues.forEach((field, idx) => {
        formValuesJSON[field.name] = field.value;
    });
    const request = {"Key": formValuesJSON};
    // console.log(JSON.stringify(request, null, 2));

    const response = await postApi('/get_record/' + table, request);
    const responseJSON = await response.json();

    // console.log(JSON.stringify(responseJSON, null, 2));

    if(responseJSON.length === 0) {
        log('item not found');
        document.getElementById('generateDiv').className = 'GenHidden';

    } else {
        document.getElementById('generateDiv').className = 'GenVisible';
        document.getElementById('dataset').value = JSON.stringify(responseJSON);
        // console.log(formValuesJSON);
        // console.log(responseJSON[0]);
        console.log('500 ' + JSON.stringify(formValuesJSON));

        insertRowForm(table, {'Key': formValuesJSON}, responseJSON[0]);
    }
    document.getElementById('generateType').innerHTML = 'Item as DynamoDB JSON';
    return {};
}

function generate(type) {

    const tableMetadataFull = document.getElementById('tableMetadata').value;
    const dataset =  document.getElementById('dataset').value;

    let tableMetadataJSON = JSON.parse(tableMetadataFull);

    if(type && type==='indexes') {
        // leave GSIs intact
    } else {
        // create table definition without indexes
        tableMetadataJSON['Table']['GlobalSecondaryIndexes'] = [];
    }
    const tableMetadata = JSON.stringify(tableMetadataJSON);

    let textBox;
    let genDiv;

    if(type === 'indexes') {
        textBox = document.getElementById('textGenIndex');
        genDiv = document.getElementById('generateIndexResults');
    } else {
        textBox = document.getElementById('textGen');
        genDiv = document.getElementById('generateResults');
    }
    if(document.getElementById('stage').value !== 'dynamodb') {
        const generated = generateDDB(tableMetadata, dataset);
        textBox.value = generated;
        // genDiv.style.display = 'block';
        genDiv.style.display = genDiv.style.display === 'block' ? 'none' : 'block';
    }

    return {};
}

function showFKs() {
    const tblDiv = document.getElementById('fkGrid');
    tblDiv.style.display = tblDiv.style.display === 'block' ? 'none' : 'block';
    const tableMetadataFull = document.getElementById('tableMetadata').value;

    if(tableMetadataFull) {
        const FKs = JSON.parse(tableMetadataFull)['Table']['ForeignKeys'];
        const tableName = JSON.parse(tableMetadataFull)['Table']['TableName'];

        const tblDiv = document.getElementById('fkGrid');
        tblDiv.innerHTML = null;

        if(FKs) {
            Object.keys(FKs).forEach((key) => {
                const tbl = document.createElement('table');
                tbl.className = 'fkTable';

                const row = tbl.insertRow(-1);
                const cell1 = row.insertCell();
                cell1.innerHTML = FKs[key]['ConstraintName'];
                cell1.colSpan = 2;
                cell1.style = 'font-weight:bold';

                let conditionString = tableName + '.' + FKs[key]['ColumnName'];
                conditionString += ' = ' + FKs[key]['ReferencedTable'] + '.' + FKs[key]['ReferencedColumn'];

                const row1 = tbl.insertRow(-1);
                const cell3 = row1.insertCell();
                cell3.innerHTML = 'Relationship';

                const cell4 = row1.insertCell();
                cell4.innerHTML = '<pre>'  + conditionString + '</pre>';

                let sqlString = 'SELECT\n   ' + tableName + '.*, ' + FKs[key]['ReferencedTable'] + '.*\n';
                sqlString += 'FROM\n   ' + tableName + '\n   INNER JOIN ' + FKs[key]['ReferencedTable'] + '\n     ON ' + conditionString;

                const row2 = tbl.insertRow(-1);
                const cell5 = row2.insertCell();
                cell5.innerHTML = 'SQL';

                const cell6 = row2.insertCell();
                const btn1 = document.createElement('button');
                btn1.textContent = 'Paste to editor';
                btn1.onclick = () => updateSQL(sqlString);
                cell6.appendChild(btn1);

                tblDiv.appendChild(tbl);

            });
        } else {

        }

        // fillGrid(FKs, 'fkGrid');

    }
    let tableMetadataJSON = JSON.parse(tableMetadataFull);
    // fillGrid(FKs, 'fkGrid');

}
function copyText(type) {
    let textGen;
    if(type === 'indexes') {
        textGen = document.getElementById('textGenIndex');
    } else {
        textGen = document.getElementById('textGen');
    }
    textGen.focus();
    textGen.select();

    try {
        document.execCommand('copy');
        textGen.blur();
    } catch (err) {
        console.log('unable to copy');
    }

}
function log(msg, status) {

    let tab = document.getElementById('tab').value;

    let logDiv;
    if(tab === 'CRUD') {logDiv = document.getElementById('log'); }
    if(tab === 'Querying') {logDiv = document.getElementById('log2');}

    if(msg) {
        logDiv.style.visibility = 'visible';
    } else {
        logDiv.style.visibility = 'hidden';
    }
    logDiv.innerHTML = msg;
}
