
import css from '@/app/page.module.css';
import config from '@/config.json';
import { getDatafile } from "@/app/lib/aws.js";
import { getBrushColor } from "@/app/lib/brushcolor.js";
import { histogram, calculateLinearRegression, calculateTailLatency, makeStats, makeLinearStats, clientVsCwLatencySummary } from "@/app/lib/statistics.js";

import CsvGrid from '@/app/lib/csvgrid.js';

import MyChart from '@/app/exp/[experiment]/chart.js';

import {csv} from 'csvtojson';


const histogramConfig = {
  "buckets": 40,
  "range": 80
};

export default async function Page({params}) {

  let xAxisMax = 0;
  let hData;
  let histo = [];
  let overlays = [];

  const experiment = (await params).experiment;
  const eStartTime = (new Date(parseInt(experiment.slice(1)) * 1000)).toISOString();
  const data = await getDatafile(config['bucketName'], experiment, 'data.csv');
  const summaryText = await getDatafile(config['bucketName'], experiment, 'summary.json');

  if(!data) {
    return (<div>Unable to load data for experiment: {experiment}</div>);
  };
  
  const summary = JSON.parse(summaryText);
  const yAttribute = summary['yAttribute'];
  const charts = summary['charts'];
  
  // console.log('in page.js Page(params) ');
  // console.log('data  ' + typeof data);
  // console.log('summ  ' + summary);
  // console.log('config: bucket ' + config['bucketName']);

  const dataObj = await csv().fromString(data);
  let compareValues = Array.from(new Set(dataObj.map((line) => line['test'])));

  let labels = [];
  let sum = 0;
  let avg = 0;
  let max = 0;
  let min = 0;
  let setStartTime;
  let setEndTime;
  let count = 0;
  let stats = [];
  let LRs = [];
  let showGrid = false;

  let chartTypes = {
    LA: {type: 'Line'},
    HI: {type: 'Bar'},
    LS: {type: 'Scatter'},
    CW: {type: 'Bar'} 
  };

  
  let dataSets = compareValues.map((val, index) => {

    let myDataSet = dataObj.filter((row) => {
      return row['test'] === val; 
    });

    if(myDataSet.length > xAxisMax) {
      xAxisMax = myDataSet.length;
    }

    sum = 0;
    max = 0;
    min = 10000;


    myDataSet.map((item, idx) => 
      {
        if(idx === 0) {
          setStartTime = item['jobTimestamp'];
        }
        if(idx === myDataSet.length - 1) {
          setEndTime = item['jobTimestamp'];
        }
        sum += parseInt(item[yAttribute]);
        count = idx + 1;

        if (parseInt(item[yAttribute]) > max) {
          max = parseInt(item[yAttribute]);
        }

        if (parseInt(item[yAttribute]) < min) {
          min = parseInt(item[yAttribute]);
        }

      }
    );

    const p99 = calculateTailLatency(myDataSet.map((row) => parseInt(row[yAttribute])), 99);


    if(myDataSet.length > 0) {
      hData = histogram(myDataSet.map((row) => parseInt(row[yAttribute])), histogramConfig['buckets'], histogramConfig['range']);
    }
    if(hData && hData.counts) {
      
        histo.push({
            label: val,
            data: hData.counts,
            borderColor: getBrushColor(index, null), 
            backgroundColor: getBrushColor(index, null)
        });
    }

    avg = parseInt(sum/count);

    labels = Array.from({length: xAxisMax}, (_, i) => i + 1);

    if(charts[0] === 'LS') {

      let xy = myDataSet.map((item, idx) => {
          return [
              parseInt(item[summary['xAttribute']]), 
              parseInt(item[summary['yAttribute']])
            ];
      });

      const myLR = calculateLinearRegression(xy);
      const slope = myLR['slope'];
      const yIntercept = myLR['yIntercept'];

      LRs.push({
        test: val,
        action: myDataSet[0]['operation'],
        items: count,
        slope: slope.toFixed(3),
        yIntercept: yIntercept.toFixed(1)
      });
      
      const slopeData = labels.map((xval) => {
        return (xval * slope) + yIntercept;
      });

      overlays.push({
        label: 'best fit',
        data: slopeData,
        borderColor: 'white', 
        backgroundColor: getBrushColor(index, null),
        borderWidth: 1, 
        radius: 2
      });
    
    }

    stats.push({
      test: val,
      action: myDataSet[0]['operation'],
      items: count,
      account: '1234',
      table: myDataSet[0]['targetTable'],
      region: myDataSet[0]['region'],
      setStartTime:  setStartTime,
      setEndTime: setEndTime,
      avg: avg,
      p99:p99,
      max: max,
      min: min
    }); 


    return {
      label: val,
      data: myDataSet.map((row) => row[yAttribute]),

      borderColor: getBrushColor(index, val),
      backgroundColor: getBrushColor(index, val)
    };

  });

  let bundleHI = {
    labels: hData.buckets,
    datasets: histo,
    summary:summary
  };

  let bundleLA = {
    labels: labels,
    datasets: dataSets,
    summary: summary
  };  

  let bundleLS = {
    labels: labels,
    datasets: [...overlays, ...dataSets],
    summary: summary
  };     
  

  // console.log(JSON.stringify(dataSets[0], null, 2));
  // const myGrid = makeGrid(data);

  let myStats;
  let myClientVsCwLatencySummary;

  if (charts[0] !== 'LS') {
    myStats = makeStats(stats);
    myClientVsCwLatencySummary = clientVsCwLatencySummary(stats, summary);
  }  

  let myLRstats;
  if(charts[0] === 'LS') {
    myLRstats = makeLinearStats(LRs);
  }

  let experimentCommand = summary['expName'];
  if(summary['expArgs'] !== undefined) {
    experimentCommand += ' ' + summary['expArgs'].toString().replace(',', ' ');

  }

  return (
    <div className={css.chartPanel}>

      <div className={css.expName}>
        Job: &nbsp;&nbsp;<span className={css.experimentCommand}>
          {experimentCommand}
          </span>
        &nbsp;&nbsp;&nbsp;&nbsp;
        {/* Region: <span className={css.experimentCommand}>
                    {dataObj[0]['region']}
                  </span>
        &nbsp;&nbsp;&nbsp;&nbsp; */}
        Job start (GMT): &nbsp;&nbsp;<span className={css.experimentCommand}>
                  {eStartTime.slice(0, 19).replace('T', ' ')}
                </span>
      </div>

      {charts.map((chart, ix) => {

        if(chart === 'LA') {
          return (<div key={ix}><br/><MyChart data={bundleLA} chartType={chart} /></div>);
        }
        
        if(chart === 'HI') {
          return (<div key={ix}><br/><MyChart data={bundleHI} chartType={chart} /></div>);
        }

        if(chart === 'LS') {
          return (<div key={ix}><br/><MyChart data={bundleLS} chartType={chart} /></div>);
        }

      })}

      <br/>

      <div>

        {myClientVsCwLatencySummary}
        {myLRstats}
      </div>

      <br/><br/>

      <CsvGrid data={data} />

      {/* <br/>S3 summary.json file:<br/> */}
      <pre>
        {summaryText}
      </pre>
      
    </div>
  );
    
}
