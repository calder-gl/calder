#!/usr/bin/env python3

import sys
import re
import numpy as np
import matplotlib.pyplot as plt

with open(sys.argv[1], 'r') as myfile:
    data = myfile.read().strip()

    tests = [ [ float(cost) for cost in line.split(',') ] for line in data.split('\n') ]

    bp = plt.boxplot(tests)

    for plot, line in enumerate(bp['medians']):
        linedata = line.get_ydata()
        for value in linedata:
            print("Median " + str(plot) + ": " + str(value))

    for plot, line in enumerate(bp['whiskers']):
        linedata = line.get_ydata()
        for value in linedata:
            print("Box " + str(int(plot/2)) + " whisker " + str(plot % 2) + ": " + str(value))

    plt.show()
