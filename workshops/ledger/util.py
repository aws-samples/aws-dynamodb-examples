import math

def payload_data(kbs):
    one_kb = "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Donec lacus magna, consectetur vitae faucibus cursus, volutpat sit amet neque. Etiam eu dolor tempor, porttitor risus at, tristique justo. Mauris sollicitudin gravidae diam vitae auctor. Donec velit nunc, semper at varius vel, ornare ac leo. Mauris ac porta arcu. Nam ullamcorper ac ligula ut lobortis. Quisque in molestie velit, ac rutrum arcu. Mauris em lacus, malesuada id mattis a, hendrerit et nunc. Ut pretium congue nisl molestie ornare. Etiam eget leo finibus, eleifend velit sit amet, condimentum ipsum. Aliquam qui nisi quis orci maximus laoreet id vel mi. Phasellus suscipit, leo sed ullamcorper cursus, est nisi fermentum magna, vitae placerat dui nibh eu ipsum. Phasellus faucibus a ex et tempus. Nulla consequat ornare dui sagittis dictum. Curabitur scelerisque malesuada turpis ac auctor. Suspendisse sit amet sapien ac eros viverra tempor.  Draco Dormiens Nunquam Titillandus! Nulam convallis velit ornare ante viverra eget in. Etiam eget leo finibus."
    if isinstance(kbs, int):
        return one_kb * kbs
    else:
        parts = math.modf(kbs)
        return (one_kb * int(parts[1])) + one_kb[:int(parts[0] * 1024)]

