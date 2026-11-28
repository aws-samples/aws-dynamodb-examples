

results_summary=results.csv
rm -f $results_summary

# --------------------------------------------------

TEST_NAME=update_counter_item
exp_timestamp=$(date +%s)

export TARGET_TABLE="journal"
export TARGET_TABLE2="counter"

python3 setup/truncate.py $TARGET_TABLE
python3 runtest.py $TEST_NAME $results_summary E$exp_timestamp

export TARGET_TABLE="MRSC"
export TEST_DESC="Target: MRSC"

python3 setup/truncate.py $TARGET_TABLE
python3 runtest.py $TEST_NAME $results_summary E$exp_timestamp

unset TARGET_TABLE
unset TARGET_TABLE2
unset TEST_DESC

# -------------------------------------------------

TEST_NAME=query_last_plus1
exp_timestamp=$(date +%s)

export TARGET_TABLE="journal"

python3 setup/truncate.py $TARGET_TABLE
python3 runtest.py $TEST_NAME $results_summary E$exp_timestamp

export TARGET_TABLE="MRSC"
export TEST_DESC="Target: MRSC"

python3 setup/truncate.py $TARGET_TABLE
python3 runtest.py $TEST_NAME $results_summary E$exp_timestamp

unset TARGET_TABLE
unset TEST_DESC

# -------------------------------------------------
TEST_NAME=gen_uuid
exp_timestamp=$(date +%s)

export TARGET_TABLE="journal"

python3 runtest.py $TEST_NAME $results_summary E$exp_timestamp

export TARGET_TABLE="MRSC"
export TEST_DESC="Target: MRSC"

python3 runtest.py $TEST_NAME $results_summary E$exp_timestamp

unset TARGET_TABLE
unset TEST_DESC
# -------------------------------------------------

TEST_NAME=gen_date
exp_timestamp=$(date +%s)

export TARGET_TABLE="journal"

python3 runtest.py $TEST_NAME $results_summary E$exp_timestamp

export TARGET_TABLE="MRSC"
export TEST_DESC="Target: MRSC"

python3 runtest.py $TEST_NAME $results_summary E$exp_timestamp


# -------------------------------------------------

unset TARGET_TABLE
unset TEST_DESC