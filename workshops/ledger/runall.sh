
exp_timestamp=$(date +%s)
results_summary=res.csv

rm $results_summary

python3 setup/truncate.py journal
python3 runtest.py gen_uuid $results_summary E$exp_timestamp

python3 setup/truncate.py journal
python3 runtest.py update_counter_item $results_summary E$exp_timestamp

python3 setup/truncate.py journal
python3 runtest.py query_last_plus1 $results_summary E$exp_timestamp
