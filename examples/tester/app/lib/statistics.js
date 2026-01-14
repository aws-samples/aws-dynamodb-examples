
import regression from 'regression';
import css from '@/app/page.module.css';
import { getBrushColor } from "@/app/lib/brushcolor.js";

import {getCwStats} from './aws.js';
import MyChart from '@/app/exp/[experiment]/chart.js';


function histogram(arr, buckets, range) {
    if(!arr || !buckets) {
        return null;
    }
    // console.log('histogram');
    // console.log(buckets, range);

    let bucketSize = range / buckets;
    let bucketList = Array.from(Array(buckets), (e,i)=>  { 
        return i * (range / buckets);
    } );

    const histTracker = {};

    for (const key of bucketList) {
        histTracker[key] = 0;
    }

    for (const item of arr) {
        for (const bucket of bucketList) {

            if(item >= bucket && item < (bucket + bucketSize)) {
                histTracker[bucket] += 1;
                break;
            }
        }
    }

    let hCounts = Object.values(histTracker);

    let lastFilledBucket = buckets;

    for (let i = 1; i < hCounts.length; i++) {

        if(hCounts[buckets - i] === 0 ) {
            lastFilledBucket = buckets - i;
        } else {
            break;
        }
    }

    let myHist = {
        buckets: bucketList.slice(0, lastFilledBucket + 1),
        counts: hCounts.slice(0, lastFilledBucket + 1)
    };

    return myHist;
};

const calculateLinearRegression = (xy) => {
    
    const result = regression.linear(xy, {
        order: 2, 
        precision: 3
    });

    const slope = result.equation[0];
    const yIntercept = result.equation[1];

    return {
        slope: slope,
        yIntercept: yIntercept
    }
};

function calculateTailLatency(data, percentile) {
    if (!data || data.length === 0) {
      return null; // Return null for empty or invalid input
    }
    if(data.length < percentile) {
        return null;
    }

    const pNumber = percentile/100;

    const sortedData = [...data].sort((a, b) => a - b); 
    const index = Math.ceil(sortedData.length * pNumber) - 1; 
    
    return sortedData[index];

};

const clientVsCwLatencySummary = async (stats, summary) => {
    if(!stats || stats.length === 0) {
        return (<div></div>);
    }

    // console.log('clientVsCwLatency');
    // console.log(JSON.stringify(stats,null, 2));

    const fullStats = [];
    let maxLatencyForXaxis = 0;

    for (const statline of stats) {

        let operation;
        if(statline['action'] === 'get') {
            operation = 'GetItem';
        } else {
            if(statline['action'] === 'put') {
                operation = 'PutItem';
            } else {
                operation = statline['action'];
            }
        } 

        let st = parseInt(statline['setStartTime']);
        let et = parseInt(statline['setEndTime']);
    
        st = roundDateToMinute(st, 'down');
        et = roundDateToMinute(et, 'up');

        const params = {
            TableName: statline['table'],
            operation: operation,
            StartTime: st,
            EndTime:   et,
            region:    statline['region']
        };

        const result = await getCwStats(params);
        const cwAvgLatency = result['MetricDataResults'].filter((mdr)=> mdr['Id'] === 'avg')[0]['Values'][0];
        const cwMinLatency = result['MetricDataResults'].filter((mdr)=> mdr['Id'] === 'min')[0]['Values'][0];
        const cwMaxLatency = result['MetricDataResults'].filter((mdr)=> mdr['Id'] === 'max')[0]['Values'][0];

        const roundNum = (num, places) => {
            let multiplier = Math.pow(10, places);
            return Math.round(num * multiplier) / multiplier;
        }

        let combinedStatline = {
            test: statline['test'],
            action: statline['action'],
            items: statline['items'],
            account: statline['account'],
            table: statline['table'],
            region: statline['region'],
            setStartTime:  statline['setStartTime'],
            setEndTime:    statline['setEndTime'],

            avg: {
                client: statline['avg'], 
                server: roundNum(cwAvgLatency, 1),
                network: roundNum(statline['avg'] - cwAvgLatency, 1)
            },  
            min: {
                client: statline['min'], 
                server: roundNum(cwMinLatency, 1),
                network: roundNum(statline['min'] - cwMinLatency, 1)
            },  
            max: {
                client: statline['max'], 
                server: roundNum(cwMaxLatency, 1),
                network: roundNum(statline['max'] - cwMaxLatency, 1)
            }

        };
        if (statline['max'] > maxLatencyForXaxis) {
            maxLatencyForXaxis = statline['max'];
        }

        fullStats.push(combinedStatline); 

    }

    const statsTable = ( 
        <table className={css.statsTable}><thead>
                <tr>
                    <th rowSpan={2}>Test</th>
                    <th colSpan={4}> <div className={css.latencyHeader}>Client Latency in milliseconds:</div></th>
                </tr>
                <tr><th>avg</th><th>min</th><th>p99</th><th>max</th></tr>
            </thead>
            <tbody>
                {stats.map((statline, ix) => {
                    let color = getBrushColor(ix);
                    return (<tr key={ix}>
                        <td >
                            <span style={{color:color}}>{statline['test']}</span>
                            <br/>{statline['items']} {statline['action']} requests</td>

                        <td style={{color:color, fontWeight:'bold', fontSize:'larger'}}>{statline['avg']}</td>   
                        <td>{statline['min']}</td>  
                        <td>{statline['p99']}</td>  
                        <td>{statline['max']}</td>  

                        </tr>);
                })}
            </tbody>
        </table>
    );


    const aggTypes = ['avg', 'min', 'max'];

    const cwStatsTable = (
        <table className={css.statsTableCharts}><thead>
                <tr>
                    <th ><div className={css.latencyHeader}>Latency<br/>Aggregation</div></th>
                    <th > <div className={css.latencyHeader2}>Client vs Server-measured latency</div></th>
                </tr>
            </thead>
            <tbody>
                {aggTypes.map((aggType, ix) => {
                    
                    // let labels = ['service', 'network', 'client latency'];
                    let labels = [];
                    let dataSets = [];
                    let dataService = [];
                    let dataNetwork = [];
                    let dataClient = [];

                    fullStats.map((set, ix2) => {
                        labels.push(set['test']);

                        dataService.push(set[aggType]['server']);
                        dataNetwork.push(set[aggType]['network']);
                        dataClient.push(set[aggType]['client']);

                    });

                    let color = getBrushColor(7);
                    let color2 = getBrushColor(8);

                    dataSets.push({     
                        "label": 'service',
                        "datalabels": {
                            "labels": {
                                "title": {
                                    "color": 'yellow'
                                }
                            }
                        },
                        "data": dataService,
                        "borderColor": color,
                        "backgroundColor": color
                    });

                    dataSets.push({     
                        "label": 'network',
                        "data": dataNetwork,
                        "borderColor": color2,
                        "backgroundColor": color2
                    });


                    let bundleCW = {
                        labels: labels,
                        datasets: dataSets,
                        summary: 'Client vs Server Latency'
                    };  
                    

                    return(<tr key={ix}><td>
                            {aggType}

                            {/* </td><td> */}
                            {/* {JSON.stringify(fullStats)} */}

                            </td><td>
                                <div className={css.chartDiv}>
                                <MyChart data={bundleCW} chartType='CS' maxLatencyForXaxis={maxLatencyForXaxis + 2} />
                                </div>
                        </td></tr>)
                    })
                }
            
            </tbody>
        </table>
    );

    return (
        <div className={css.clientVsCwDiv}>
            {statsTable}
            <br/>
            {cwStatsTable}
            <pre>
                {/* {fullStats[0]['max']['client']}
                {JSON.stringify(fullStats, null, 2)} */}
            </pre>
        </div>);

};

const makeStats = (stats, options) => {
    if(!stats || stats.length === 0) {
        return (<div></div>);
    }
    const cols = Object.keys(stats[0]);

    const statsTable = (
        
        <table className={css.statsTable}><thead>
            <tr>
                <th rowSpan={2}>Test</th>
                <th colSpan={4}> <div className={css.latencyHeader}>Latency in milliseconds:</div></th>
            </tr>
            <tr><th>avg</th><th>min</th><th>p99</th><th>max</th></tr>
        </thead>
        <tbody>
            {stats.map((statline, ix) => {
                let color = getBrushColor(ix);
                return (<tr key={ix}>

                    <td >
                        <span style={{color:color}}>{statline['test']}</span>
                        <br/>{statline['items']} {statline['action']} requests</td>

                    <td style={{color:color, fontWeight:'bold', fontSize:'larger'}}>{statline['avg']}</td>   
                    <td>{statline['min']}</td>  
                    <td>{statline['p99']}</td>  
                    <td>{statline['max']}</td>  

                    </tr>);
            })}
        </tbody>
        </table>

    );

    return  statsTable;

};

const makeLinearStats = (stats, options) => {

    const cols = Object.keys(stats[0]);
    return(<table className={css.statsTable}><thead>
        <tr>
            <th>Test</th>
            <th>Action</th>
            <th>Items</th>
            <th>Slope</th>
            <th>yIntercept</th>
            <th>Expected Latency in ms</th>
     
        </tr>
        </thead><tbody>
            {stats.map((statline, ix) => {
                let color = getBrushColor(ix);

                return (<tr key={ix}>
                    {cols.map((col, ix2) => {
                        return (<td key={ix2} 
                            style={ix2 >= cols.length - 2 ? {color:color, fontWeight:'bold', fontSize:'larger'} : {}}
                        >
                            {statline[col]} 
                            </td>);
                    })}
                    <td key={'123'} style={{fontWeight:'bold'}} > ({statline['slope']} * itemSize) + {statline['yIntercept']}</td>

                    </tr>);

            })}

        </tbody>
    </table>);

};


function roundDateToMinute(date, direction) {
    const milliseconds = 60 * 1000;
    const secondsInUnit = 60;

    if (direction === 'down') {

        return Math.floor(new Date(date).getTime() / secondsInUnit) * secondsInUnit;

    } else if (direction === 'up') {

        return Math.ceil(new Date(date).getTime() / secondsInUnit) * secondsInUnit;

    } else { return 'need direction'}
  }

export {histogram, calculateLinearRegression, calculateTailLatency, makeStats, makeLinearStats, clientVsCwLatencySummary};

