# Jobs

[HOME](../README.md) - [Setup](../setup/README.md) -  **Jobs**  - [Charts](../app/README.md)

This benchmark is designed to answer questions using the scientific method. You can craft experiments that have multiple steps, so that the performance impact of a particular design choice or database feature can be measured. 

## Running Jobs

A set of experiment scripts  within the /jobs folder.  The experiment will make one or more calls to the runtime engine: ```/jobs/lib/jobExec.js```

Each job will record request latencies in a local file, and the experiment will then upload the final file to a new folder in an S3 bucket. A configuration file called summary.json will also be uploaded.

1.  Each job may contain write and read requests. Let's start with a simple job to write 100 items to the **mytable** table.
```
cd jobs
node exec Writes.js 100
```

2.  Continue by running another job to read the 100 new items.
```
node exec Reads.js 100
```

3. Navigate to the webapp at [http://localhost:3000](http://localhost:3000) and refresh the page. You should see two new folders on the left side of the page. These represent experiment folders. 

4. You may repeat the read or write experiments, each run will create a new folder in the web app. 

5. Now, run the full set of demo jobs:
 
```
chmod +x ./runall.sh
./runall.sh
```


Next, review the features and analytics available in the charting [App](../app/README.md)



