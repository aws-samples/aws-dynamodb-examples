# This script generates the source data files for the workshop
# You also need to pass in the name of a file containing your entity definition module
# For example, run: python3 make_data_files.py ledger

import time
import sys
import math
import importlib


entity_def = None
max_rows = 1000

if len(sys.argv) > 1:
    entity_def = sys.argv[1]
else: 
    print('Error: pass in the name of the entity definition module (with no .py extension)')
    quit()

try:
    load = importlib.import_module(entity_def)

except ModuleNotFoundError as e:
    print('Module ' + entity_def + ' was not found')
    quit()

except Exception as e:
    print("Error loading entity definition " + e )
    quit()


def main():

    row_num = 0
    new_row = 'row'
    target_filename = "../../entities/" + entity_def + ".csv"

    with open(target_filename, "w") as f:

        while row_num < max_rows:
            
            new_row = load.generate_item(row_num)
            if not bool(new_row): 
                break
            
            f.write(new_row + "\n")

            print(new_row)
            row_num += 1
    print()
    print('.. wrote to', target_filename)

def payload_data(kbs):
    one_kb = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec lacus magna, consectetur vitae faucibus cursus, volutpat sit amet neque. Etiam eu dolor tempor, porttitor risus at, tristique justo. Mauris sollicitudin gravidae diam vitae auctor. Donec velit nunc, semper at varius vel, ornare ac leo. Mauris ac porta arcu. Nam ullamcorper ac ligula ut lobortis. Quisque in molestie velit, ac rutrum arcu. Mauris em lacus, malesuada id mattis a, hendrerit et nunc. Ut pretium congue nisl molestie ornare. Etiam eget leo finibus, eleifend velit sit amet, condimentum ipsum. Aliquam qui nisi quis orci maximus laoreet id vel mi. Phasellus suscipit, leo sed ullamcorper cursus, est nisi fermentum magna, vitae placerat dui nibh eu ipsum. Phasellus faucibus a ex et tempus. Nulla consequat ornare dui sagittis dictum. Curabitur scelerisque malesuada turpis ac auctor. Suspendisse sit amet sapien ac eros viverra tempor.  Draco Dormiens Nunquam Titillandus! Nulam convallis velit ornare ante viverra eget in. Etiam eget leo finibus."
    if isinstance(kbs, int):
        return one_kb * kbs
    else:
        parts = math.modf(kbs)
        return (one_kb * int(parts[1])) + one_kb[:int(parts[0] * 1024)]


if __name__ == "__main__":
    main()


