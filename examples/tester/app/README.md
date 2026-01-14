# Charts App

[HOME](../README.md) - [Setup](../setup/README.md) -  [Jobs](../jobs/README.md) -  **App**

## Charts
The tester/app folder contains chart rendering functions, using Next.js, chart.js and react-chartjs-2 packages.

## Statistics
Functions are provided to calculate average & p99 (tail) latencies, draw a linear regression best fit line, and draw a latency histogram. 

### Latency distribution of many identical requests

The default experiment measures the results of sending many small 1KB reads or writes to a DynamoDB table. The results are plotted on a chart showing each single operation's latency.

A second chart appears below the first, showing the latency distribution, in a histogram format.  You can use this to understand the average and range of latencies that DynamoDB provided.

### Latency as a function of Item Size

A third type of chart is available when you run the Everysize experiment.

For this, a set of 400 write requests is made to DynamoDB, with the first request being 1KB in size, the second request 2KB, all the way up to the final request at 400KB. Jobs may read each of these same items as well. By performing a test against item size, we can chart the trend of latency as a function of item size. The chart will also attempt to best-fit a straight line representing the linear regression of latency versus item size. 

## Summary
You have deployed a benchmark testing tool, run some performance tests, and analyzed the results with a chart dashboard. 

You are encouraged to build and run new experiments using the examples provided, to find the answers to your own DynamoDB performance questions!

Please share feedback by creating a GitHub Issue, or contribute to the project with a Pull Request. 


