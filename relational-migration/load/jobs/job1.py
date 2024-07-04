
def row_maker(tick):

    pk = 'cust-' + str(tick).rjust(4, '0')

    row = {
        'PK': pk,
        'SK': '2024-03-30',
        'city': 'Stonehamm',
        'rating': tick * 10
    }

    return row


def job_info():
    job_params = {
        'db': 'dynamodb',
        'table': 'Customers',
        'row_count': 7
    }
    return job_params
