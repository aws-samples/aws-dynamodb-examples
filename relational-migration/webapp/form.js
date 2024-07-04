
async function insertRowForm(table, itemKey, existingItem) {

    clear('grid1');
    clear('tblForm');
    log(null);

    const tableMetadata = JSON.parse(document.getElementById('tableMetadata').value);

    const ADs = tableMetadata['Table']['AttributeDefinitions'];
    const Ks = tableMetadata['Table']['KeySchema'];
    const keyList = Ks.map((key) => key['AttributeName']);
    let AdTypes = {};
    ADs.map((ad) => {
        AdTypes[ad['AttributeName']] = ad['AttributeType'];
    });

    let myTable = document.getElementById('tblForm');
    myTable.className = 'newItemForm';

    let colPrimary = true;

    ADs.forEach((item, index) => {

        if(index >= Ks.length) {
            colPrimary = false;
        }
        const cols = Object.keys(item);

        const row = myTable.insertRow(-1);
        let colType = 'string';
        let colName = '';
        let rowClassName = 'gridData';

        cols.forEach((col, index2) => {

            if(index2 === 0) {
                if(item[col] === keyList[0]) {
                    rowClassName = "PK";
                }
                if(keyList.length > 1 && item[col] === keyList[1]) {
                    rowClassName = "SK";
                }

                const cell1 = row.insertCell(-1);
                cell1.className = rowClassName;
                cell1.innerHTML = item[col];
                colName = item[col];
            }

            if(index2 === 1) {
                const cell2 = row.insertCell(-1);
                cell2.className = rowClassName;
                cell2.innerHTML = item[col];
                if(item[col].slice(0, 3) === 'int') {
                    colType = 'int';
                }
                if(item[col].slice(0, 9) === 'datetime') {
                    colType = 'datetime';
                }
            }
        });

        const cell3 = row.insertCell(-1);

        cell3.className = rowClassName;

        if(existingItem) {
            document.getElementById('dataset').value = '[' + JSON.stringify(existingItem) + ']';
        }
        if(existingItem && itemKey && colName in itemKey) {
            cell3.innerHTML = existingItem[colName];
        } else {
            const input = document.createElement('input');
            input.type = "text";
            input.name = colName;

            if(existingItem && colName in existingItem) {
                input.value = existingItem[colName];
            } else {
                if(colPrimary)  {
                    let uniqueNumber = Date.now().toString().slice(4,10);
                    input.value = colName + '-' + uniqueNumber;
                } else {
                    if(colType === 'int') {input.value = 123; }
                    if(colType === 'datetime') {input.value = '2024-06-15'; }
                    if(colType === 'string') {input.value = 'abc'; }
                }
            }

            cell3.appendChild(input);
        }

    });

    const rowFinal = myTable.insertRow(-1);
    const cellF1 = document.createElement("td");
    cellF1.colSpan = 3;
    cellF1.className = "formSubmitCell";
    const button = document.createElement("button");
    button.className = "formSubmitButton";

    if(existingItem) {  //update
        button.onclick = () => update(table, itemKey,'formItem');
    } else {
        button.onclick = () => insert(table, 'formItem');
    }

    button.appendChild(document.createTextNode("SAVE"));
    cellF1.appendChild(button);
    rowFinal.appendChild(cellF1);

    document.getElementById('generateType').innerHTML = 'Item as DynamoDB JSON';
}


async function insert(table, formName) {
    const formItem = document.getElementById(formName);
    const formValues = formItem.querySelectorAll( "input" );
    let formValuesJSON = {};

    formValues.forEach((field, idx) => {
        formValuesJSON[field.name] = field.value;
    });

    const response = await postApi('/new_record/' + table, formValuesJSON);
    const responseJSON = await response.json();

    if(responseJSON['status'] === 1) {
        log('1 record inserted');
        document.getElementById('dataset').value = '[' + JSON.stringify(formValuesJSON) + ']';
    } else {
        log(responseJSON['status']);
    }
}

async function update(table, recordKey, formName) {
    const formItem = document.getElementById(formName);
    const formValues = formItem.querySelectorAll( "input" );
    let formValuesJSON = {};

    formValues.forEach((field, idx) => {
        formValuesJSON[field.name] = field.value;
    });

    const updateRequest = {
        "recordKey": recordKey,
        "updateAttributes": formValuesJSON
    };

    const response = await postApi('/update_record/' + table, updateRequest);
    const responseJSON = await response.json();

    if(responseJSON['status'] === 1) {
        log('1 record written');
        document.getElementById('dataset').value = '[' + JSON.stringify(formValuesJSON) + ']';

    } else {
        log(JSON.stringify(responseJSON));
    }
}

async function deleteItem(table, recordKey) {

    const response = await postApi('/delete_record/' + table, recordKey);
    const responseJSON = await response.json();

    if(responseJSON['status'] === 1) {
        log('1 record deleted');
    } else if(responseJSON['status'] === 0) {
        log('0 records deleted');
    }

}

async function runQuery(table, queryRequest){

    document.getElementById('sqlGrid').innerHTML = null;

    const response = await postApi('/query/' + table, queryRequest);

    const responseJSON = await response.json();

    console.log(JSON.stringify(responseJSON, null, 2));

    let dataGrid = document.getElementById('sqlGrid');

    if('status' in responseJSON) {
        log(responseJSON['status']);
    } else {
        const plural = responseJSON.length === 1 ? '' : 's';
        log(responseJSON.length + ' item' + plural + ' returned');

        responseJSON.forEach((item, index) => {
            const cols = Object.keys(item);

            if(index === 0) { // show column names
                const gridHeader = dataGrid.createTHead();
                const row0 = gridHeader.insertRow(-1);
                cols.forEach((col) => {
                    const cell0 = row0.insertCell(-1);
                    cell0.className = "gridHeader";
                    cell0.innerHTML = col;
                });
            }
            const row = dataGrid.insertRow(-1);
            cols.forEach((col) => {
                const cell = row.insertCell(-1);
                cell.innerText = item[col];
                cell.className = 'gridData';
            });
        });
    }

    return {};

}
async function runsql(){

    const sqlStmt = document.getElementById('sqlText').value;
    console.log(sqlStmt);

    document.getElementById('sqlGrid').innerHTML = null;


    const response = await postApi('/runsql', {sql:sqlStmt});

    const responseJSON = await response.json();

    let dataGrid = document.getElementById('sqlGrid');

    if('status' in responseJSON) {
        log(responseJSON['status']);
    } else {
        const plural = responseJSON.length === 1 ? '' : 's';
        log(responseJSON.length + ' item' + plural + ' returned');

        responseJSON.forEach((item, index) => {
            const cols = Object.keys(item);

            const row = dataGrid.insertRow(-1);
            cols.forEach((col) => {
                const cell = row.insertCell(-1);
                cell.innerText = item[col];
                cell.className = 'gridData';
            });

            if(index === 0 ) { // show column names
                const gridHeader = dataGrid.createTHead();
                const row0 = gridHeader.insertRow(0);
                cols.forEach((col) => {
                    const cell0 = row0.insertCell(-1);
                    cell0.className = "gridHeader";
                    cell0.innerHTML = col;
                });
            }

        });
    }

    return {};

}
function clearsql() {
    document.getElementById('sqlText').value = null;
    document.getElementById('sqlGrid').innerHTML = null;
}
function setTableTitle(title) {

    if(title) {
        document.getElementById('tableTitle').innerHTML = 'Table : ';
        document.getElementById('tableTitle2').innerHTML = 'Table : ';
        document.getElementById('tableTitleValue').innerHTML = title + '<br/>';
        document.getElementById('tableTitleValue2').innerHTML = title + '<br/>';

    } else {
        document.getElementById('tableTitle').innerHTML = '';
        document.getElementById('tableTitle2').innerHTML = '';
        document.getElementById('tableTitleValue').innerHTML = '';
        document.getElementById('tableTitleValue2').innerHTML = '';
    }

}