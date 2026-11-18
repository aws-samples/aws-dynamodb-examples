# Test runner. Pass in the name of another python test file

import boto3 
from botocore.config import Config 
from botocore.exceptions import ClientError 
import time
import json
import sys
import math
import os

test_file = None
result_summary_file = None
experiment = None
env_file = '.env'
bucket = None
experiment_data = []

if len(sys.argv) > 1:
    test_file = sys.argv[1]
    if len(sys.argv) > 2:
        result_summary_file = sys.argv[2]
    if len(sys.argv) > 3:
        experiment = sys.argv[3]
    # print(test_file, result_summary_file, experiment)

else:
    print('usage: ')
    print('       python3 runtest.py <test>')
    print('       python3 runtest.py <test> results.csv')
    print('       python3 runtest.py <test> results.csv E1794977535')

    exit(0)

# Dynamically import the test module

test = __import__(test_file)


my_settings = {
    'logging': 'verbose', # summary
    'ddb_region': 'us-east-1',
    'rcu_price': 0.00000013,
    'wcu_price': 0.00000063,
    'occ_retries': 3,
    'dryrun': False
}

my_config = Config(
    region_name=my_settings['ddb_region'],
    connect_timeout=5, read_timeout=5,
    retries={'total_max_attempts': 3, 'mode': 'standard'},
)

class bcolors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'


def runtest(dynamodb):

    latencylist = []
    record_count = 1
    wcu_this_second = 0
    wcu_total = 0
    write_requests = 0

    rcu_this_second = 0
    rcu_total = 0

    second = 1
    previous_second = 1
    item_start_second = 1
    item_end_second = 1

    item_durations = []

    sdk_retry_attempts_this_second = 0
    sdk_retry_attempts_total = 0

    occ_retry_attempts_this_second = 0
    occ_retry_attempts_total = 0

    test_summary = test.test_summary()
    test_desc = test_summary['test_desc']
    my_settings['target_table'] = test_summary['target_table']
    records_to_load = test_summary['records_to_load']

    print(f'\nLoading table : {bcolors.OKBLUE}{my_settings["target_table"]} {bcolors.ENDC}')
    print()

    request = {'init': 1}

    start_time = time.time()
    test_start_second = math.floor(start_time)

    time_to_wait = 1.0 - (start_time % 1) 
    time.sleep(time_to_wait) # start at beginning of second
    start_time = time.time()

    while bool(request):

        if item_end_second != item_start_second:
            if item_end_second > 1:
                print(f'{bcolors.OKBLUE}Second {second} totals, wcu: {wcu_this_second} {bcolors.ENDC}')
                # print('second', second, 'totals : wcu :', wcu_this_second)
                print()
                second += 1
                
            wcu_this_second = 0
            rcu_this_second = 0

        response = {}

        item_start_time = time.time()
        item_start_second = math.floor(item_start_time)
        
        # Begin operation
        
        occ_attempt = 1
        occ_success = False

        statusline = ''

        # the Optimistic Concurrency Control (conditional check item exists) retry loop
        while not occ_success and occ_attempt < int(my_settings['occ_retries']) and bool(request):
            # print('request bool: ' + str(bool(request)))

            request = test.generate_item(record_count, second, dynamodb)

            wcu = 0
            rcu = 0
            if bool(request):
                rcu = float(request['rcus'])
                wcu = int(request['wcus'])
            
                # wcu_total += wcu
                # wcu_this_second += wcu

                rcu_total += rcu
                rcu_this_second += rcu

                if my_settings['dryrun']:
                    print(str(record_count) + '  ' + str(request['request_body']['Item']))
                    # record_count += 1

                else:
                    try:
                        write_requests += 1
                        statusline = '    record: ' + str(record_count) \
                            + ', attempting: ' + concise_item(request['request_body']['Item'], 2)

                        # + ', write: ' + str(write_requests) \
                        # statusline += ' occ_success: ' + str(occ_success)
                        # + ', occ attempt: ' + str(occ_attempt) \
                        # print(statusline)

                        response = dynamodb.put_item(**request['request_body'])
                        # Success happened! 
                        
                        # record_count += 1
                        occ_success = True
                        wcu += response['ConsumedCapacity']['Table']['CapacityUnits']

                    except ClientError as ce:
                        
                        error_code = ce.response['Error']['Code']
                        if error_code == 'ConditionalCheckFailedException':
                            occ_success = False
                            occ_attempt += 1
                            
                            print()
                            print(f'{bcolors.FAIL}*** {error_code}, record: {str(record_count)} ({concise_item(request['request_body']['Item'],2)}) already exists {bcolors.ENDC}')
                            # print('***   ' + error_code + ',     record: ' + str(record_count) + ' (' + concise_item(request['request_body']['Item']) + ') already exists ' )
                            # record_count -= 1
                            wcu += 1

                        else:
                            print(error_code)

                    finally:
                        myfinal = 0
        # ######
        item_end_time = time.time()
        item_end_second = math.floor(item_end_time)

        item_duration = round(round(item_end_time - item_start_time, 3) * 1000)

        if(statusline):
            print(statusline + ', latency:' + f'{(item_duration):3.0f}')

        wcu_total += int(wcu)
        wcu_this_second += int(wcu)

        item_durations.append(item_duration)

        # latencylist.append({'second': str(item_start_second), 'latency': item_duration})

        rcu_info = ''
        if rcu > 0:
            rcu_info = ', rcu: ' + str(rcu)

        # outputstring = '   req:' +  f'{(record_count):4.0f}' + \
        #     ', wcu: ' + str(wcu).replace('.0','') + \
        #     rcu_info + ', latency:' + f'{(item_duration):3.0f}'
        
        # outputstring += '   ' + concise_item(request['request_body']['Item'])
        # outputstring += '  ' + str(request['request_body']['Item'])
        # outputstring += ', iss: ' + str(item_start_second % 100) + ', ies: ' + str(item_end_second % 100)

        # if my_settings['logging'] == 'verbose':
            # print(outputstring)
            # print(statusline)

        record_count += 1
        # ######

    item_durations.pop()
    record_count -= 1
    end_time = time.time()
    duration = end_time - start_time
    items_per_second = (record_count-1)/duration
    wcu_velocity = wcu_total/duration
    rcu_velocity = rcu_total/duration

    wcu_cost = my_settings['wcu_price'] * wcu_total
    rcu_cost = my_settings['rcu_price'] * rcu_total

    if experiment:
        save_experiment_data(experiment, item_durations, test_desc, my_settings['target_table'])

    print()
    print('---------------------------------------------------')
    print('Test Description    : ' + test_desc)
    print('Records attempted   : ' + str(record_count-1))

    if record_count -1 < write_requests:
        print('Write requests      : ' + str(write_requests))

    if not my_settings['dryrun']:  

        avg_latency = (round(sum(item_durations)/len(item_durations)))
        rcu_cost_m = rcu_cost*1000000 # _m per million
        wcu_cost_m = wcu_cost*1000000

        print('WCU total           : ' + str(wcu_total))
        if rcu_total > 0:
            print('RCU total           : ' + str(rcu_total))
        # print(start_time, end_time)
        print('Duration in seconds : ' + str(round(duration,1)))
        print()
        print('Items/second        : ' + str(round(items_per_second,1)))
        print('WCU velocity/second : ' + str(round(wcu_velocity,1))) 
        if rcu_total > 0:
            print('RCU velocity/second : ' + str(round(rcu_velocity,1)))   
        print()
        print('Avg. latency in ms  : ' + str((round(sum(item_durations)/len(item_durations)))))
        # if my_settings['logging'] in ['summary','verbose']:
        #     print('Retries             : ' + str(sdk_retry_attempts_total) )
        print()
        print('Cost if this test were repeated 1 million times:')
        print()
        print('WCU cost            $ ' + f'{(wcu_cost*1000000):8.2f}')
        if rcu_total > 0:
            print('RCU cost            $ ' + f'{(rcu_cost*1000000):8.2f}')
            total_cost = rcu_cost + wcu_cost
            print('Total               $ ' + f'{(total_cost*1000000):8.2f}')
        print()

        if result_summary_file:
            srstf = save_result_summary_to_file(result_summary_file, test_desc, avg_latency, rcu_cost_m, wcu_cost_m)
            if srstf == 'ok':
                print('Saved Test, Avg Latency, Read Cost, Write cost to file : ' + result_summary_file)

def save_result_summary_to_file(filename, test, avg_latency, read_cost, write_cost):
    result_string = '"' + test + '","' + str(avg_latency) + '","' + str(read_cost) + '","' + str(write_cost) + '"'
    
    if not os.path.isfile(filename):
        result_string = '"Test","Avg Latency","Read Cost","Write Cost"\n' + result_string

    with open(filename, "a", encoding="utf-8") as file:
        file.write(result_string + '\n')

    return 'ok'

def save_experiment_data(exp, item_durations, exp_desc, exp_job):

    with open(env_file, "r", encoding="utf-8") as file:
        for line in file:
            bucket = line.strip().replace('TESTER_BUCKET=','')
            break

    exp_path = 'exp/' + experiment

    os.makedirs('exp/'+str(experiment), exist_ok=True)

    summary_json = {
            "desc": exp_desc,
            "type": "Line",
            "xAxisLabel": "request",
            "xAxisUnits": "#",
            "xAttribute": "requestNum",
            "yAxisLabel": "latency",
            "yAxisUnits": "ms",
            "yAttribute": "latency",
            "operation": "write",
            "expName": exp_job,
            "charts": ["LA","HI"],
            "itemCount": len(item_durations)
    }

    if not os.path.isfile(exp_path + '/summary.json'): 
        with open(exp_path + '/summary.json', "a", encoding="utf-8") as file:
            file.write(json.dumps(summary_json, indent=4))

    data_csv = []

    header_line = "requestNum,experiment,test,jobFile,operation,targetTable,region,PK,jobTimestamp,jobSecond,jobTimestampMs,jobElapsed,latency,unitVelocity,httpStatusCode,attempts,ConsumedCapacity"
    for req in range(1, len(item_durations)+1):
        new_row = str(req) + "," + exp + "," + exp_desc + ",,,,us-east-1,PK,,,,," +str(item_durations[req-1]) + ",1,200,1,1" 
        data_csv.append(new_row)

    exp_path = 'exp/' + experiment


    if not os.path.isfile(exp_path + '/data.csv'): 
        with open(exp_path + '/data.csv', "a", encoding="utf-8") as file:
            file.write(header_line + '\n')

    with open(exp_path + '/data.csv', "a", encoding="utf-8") as file:
        for line in data_csv:
            file.write(line + '\n')

    print()
    upload_file_to_bucket(exp_path + '/summary.json', bucket, exp_path + '/summary.json')
    upload_file_to_bucket(exp_path + '/data.csv', bucket, exp_path + '/data.csv')

    return 'ok'

def concise_item(item, type=1):
    conciser = ''

    if type == 1:
        conciser = item['AccountID']['S'] + ':' + item['Event']['S'] + ' : ' + item['City']['S'] + ':' + item['Merchant']['S'] + ':' + item['Charged']['S']
    else:
        conciser = item['AccountID']['S'] + ':' + item['Event']['S'] 

    return conciser

def upload_file_to_bucket(file_name, bucket, object_name=None):

    if object_name is None:
        object_name = os.path.basename(file_name)

    s3_client = boto3.client('s3')
    try:
        response = s3_client.upload_file(file_name, bucket, object_name)
    except ClientError as e:
        print(e)
        return False
    
    print('uploaded s3://' + bucket + '/' + object_name)
    return True

def main(dynamodb=None):

    if not dynamodb:
        dynamodb = boto3.client('dynamodb', config=my_config)


    runtest(dynamodb)


if __name__ == "__main__":
    
    main()
