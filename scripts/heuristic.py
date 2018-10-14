#!/usr/bin/env python3

import sys
import re
import numpy as np
import matplotlib.pyplot as plt

with open(sys.argv[1], 'r') as myfile:
    data = myfile.read().strip()

    tests = [ [ float(cost) for cost in line.split(',') ] for line in data.split('\n') ]

    plt.boxplot(tests)
    plt.show()
