async function callApi(action) {
    log(null);
    let apiBase = '';
    if(document.cookie) {
        apiBase = document.cookie.split('=')[1];
    }
    const fullApiPath = apiBase + action;

    const fetchRequest = {
        method: "GET",
        cache: "no-cache",
        headers: {
            "Content-Type": "application/json",
            // "Access-Control-Allow-Headers": "Cache-Control",
            // "Cache-Control": "no-cache"
        }
    };

    const response = await fetch(fullApiPath, fetchRequest);
    let data;
    if(response.ok) {
        data = await response.json();
        // fillGrid(data);
    }
    return data;
}
async function postApi(action, body) {
    log(null);
    let apiBase = '';
    if(document.cookie) {
        apiBase = document.cookie.split('=')[1];
    }
    const fullApiPath = apiBase + action;
    const fetchRequest = {
        method: "POST",
        body: JSON.stringify(body),
        cache: "no-cache",
        mode: "cors",
        headers: {
            "Content-Type": "application/json"
        },
    };

    const response = await fetch(fullApiPath, fetchRequest);
    return response;
}

function fillGrid(data, grid, table, tableMetadata) {
    if(!grid) return;

    clear(grid);

    log(null);
    let myGrid = document.getElementById(grid) || grid;
    // myGrid.className = grid;
    if(data.length === 0) { log('0 records'); }

    data.forEach((item, index) => {
        const cols = Object.keys(item);

        let ks = JSON.parse(tableMetadata)['Table']['KeySchema'];

        let itemKey = {};
        let pkName = ks[0]['AttributeName'];
        let skName = ks.length > 1 ? ks[1]['AttributeName'] : null;

        itemKey[pkName] =  item[pkName];
        if(skName) {
            itemKey[skName] =  item[skName];
        }

        if(index === 1) { // show column names

            const gridHeader = myGrid.createTHead();
            const row0 = gridHeader.insertRow(0);
            cols.forEach((col) => {
                const cell0 = row0.insertCell(-1);
                if(col === pkName) {
                    cell0.className = "PKheader";
                } else if (col === skName) {
                    cell0.className = "SKheader";
                } else {
                    cell0.className = "gridHeader";
                }
                cell0.innerHTML = col;
            });

            const cellDH = row0.insertCell(-1);
            cellDH.className = "gridData";
            cellDH.innerHTML = '';
        }
        const row = myGrid.insertRow(-1);
        cols.forEach((col) => {
            const cell1 = row.insertCell(-1);
            if(col === pkName) {
                cell1.className = "PK";
            } else if(col === skName) {
                cell1.className = "SK";
            } else {
                cell1.className = "gridData";
            }

            cell1.innerHTML = item[col] ;
        });

        const cellD = row.insertCell(-1);
        cellD.className = "gridData";

        const button = document.createElement("button");
        button.className = "formSubmitButton";

        button.onclick = () => deleteItem(table, itemKey);

        let buttonLabel = "delete";
        button.appendChild(document.createTextNode(buttonLabel));
        cellD.appendChild(button);

        const button2 = document.createElement("button");
        button2.className = "formSubmitButton";

        button2.onclick = () => insertRowForm(table, itemKey, item);

        button2.appendChild(document.createTextNode("update"));
        cellD.appendChild(button2);
    });
}

function tableSchemaGrid(metadata, grid) {

    const ADs = metadata['Table']['AttributeDefinitions'];
    const Ks = metadata['Table']['KeySchema'];
    const keyList = Ks.map((key) => key['AttributeName']);
    let AdTypes = {};
    ADs.map((ad) => {
        AdTypes[ad['AttributeName']] = ad['AttributeType'];
    });

    clear(grid);
    let myGrid = document.getElementById(grid);
    // console.log('in tsg');
    // console.log(JSON.stringify(metadata));
    myGrid.className = grid;

    const row = myGrid.insertRow(-1);

    const cell1 = row.insertCell(-1);
    if(Ks.length>1) {
        cell1.rowSpan = 2;
    }
    cell1.className = "gridDataLabel";

    cell1.innerHTML = Ks.length>1 ? 'Composite key': 'Primary key';

    const cell2 = row.insertCell(-1);
    cell2.className = "PK";
    cell2.innerHTML = Ks[0]['AttributeName'];

    const cell3 = row.insertCell(-1);
    cell3.className = "PK";
    cell3.innerHTML = AdTypes[Ks[0]['AttributeName']];

    if(Ks.length > 1) {
        const row = myGrid.insertRow(-1);
        const cell = row.insertCell(-1);
        cell.className = "SK";
        cell.innerHTML = Ks[1]['AttributeName'];

        const cell3 = row.insertCell(-1);
        cell3.className = "SK";
        cell3.innerHTML = AdTypes[Ks[1]['AttributeName']];
    }

    const row2 = myGrid.insertRow(-1);
    const cell21 = row2.insertCell(-1);
    cell21.rowSpan = ADs.length;
    cell21.className = "gridDataLabel";
    cell21.innerHTML = 'Columns';

    ADs.forEach((attr, idx) => {
        if(!keyList.includes(attr['AttributeName'])) {
            const row = myGrid.insertRow(-1);
            const cell = row.insertCell(-1);
            cell.className = "gridData";
            cell.innerHTML = attr['AttributeName'];

            const cell3 = row.insertCell(-1);
            cell3.className = "gridData";
            cell3.innerHTML = AdTypes[attr['AttributeName']];
        }
    });
}
function formatMetadata (mdata, table) {
    const databaseEngine = Array.isArray(mdata) ? 'SQL' : 'DDB';

    let indexes = [];
    let foreignKeys = [];

    if(databaseEngine === 'DDB') {
        return mdata;
    } else {
        // console.log(JSON.stringify(mdata, null, 2));
        let tableMdata = mdata.filter((attr) => {
            return attr['INFO_TYPE'] === 'TABLE';
        });

        let attributeDefinitions = tableMdata.map((attr) => {
            return {
                AttributeName: attr['COLUMN_NAME'],
                AttributeType: attr['COLUMN_TYPE']
            }
        });

        let keySchema = mdata.filter((attr) => {
            return attr['INFO_TYPE'] === 'INDEX' && attr['INDEX_NAME'] === 'PRIMARY';
        }).map((key) => {

            return {
                "AttributeName": key['COLUMN_NAME'],
                "KeyType": key['SEQ_IN_INDEX'] === 1 ? "HASH": "RANGE"
            };
        });

        mdata.filter((attr) => {
            return attr['INFO_TYPE'] === 'INDEX' && attr['INDEX_NAME'] !== 'PRIMARY';
        }).map((idx, inum) => {

            if(indexes.filter((i) => i['IndexName'] === idx['INDEX_NAME']).length === 0 ) { // first time seeing this index row
                indexes.push({
                    IndexName: idx['INDEX_NAME'],
                    KeySchema: [{
                        "AttributeName": idx['COLUMN_NAME'],
                        "KeyType": idx['SEQ_IN_INDEX'] === 1 ?  "HASH" : "RANGE"
                    }]
                });

            } else {
                let idxPosition = indexes.findIndex((i) => i['IndexName'] === idx['INDEX_NAME']);
                let myKS = indexes[idxPosition]['KeySchema'];

                myKS.push({
                    "AttributeName": idx['COLUMN_NAME'],
                    "KeyType": idx['SEQ_IN_INDEX'] === 1 ?  "HASH" : "RANGE"
                })
                indexes[idxPosition]['KeySchema'] = myKS;
            }
        });

        mdata.filter((attr) => {
            return attr['INFO_TYPE'] === 'FOREIGN_KEY';
        }).map((fk) => {
            foreignKeys.push({
                ConstraintName: fk['INDEX_NAME'],
                ColumnName: fk['COLUMN_NAME'],
                ReferencedTable: fk['REFERENCED_TABLE_NAME'],
                ReferencedColumn: fk['REFERENCED_COLUMN_NAME'],
            });
        });

        let metadata = {
            Table: {
                AttributeDefinitions: attributeDefinitions,
                TableName: table,
                KeySchema: keySchema,
                GlobalSecondaryIndexes: indexes
            }
        };
        if(foreignKeys.length > 0) {
            metadata['Table']['ForeignKeys'] = foreignKeys;
        }

        return metadata;
    }
}

function clear(element) {
    if(document.getElementById('generateResults')) {
        document.getElementById('generateResults').style.display = 'none';
    }

    let myElement = document.getElementById(element);
    if(myElement) {
        myElement.innerHTML = '';
    }
}