
async function insertRowForm(table, itemKey, existingItem) {
    clear('grid1');
    clear('grid_queryresult');
    clear('tblForm');
    log(null);

    const tableMetadata = JSON.parse(document.getElementById('tableMetadata').value);

    const Ks = tableMetadata['Table']['KeySchema'];
    const keyList = Ks.map((key) => key['AttributeName']);

    let ADs = [];
    let AdTypes = {};
    ADs.map((ad) => {
        AdTypes[ad['AttributeName']] = ad['AttributeType'];
    });

    if(document.getElementById('stage').value === 'dynamodb') {
        if(existingItem) {
            const existingItemOrdered = orderResponseItem(existingItem, tableMetadata);

            ADs = [];
            Object.keys(existingItemOrdered).forEach((key) => {

                let attrType = 'S';
                if(typeof existingItemOrdered[key] === 'number') {
                    attrType = 'N';
                }
                ADs.push({"AttributeName": key, "AttributeType": attrType});
            });
        } else {
            ADs = Ks;
        }

    } else { // relational
        ADs = tableMetadata['Table']['AttributeDefinitions'];
    }

    // const Ks = tableMetadata['Table']['KeySchema'];
    // const keyList = Ks.map((key) => key['AttributeName']);
    // let AdTypes = {};
    // ADs.map((ad) => {
    //     AdTypes[ad['AttributeName']] = ad['AttributeType'];
    // });

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
        let attrType = 'S';

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
                attrType = item[col]; // S or N
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
            input.ddbtype = attrType;

            if(existingItem && colName in existingItem) {
                input.value = existingItem[colName];
            } else {
                if(colPrimary)  {
                    let uniqueNumber = Date.now().toString().slice(4,10);
                    input.value = colName + '-' + uniqueNumber;
                } else {
                    if(colType === 'int') {input.value = 123; }
                    if(colType === 'datetime') {input.value = '2024-12-13'; }
                    if(colType === 'string') {input.value = 'abc'; }
                }
            }

            cell3.appendChild(input);
        }

    });

    const rowAddAttr = myTable.insertRow(-1);
    const cellA1 = document.createElement("td");
    cellA1.colSpan = 3;
    cellA1.className = 'formAddAttributeCell';
    const buttonAddAttr = document.createElement("button");
    buttonAddAttr.appendChild(document.createTextNode("add attribute"));
    buttonAddAttr.onclick = () => addAttr(myTable);
    cellA1.appendChild(buttonAddAttr);
    rowAddAttr.appendChild(cellA1);


    const rowFinal = myTable.insertRow(-1);
    const cellF1 = document.createElement("td");
    cellF1.colSpan = 3;
    cellF1.className = "formSubmitCell";
    const button = document.createElement("button");
    button.className = "formSubmitButton";

    if(existingItem) {  //update
        button.onclick = () => update(table, itemKey,'formItem');
        button.appendChild(document.createTextNode("UPDATE"));
    } else {
        button.onclick = () => insert(table, 'formItem');
        button.appendChild(document.createTextNode("INSERT"));
    }

    // button.appendChild(document.createTextNode("SAVE"));
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
        if(field['ddbtype'] === 'N') {

            if(Number.isInteger(field.value)) {
                formValuesJSON[field.name] = parseInt(field.value);
            } else {
                formValuesJSON[field.name] = parseFloat(field.value);
            }
        } else {
            formValuesJSON[field.name] = field.value;
        }

    });

    const updateRequest = recordKey;
    const keyNames = Object.keys(recordKey['Key'])

    keyNames.forEach((keyName) => {
        delete formValuesJSON[keyName];
    });

    updateRequest['updateAttributes'] = formValuesJSON

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
    } else {
        log(responseJSON['status'] );
    }

}

async function runQuery(table, queryRequest){

    document.getElementById('sqlGrid').innerHTML = null;
    const tableMetadata = document.getElementById('tableMetadata').value;

    const response = await postApi('/query/' + table, queryRequest);

    const responseJSON = await response.json();

    let dataGrid = document.getElementById('sqlGrid');

    if('status' in responseJSON) {
        log(responseJSON['status']);
    } else {


        fillGrid(responseJSON, 'grid_queryresult', table, tableMetadata);

        // const plural = responseJSON.length === 1 ? '' : 's';
        // log(responseJSON.length + ' item' + plural + ' returned');
        //
        // responseJSON.forEach((item, index) => {
        //     const cols = Object.keys(item);
        //
        //     const row = dataGrid.insertRow(-1);
        //     cols.forEach((col) => {
        //         const cell = row.insertCell(-1);
        //         cell.innerText = item[col];
        //         cell.className = 'gridData';
        //     });
        //
        //     if(index === 0) { // show column names
        //         const gridHeader = dataGrid.createTHead();
        //         const row0 = gridHeader.insertRow(-1);
        //         cols.forEach((col) => {
        //             const cell0 = row0.insertCell(-1);
        //             cell0.className = "gridHeader";
        //             cell0.innerHTML = col;
        //         });
        //     }
        // });
    }

    return {};

}
async function runsql(){
    clear('grid_queryresult');

    const sqlStmt = document.getElementById('sqlText').value;
    console.log(sqlStmt);

    document.getElementById('sqlGrid').innerHTML = null;

    if(sqlStmt.length === 0) {
        log('');
        return null;
    }

    const response = await postApi('/runsql', {sql:sqlStmt});

    const responseJSON = await response.json();

    let dataGrid = document.getElementById('sqlGrid');

    if('status' in responseJSON) {
        log(responseJSON['status']);
    } else {
        const plural = responseJSON.length === 1 ? '' : 's';
        log(responseJSON.length + ' item' + plural + ' returned');
        if(responseJSON.length > 0) {

            responseJSON.forEach((item, index) => {
                const cols = Object.keys(item);

                const row = dataGrid.insertRow(-1);
                cols.forEach((col) => {
                    const cell = row.insertCell(-1);
                    cell.innerText = item[col];
                    cell.className = 'gridData';
                });

                if (index === 0) { // show column names
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
    }

    return {};

}

function addAttr(myTable) {


    const tableMetadata = JSON.parse(document.getElementById('tableMetadata').value);
    const Ks = tableMetadata['Table']['KeySchema'];
    const newAttrPosition = Ks.length;

    let attrName = prompt("New attribute name", "");

    const row = myTable.insertRow(newAttrPosition);
    const cell1 = document.createElement("td");
    const cell2 = document.createElement("td");
    const cell3 = document.createElement("td");

    cell1.className = 'gridData';
    cell2.className = 'gridData';
    cell3.className = 'gridData';

    cell1.innerHTML = attrName;
    cell2.innerHTML = 'S';
    const input = document.createElement('input');
    input['name'] = attrName;
    input.type = "text";
    input.name = attrName;

    cell3.appendChild(input);
    row.appendChild(cell1);
    row.appendChild(cell2);
    row.appendChild(cell3);

}
function clearsql() {
    document.getElementById('sqlText').value = null;
    document.getElementById('sqlGrid').innerHTML = null;
}

function createview() {
    let viewName = prompt("Please enter a name for the view :", "vTest");
    document.getElementById('sqlText').value = 'CREATE OR REPLACE VIEW ' + viewName + ' AS\n\n' + document.getElementById('sqlText').value;
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