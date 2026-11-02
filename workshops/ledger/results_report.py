import sys
import csv
from termgraph import Data, BarChart, StackedChart, Args, Colors

filename = 'test_results.csv'

if len(sys.argv) > 1:
    filename = sys.argv[1]
    # my_settings['target_table'] = sys.argv[1]

def main():

    csvdata = load_csv_data(filename)

    latency_data = Data(
        data=csvdata['Latency'],
        labels=csvdata['Tests']
    )

    latency_args = Args(
        colors=[Colors.Blue, Colors.Green, Colors.Yellow],
        width=60,
        suffix=" ms",
        format="{:5.0f}"
    )

    print("\033[H\033[2J", end="") # clear screen
    print()
    print('Average Latency by Test')
    print()

    latency_chart = BarChart(latency_data, latency_args)
    latency_chart.draw()
    print()
    print()
    print('Costs per million runs')
    print()

    cost_data = Data(
        data=csvdata['Costs'],
        labels=csvdata['Tests'],
        categories=['Write Cost', 'Read Cost']
    )
    cost_args = Args(
        colors=[Colors.Blue, Colors.Green, Colors.Yellow],
        width=60,
        suffix=" $",
        format="{:5.0f}"
    )

    cost_chart = StackedChart(cost_data, cost_args)
    cost_chart.draw()
    print()
    print()

def load_csv_data(filename):
    """Load data from CSV file."""
    data = []
    labels = []

    with open(filename, 'r') as f:

        reader = csv.DictReader(f)
        # headers = reader.fieldnames
        # next(reader)  # Skip header
        tests = []
        avg_latencies = []
        read_costs = []
        write_costs = []
        costs = []

        for row in reader:
            # Access elements by header name instead of index
            tests.append(row['Test'])
            avg_latencies.append(int(row['Avg Latency']))
            write_costs.append(float(row['Write Cost']))
            read_costs.append(float(row['Read Cost']))
            costs.append([float(row['Write Cost']), float(row['Read Cost'])])
            
        return {
            'Tests': tests,
            'Latency': avg_latencies,
            'Costs': costs
        }


if __name__ == "__main__":
    
    main()
