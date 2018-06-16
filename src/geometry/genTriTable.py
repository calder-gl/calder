#!/usr/bin/env python3
"""
Generate the table of triangle vertices used in the marching cubes algorithm.
The cube's vertices and edges are numbered as follows:

    6 --- 11 ---- 7
   /|            /|
  6 |           7 |
 /  10         /  9
2 ---- 3 ---- 3   |
|   |         |   |
|   4 ---- 8 -|-- 5
2  /          1  /
| 4           | 5
|/            |/
0 ---- 0 ---- 1
"""

import itertools

vertexNeighbours = [
  set([1, 4, 2]),
  set([0, 3, 5]),
  set([0, 6, 3]),
  set([1, 2, 7]),
  set([0, 5, 6]),
  set([1, 7, 4]),
  set([2, 4, 7]),
  set([3, 6, 5]),
]

edges = {
  (0, 1) : 0,
  (0, 2) : 2,
  (0, 4) : 4,
  (1, 3) : 1,
  (1, 5) : 5,
  (2, 3) : 3,
  (2, 6) : 6,
  (3, 7) : 7,
  (4, 5) : 8,
  (4, 6) : 10,
  (5, 7) : 9,
  (6, 7) : 11,
}

parallelEdgeGroups = [[0, 3, 8, 11], [1, 2, 9, 10], [4, 5, 6, 7]]
parallelEdges = {}
for i in range(12):
  for l in parallelEdgeGroups:
    if i in l:
      parallelEdges[i] = set(l) - set([i])

def vertexBelow(vertIdx, tableIdx):
  return ((1 << vertIdx) & tableIdx) != 0

def getEdge(v1, v2):
  return edges[(min(v1, v2), max(v1, v2))]

def getNeighbourEdges(v, ns):
  return set(map(lambda x : getEdge(v, x), ns))

print('const triTable: number[][] = [')
for i in range(256):
  verticesBelow = set()
  for j in range(8):
    if vertexBelow(j, i):
      verticesBelow.add(j)

  if len(verticesBelow) > 4:
    verticesBelow = set(range(8)) - verticesBelow

  surfacePointGraph = {}
  for v in verticesBelow:
    surfacePointGraph[v] = verticesBelow & vertexNeighbours[v]

  # Get vertices from graph (break into cases first)
  triangles = []
  visited = set()
  for v, ns in surfacePointGraph.items():
    if v in visited:
      continue

    # The following cases skip some vertices so that symmetrical cases are only handled once.
    if len(ns) == 0:
      tri = list(getNeighbourEdges(v, vertexNeighbours[v]))
      triangles.append(tri)
      visited.add(v)
    elif len(ns) == 1:
      #print("here")
      v2 = list(ns)[0]
      if len(surfacePointGraph[v2]) == 1:
        #print("e1")
        vEdges = getNeighbourEdges(v, vertexNeighbours[v] - ns)
        v2Edges = getNeighbourEdges(v2, vertexNeighbours[v2] - surfacePointGraph[v2])

        vPv2EdgeHorizontal = list(vEdges)[0]
        vPv2EdgeVertical = list(vEdges)[1]
        v2PvEdgeHorizontal = list(v2Edges & parallelEdges[vPv2EdgeHorizontal])[0]
        v2PvEdgeVertical = list(v2Edges & parallelEdges[vPv2EdgeVertical])[0]

        tri1 = [vPv2EdgeHorizontal, vPv2EdgeVertical, v2PvEdgeHorizontal]
        tri2 = [v2PvEdgeHorizontal, v2PvEdgeVertical, vPv2EdgeVertical]
        triangles.append(tri1)
        triangles.append(tri2)

        visited.add(v)
        visited.add(v2)
        #print("done")
      elif len(surfacePointGraph[v2]) == 2:
        #print("e2")
        v3 = list(surfacePointGraph[v2] - set([v]))[0]

        if len(surfacePointGraph[v3]) == 1:
          #print("e21")
          vEdges = getNeighbourEdges(v, vertexNeighbours[v] - ns)
          v3Edges = getNeighbourEdges(v3, vertexNeighbours[v3] - surfacePointGraph[v3])
          v2Edge = list(getNeighbourEdges(v2, vertexNeighbours[v2] - surfacePointGraph[v2]))[0]

          vPv2Edge = list(vEdges & parallelEdges[v2Edge])[0]
          v3Pv2Edge = list(v3Edges & parallelEdges[v2Edge])[0]
          vOtherEdge = list(vEdges - set([vPv2Edge]))[0]
          v3OtherEdge = list(v3Edges - set([v3Pv2Edge]))[0]

          tri1 = [v2Edge, vPv2Edge, v3Pv2Edge]
          tri2 = [vPv2Edge, v3Pv2Edge, vOtherEdge]
          tri3 = [v3Pv2Edge, vOtherEdge, v3OtherEdge]
          triangles.append(tri1)
          triangles.append(tri2)
          triangles.append(tri3)

          visited.add(v)
          visited.add(v2)
          visited.add(v3)
          #print("done")
        elif len(surfacePointGraph[v3]) == 2:
          #print("e22")
          v4 = list(surfacePointGraph[v3] - set([v2]))[0]

          vEdges = getNeighbourEdges(v, vertexNeighbours[v] - ns)
          v4Edges = getNeighbourEdges(v4, vertexNeighbours[v4] - surfacePointGraph[v4])
          v2Edge = list(getNeighbourEdges(v2, vertexNeighbours[v2] - surfacePointGraph[v2]))[0]
          v3Edge = list(getNeighbourEdges(v3, vertexNeighbours[v3] - surfacePointGraph[v3]))[0]

          vPv2Edge = list(vEdges & parallelEdges[v2Edge])[0]
          v4Pv3Edge = list(v4Edges & parallelEdges[v3Edge])[0]
          vOtherEdge = list(vEdges - set([vPv2Edge]))[0]
          v4OtherEdge = list(v4Edges - set([v4Pv3Edge]))[0]

          tri1 = [vPv2Edge, v2Edge, v4OtherEdge]
          tri2 = [vPv2Edge, v4OtherEdge, v3Edge]
          tri3 = [vOtherEdge, vPv2Edge, v3Edge]
          tri4 = [v4Pv3Edge, v4OtherEdge, v3Edge]
          triangles.append(tri1)
          triangles.append(tri2)
          triangles.append(tri3)
          triangles.append(tri4)

          visited.add(v)
          visited.add(v2)
          visited.add(v3)
          visited.add(v4)
          #print("done")
    elif len(ns) == 2:
      #print("here2")
      #print(surfacePointGraph)
      ns = list(ns)
      if len(surfacePointGraph[ns[0]]) == 2 and len(surfacePointGraph[ns[1]]) == 2:
        v2 = ns[0]
        v3 = ns[1]
        v4 = list(surfacePointGraph[v2] - set([v]))[0]

        vEdge = list(getNeighbourEdges(v, vertexNeighbours[v] - set(ns)))[0]
        v2Edge = list(getNeighbourEdges(v2, vertexNeighbours[v2] - surfacePointGraph[v2]))[0]
        v3Edge = list(getNeighbourEdges(v3, vertexNeighbours[v3] - surfacePointGraph[v3]))[0]
        v4Edge = list(getNeighbourEdges(v4, vertexNeighbours[v4] - surfacePointGraph[v4]))[0]

        tri1 = [vEdge, v2Edge, v3Edge]
        tri2 = [v2Edge, v3Edge, v4Edge]
        triangles.append(tri1)
        triangles.append(tri2)

        visited.add(v)
        visited.add(v2)
        visited.add(v3)
        visited.add(v4)

    elif len(ns) == 3:
      ns = list(ns)
      v2 = ns[0]
      v3 = ns[1]
      v4 = ns[2]

      v2Edges = getNeighbourEdges(v2, vertexNeighbours[v2] - surfacePointGraph[v2])
      v3Edges = getNeighbourEdges(v3, vertexNeighbours[v3] - surfacePointGraph[v3])
      v4Edges = getNeighbourEdges(v4, vertexNeighbours[v4] - surfacePointGraph[v4])

      v2PEdges = set()
      for e in v2Edges:
        v2PEdges |= parallelEdges[e]
      v3PEdges = set()
      for e in v3Edges:
        v3PEdges |= parallelEdges[e]
      v4PEdges = set()
      for e in v4Edges:
        v4PEdges |= parallelEdges[e]

      v2Pv3Edge = list(v2PEdges & v3Edges)[0]
      v2Pv4Edge = list(v2PEdges & v4Edges)[0]
      v3Pv2Edge = list(v3PEdges & v2Edges)[0]
      v3Pv4Edge = list(v3PEdges & v4Edges)[0]
      v4Pv2Edge = list(v4PEdges & v2Edges)[0]
      v4Pv3Edge = list(v4PEdges & v3Edges)[0]

      tri1 = [v2Pv3Edge, v2Pv4Edge, v3Pv4Edge]
      tri2 = [v2Pv3Edge, v3Pv4Edge, v3Pv2Edge]
      tri3 = [v2Pv3Edge, v3Pv2Edge, v4Pv3Edge]
      tri4 = [v4Pv3Edge, v4Pv2Edge, v3Pv2Edge]
      triangles.append(tri1)
      triangles.append(tri2)
      triangles.append(tri3)
      triangles.append(tri4)

      visited.add(v)
      visited.add(v2)
      visited.add(v3)
      visited.add(v4)

  if len(triangles) == 0:
    print('// empty!!!', i)

  print(' [ %s ],' % ', '.join(map(str, list(itertools.chain.from_iterable(triangles)))))

print('];')
